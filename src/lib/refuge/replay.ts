import type { SupabaseClient } from "@supabase/supabase-js";
import { stableJson } from "@/lib/refuge/mode";
import {
    REFUGE_REPLAY_TABLES,
    REFUGE_SUPPORTED_TABLES,
    sanitizeRefugeRowForReplay,
    type RefugeJournalEntry,
    type RefugeRow,
} from "@/lib/refuge/schema";

const replayTables = new Set<string>(REFUGE_REPLAY_TABLES);
type ReplayTarget = {
    table: string;
    identity: string;
    columns: string[];
    values: (string | number)[];
};

// PostgreSQL 고유 키와 이력서의 언어별 고유 키 사용
const getReplayColumns = (table: string): string[] => {
    const localized = table.endsWith("_i18n");
    const base = table.replace(/_i18n$/, "");
    const baseColumns =
        localized && base === "about_data"
            ? []
            : base === "site_config"
              ? ["key"]
              : base === "resume_data"
                ? ["lang"]
                : ["posts", "portfolio_items", "books", "tags"].includes(base)
                  ? ["slug"]
                  : base === "post_categories"
                    ? ["name"]
                    : base === "post_content_chunks"
                      ? ["revision_id", "chunk_index"]
                      : ["id"];
    return [...(localized ? ["lang"] : []), ...baseColumns];
};

// 언어와 모든 고유 키를 보유한 대상만 사용
const getReplayTarget = (
    table: string,
    row: RefugeRow | null | undefined
): ReplayTarget => {
    const localized = table.endsWith("_i18n");
    const base = table.replace(/_i18n$/, "");
    const columns = getReplayColumns(table);
    const values = columns.map((column) => row?.[column]);
    if (
        values.some(
            (value) =>
                (typeof value !== "string" && typeof value !== "number") ||
                value === ""
        ) ||
        ((localized || base === "resume_data") &&
            !(localized ? ["en", "ja"] : ["ko", "en", "ja"]).includes(
                String(row?.lang)
            ))
    )
        throw new Error(`${table} replay identity missing or invalid`);
    return {
        table,
        columns,
        values: values as (string | number)[],
        identity: values.map(String).join("::"),
    };
};

// SQLite 030의 임시 이력서 ID 제외로 PostgreSQL UUID 기본값과 기존 ID 보존
const normalizeRow = (table: string, row: RefugeRow | null | undefined) => {
    const normalized = sanitizeRefugeRowForReplay(table, row);
    if (
        table === "resume_data" &&
        normalized &&
        ["en", "ja"].includes(String(normalized.lang)) &&
        normalized.id === `i18n-${normalized.lang}`
    ) {
        const { id: _id, ...fields } = normalized;
        return fields;
    }
    return normalized;
};

// 복구용 자료만 정리하고 원본 journal 보존
const normalizeEntry = (entry: RefugeJournalEntry): RefugeJournalEntry => ({
    ...entry,
    before: normalizeRow(entry.table, entry.before),
    after: normalizeRow(entry.table, entry.after),
});

// 서버 관리 updated_at과 임시 이력서 ID를 제외한 실제 자료 비교
const rowsMatch = (
    table: string,
    current: RefugeRow | null,
    expected: RefugeRow | null
): boolean => {
    if (!current || !expected) return current === expected;
    const { updated_at: _currentUpdatedAt, ...currentFields } = current;
    const { updated_at: _expectedUpdatedAt, ...expectedFields } = expected;
    if (table === "resume_data" && !("id" in expectedFields)) {
        const { id: _id, ...fields } = currentFields;
        return stableJson(fields) === stableJson(expectedFields);
    }
    return stableJson(currentFields) === stableJson(expectedFields);
};

// 값 안의 구분자와 언어를 구별하는 조회 캐시 키
const cacheKey = (target: ReplayTarget) =>
    JSON.stringify([target.table, target.values]);

// 언어와 조각 번호를 모두 묶은 단일 행 조회
const fetchCurrentRow = async (
    client: SupabaseClient,
    target: ReplayTarget
): Promise<RefugeRow | null> => {
    let query = client.from(target.table).select("*");
    target.columns.forEach((column, index) => {
        query = query.eq(column, target.values[index]);
    });
    const { data, error } = await query.maybeSingle();
    if (error)
        throw new Error(`${target.table}:${target.identity} ${error.message}`);
    return (data as RefugeRow | null) ?? null;
};

// 고유 키 순서로 500행씩 조회한 복구 전 전체 백업
export async function readReplaySnapshot(
    client: SupabaseClient
): Promise<Record<string, RefugeRow[]>> {
    const tables: Record<string, RefugeRow[]> = {};
    for (const table of REFUGE_REPLAY_TABLES) {
        const rows: RefugeRow[] = [];
        for (let offset = 0; ; offset += 500) {
            let query = client.from(table).select("*");
            for (const column of getReplayColumns(table))
                query = query.order(column, { ascending: true });
            const { data, error } = await query.range(offset, offset + 499);
            if (error || !data)
                throw new Error(
                    `${table} snapshot failed: ${error?.message ?? "missing rows"}`
                );
            rows.push(...(data as RefugeRow[]));
            if (rows.length > 100000)
                throw new Error(`${table} snapshot exceeds 100000 rows`);
            if (data.length < 500) break;
        }
        tables[table] = rows;
    }
    return tables;
}

// 원격 자료와 journal의 변경 전 상태를 비교한 복구 계획
export async function buildReplayPlan(
    client: SupabaseClient | null,
    journal: RefugeJournalEntry[],
    options: { localWins?: boolean } = {}
) {
    const conflicts: { table: string; identity: string; reason: string }[] = [];
    const overrides: { table: string; identity: string; reason: string }[] = [];
    const simulatedRows = new Map<string, RefugeRow | null>();
    const operations: {
        table: string;
        identity: string;
        operation: RefugeJournalEntry["operation"];
    }[] = [];
    const skippedLocalOnly: typeof operations = [];

    for (const originalEntry of journal) {
        const entry = normalizeEntry(originalEntry);
        if (!REFUGE_SUPPORTED_TABLES.includes(entry.table as never)) {
            conflicts.push({
                table: entry.table,
                identity: entry.identity,
                reason: "unsupported table",
            });
            continue;
        }
        if (!replayTables.has(entry.table)) {
            skippedLocalOnly.push({
                table: entry.table,
                identity: entry.identity,
                operation: entry.operation,
            });
            continue;
        }
        const target = getReplayTarget(
            entry.table,
            entry.before ?? entry.after
        );
        const nextTarget = getReplayTarget(
            entry.table,
            entry.after ?? entry.before
        );
        const identity = target.identity;
        operations.push({
            table: entry.table,
            identity,
            operation: entry.operation,
        });
        if (!client) continue;
        const key = cacheKey(target);
        const current = simulatedRows.has(key)
            ? (simulatedRows.get(key) ?? null)
            : await fetchCurrentRow(client, target);
        const nextKey = cacheKey(nextTarget);
        if (entry.after && nextKey !== key) {
            const destination = simulatedRows.has(nextKey)
                ? (simulatedRows.get(nextKey) ?? null)
                : await fetchCurrentRow(client, nextTarget);
            if (destination) {
                conflicts.push({
                    table: entry.table,
                    identity: nextTarget.identity,
                    reason: "Supabase destination row exists for local identity change",
                });
                continue;
            }
        }
        const reason = !entry.before
            ? current !== null
                ? "Supabase row exists for local insert"
                : null
            : !rowsMatch(entry.table, current, entry.before)
              ? entry.operation === "delete" && current === null
                  ? "Supabase row already absent for local delete"
                  : "Supabase row drifted after refuge activation"
              : null;
        if (reason) {
            const issue = { table: entry.table, identity, reason };
            if (
                options.localWins ||
                (entry.operation === "delete" && current === null)
            )
                overrides.push(issue);
            else {
                conflicts.push(issue);
                continue;
            }
        }
        if (nextKey !== key) simulatedRows.set(key, null);
        simulatedRows.set(
            nextKey,
            entry.operation === "delete" ? null : (entry.after ?? null)
        );
    }
    return {
        operationCount: operations.length,
        touchedTables: [...new Set(operations.map((entry) => entry.table))],
        operations,
        skippedLocalOnly,
        conflicts,
        overrides,
    };
}

// 사전 검사 뒤 언어별 고유 키에 한정한 journal 적용
export async function applyJournal(
    client: SupabaseClient,
    journal: RefugeJournalEntry[],
    options: { localWins?: boolean } = {}
): Promise<void> {
    const entries = journal
        .map(normalizeEntry)
        .filter((entry) => replayTables.has(entry.table))
        .map((entry) => ({
            entry,
            target: getReplayTarget(entry.table, entry.before ?? entry.after),
            nextTarget: getReplayTarget(
                entry.table,
                entry.after ?? entry.before
            ),
        }));
    if (
        entries.some(
            ({ target, nextTarget }) =>
                cacheKey(target) !== cacheKey(nextTarget)
        )
    ) {
        const plan = await buildReplayPlan(client, journal, options);
        const conflict = plan.conflicts[0];
        if (conflict)
            throw new Error(
                `${conflict.table}:${conflict.identity} ${conflict.reason} before apply`
            );
    }
    for (const { entry, target, nextTarget } of entries) {
        if (!options.localWins) {
            const current = await fetchCurrentRow(client, target);
            if (entry.operation === "delete" && current === null) continue;
            if (
                !entry.before
                    ? current !== null
                    : !rowsMatch(entry.table, current, entry.before)
            ) {
                throw new Error(
                    `${entry.table}:${target.identity} drift before apply`
                );
            }
        }
        if (entry.operation === "delete") {
            let query = client.from(entry.table).delete();
            target.columns.forEach((column, index) => {
                query = query.eq(column, target.values[index]);
            });
            const { error } = await query;
            if (error)
                throw new Error(
                    `${entry.table}:${target.identity} ${error.message}`
                );
            continue;
        }
        if (!entry.after) continue;
        if (cacheKey(target) !== cacheKey(nextTarget)) {
            if (await fetchCurrentRow(client, nextTarget))
                throw new Error(
                    `${entry.table}:${nextTarget.identity} destination row exists before apply`
                );
            let query = client.from(entry.table).update(entry.after);
            target.columns.forEach((column, index) => {
                query = query.eq(column, target.values[index]);
            });
            const { data, error } = await query.select("*").maybeSingle();
            if (error)
                throw new Error(
                    `${entry.table}:${target.identity} ${error.message}`
                );
            if (data) continue;
            const { error: insertError } = await client
                .from(entry.table)
                .insert(entry.after);
            if (insertError)
                throw new Error(
                    `${entry.table}:${nextTarget.identity} ${insertError.message}`
                );
            continue;
        }
        const { error } = await client.from(entry.table).upsert(entry.after, {
            onConflict: nextTarget.columns.join(","),
        });
        if (error)
            throw new Error(
                `${entry.table}:${target.identity} ${error.message}`
            );
    }
}
