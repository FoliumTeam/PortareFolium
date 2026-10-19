import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { applyJournal, buildReplayPlan } from "@/lib/refuge/replay";
import {
    getRefugeIdentity,
    type RefugeJournalEntry,
    type RefugeRow,
} from "@/lib/refuge/schema";

// 실제 DB 접근 없이 필터·복합 고유 키·이력서 UUID 제약을 적용하는 가짜 DB
const fakeDatabase = (initial: Record<string, RefugeRow[]>) => {
    const tables = structuredClone(initial);
    const writes: { table: string; payload?: RefugeRow; columns?: string }[] =
        [];
    const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
    const client = {
        from(table: string) {
            let mode = "select";
            let payload: RefugeRow = {};
            let columns = "";
            const filters: [string, unknown][] = [];
            const execute = () => {
                const rows = tables[table] ?? [];
                const matches = (row: RefugeRow) =>
                    filters.every(([column, value]) => row[column] === value);
                if (mode === "select")
                    return { data: rows.filter(matches), error: null };
                if (mode === "delete") {
                    writes.push({ table });
                    tables[table] = rows.filter((row) => !matches(row));
                    return { data: [], error: null };
                }
                if (mode === "update") {
                    writes.push({ table, payload: { ...payload } });
                    const changed: RefugeRow[] = [];
                    tables[table] = rows.map((row) => {
                        if (!matches(row)) return row;
                        const next = { ...row, ...payload };
                        changed.push(next);
                        return next;
                    });
                    return { data: changed, error: null };
                }
                const base = table.replace(/_i18n$/, "");
                const expected = [
                    ...(table.endsWith("_i18n") ? ["lang"] : []),
                    ...(table === "about_data_i18n"
                        ? []
                        : [
                                "posts",
                                "portfolio_items",
                                "books",
                                "tags",
                            ].includes(base)
                          ? ["slug"]
                          : base === "post_categories"
                            ? ["name"]
                            : base === "site_config"
                              ? ["key"]
                              : base === "resume_data"
                                ? ["lang"]
                                : base === "post_content_chunks"
                                  ? ["revision_id", "chunk_index"]
                                  : ["id"]),
                ];
                if (
                    expected.length !== columns.split(",").length ||
                    !expected.every((key) => columns.split(",").includes(key))
                ) {
                    return {
                        data: [],
                        error: { message: "no matching unique constraint" },
                    };
                }
                if (
                    table === "resume_data" &&
                    payload.id !== undefined &&
                    !uuid.test(String(payload.id))
                ) {
                    return {
                        data: [],
                        error: {
                            message: "invalid input syntax for type uuid",
                        },
                    };
                }
                writes.push({ table, payload: { ...payload }, columns });
                const index = rows.findIndex((row) =>
                    expected.every((key) => row[key] === payload[key])
                );
                const next = { ...(rows[index] ?? {}), ...payload };
                if (table === "resume_data") next.id ??= randomUUID();
                if (index >= 0) rows[index] = next;
                else rows.push(next);
                tables[table] = rows;
                return { data: [next], error: null };
            };
            const query = {
                select: () => query,
                eq: (column: string, value: unknown) => {
                    filters.push([column, value]);
                    return query;
                },
                delete: () => {
                    mode = "delete";
                    return query;
                },
                update: (row: RefugeRow) => {
                    mode = "update";
                    payload = row;
                    return query;
                },
                upsert: (row: RefugeRow, options: { onConflict: string }) => {
                    mode = "upsert";
                    payload = row;
                    columns = options.onConflict;
                    return query;
                },
                maybeSingle: async () => {
                    const result = execute();
                    if (result.data.length > 1)
                        return {
                            data: null,
                            error: { message: "multiple rows" },
                        };
                    return { ...result, data: result.data[0] ?? null };
                },
                then: (
                    resolve: (value: ReturnType<typeof execute>) => unknown
                ) => Promise.resolve(execute()).then(resolve),
            };
            return query;
        },
    } as unknown as SupabaseClient;
    return { client, tables, writes };
};

// SQLite가 작성한 언어별 identity와 변경 전후 상태 재현
const entry = (
    table: string,
    before: RefugeRow | null,
    after: RefugeRow | null
): RefugeJournalEntry => ({
    id: randomUUID(),
    at: "2026-10-19T00:00:00Z",
    table,
    operation:
        after === null ? "delete" : before === null ? "insert" : "update",
    identity: getRefugeIdentity(table, { ...(after ?? before) }),
    before,
    after,
});

describe("다국어 refuge 복구", () => {
    it("같은 ID와 slug의 번역 수정·삭제를 언어별로 격리", async () => {
        const ko = { id: "same", slug: "same", title: "한국어" };
        const en = { id: "same", lang: "en", slug: "same", title: "English" };
        const ja = { id: "same", lang: "ja", slug: "same", title: "日本語" };
        const nextEn = { ...en, title: "Updated English" };
        const nextJa = { ...ja, title: "更新した日本語" };
        const database = fakeDatabase({ posts: [ko], posts_i18n: [en, ja] });
        const journal = [
            entry("posts_i18n", en, nextEn),
            entry("posts_i18n", ja, nextJa),
            entry("posts_i18n", nextEn, null),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        expect(database.writes).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.posts_i18n).toEqual([nextJa]);
        expect(database.tables.posts).toEqual([ko]);
    });

    it.each([
        ["tags_i18n", { slug: "same", name: "Tag" }],
        ["post_categories_i18n", { name: "Same::category" }],
        ["site_config_i18n", { key: "site_name", value: "Same" }],
        [
            "post_content_chunks_i18n",
            { revision_id: "same", chunk_index: 0, content: "Same" },
        ],
    ])("%s 삭제에서 다른 언어와 다른 조각 보존", async (table, fields) => {
        const en = { ...fields, lang: "en" };
        const ja = { ...fields, lang: "ja" };
        const extra = { ...en, chunk_index: 1 };
        const rows = [
            en,
            ja,
            ...(table === "post_content_chunks_i18n" ? [extra] : []),
        ];
        const database = fakeDatabase({ [table]: rows });
        const journal = [entry(table, en, null)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables[table]).toEqual(rows.slice(1));
    });

    it("분할 본문 upsert에 revision_id·chunk_index·lang 고유 키 적용", async () => {
        const en = {
            revision_id: "same",
            chunk_index: 0,
            lang: "en",
            content: "Old",
        };
        const ja = { ...en, lang: "ja", content: "日本語" };
        const other = { ...en, chunk_index: 1, content: "Other" };
        const database = fakeDatabase({
            post_content_chunks_i18n: [en, ja, other],
        });
        await applyJournal(database.client, [
            entry("post_content_chunks_i18n", en, {
                ...en,
                content: "Updated",
            }),
        ]);
        expect(database.tables.post_content_chunks_i18n).toEqual([
            { ...en, content: "Updated" },
            ja,
            other,
        ]);
    });

    it("분류명과 slug 변경 뒤의 연속 변경도 기존 행에 적용", async () => {
        const category = { lang: "en", name: "Old::category" };
        const renamed = { ...category, name: "New::category" };
        const post = { id: "post", lang: "en", slug: "old", title: "Old" };
        const database = fakeDatabase({
            post_categories_i18n: [category, { ...category, lang: "ja" }],
            posts_i18n: [post],
        });
        const journal = [
            entry("post_categories_i18n", category, renamed),
            entry("post_categories_i18n", renamed, null),
            entry("posts_i18n", post, { ...post, slug: "new" }),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.post_categories_i18n).toEqual([
            { ...category, lang: "ja" },
        ]);
        expect(database.tables.posts_i18n).toEqual([{ ...post, slug: "new" }]);
    });

    it("030 이력서 임시 ID를 제외하고 기존 원격 UUID와 새 UUID 기본값 보존", async () => {
        const id = randomUUID();
        const en = { id: "i18n-en", lang: "en", data: {} };
        const ja = { id: "i18n-ja", lang: "ja", data: { name: "日本語" } };
        const database = fakeDatabase({ resume_data: [{ ...en, id }] });
        const journal = [
            entry("resume_data", en, { ...en, data: { name: "English" } }),
            entry("resume_data", null, ja),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.resume_data[0]).toEqual({
            id,
            lang: "en",
            data: { name: "English" },
        });
        expect(database.tables.resume_data[1]).toMatchObject({
            lang: "ja",
            data: { name: "日本語" },
        });
        expect(database.tables.resume_data[1].id).toMatch(/^[0-9a-f-]{36}$/);
        expect(
            database.writes.every((write) => write.payload?.id === undefined)
        ).toBe(true);
        expect(journal[0].before?.id).toBe("i18n-en");
    });

    it("누락된 언어·조각 키는 전체 적용 전 거부", async () => {
        const database = fakeDatabase({});
        const valid = entry("posts_i18n", null, {
            id: "valid",
            lang: "en",
            slug: "valid",
        });
        for (const invalid of [
            entry("posts_i18n", { id: "shared" }, null),
            entry(
                "post_content_chunks_i18n",
                { lang: "en", revision_id: "shared" },
                null
            ),
        ]) {
            await expect(
                buildReplayPlan(database.client, [valid, invalid])
            ).rejects.toThrow("identity missing or invalid");
            await expect(
                applyJournal(database.client, [valid, invalid], {
                    localWins: true,
                })
            ).rejects.toThrow("identity missing or invalid");
        }
        expect(database.writes).toEqual([]);
    });

    it("원격 변경 거부와 명시적 localWins 적용 범위·로컬 인증 자료 제외 유지", async () => {
        const before = {
            id: "post",
            lang: "en",
            slug: "same",
            title: "Before",
        };
        const remote = { ...before, title: "Remote" };
        const ja = { ...before, lang: "ja", title: "日本語" };
        const local = { ...before, title: "Local" };
        const database = fakeDatabase({ posts_i18n: [remote, ja] });
        const journal = [
            entry("posts_i18n", before, local),
            entry("admin_login_attempts", null, { key_hash: "local" }),
        ];
        const plan = await buildReplayPlan(database.client, journal);
        expect(plan.conflicts).toHaveLength(1);
        expect(plan.skippedLocalOnly).toHaveLength(1);
        await expect(applyJournal(database.client, journal)).rejects.toThrow(
            "drift before apply"
        );
        expect(database.writes).toEqual([]);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.posts_i18n).toEqual([local, ja]);
        expect(database.tables).not.toHaveProperty("admin_login_attempts");
        expect(
            (
                await buildReplayPlan(database.client, [
                    entry("ai_agent_tokens", null, { id: "excluded" }),
                ])
            ).conflicts[0].reason
        ).toBe("unsupported table");
    });

    it("같은 언어·slug의 새 원격 ID도 충돌로 감지하고 localWins에서만 대체", async () => {
        const remote = {
            id: "remote-id",
            lang: "en",
            slug: "same",
            title: "Remote",
        };
        const local = { ...remote, id: "local-id", title: "Local" };
        const ja = { ...remote, lang: "ja", title: "日本語" };
        const database = fakeDatabase({ posts_i18n: [remote, ja] });
        const journal = [entry("posts_i18n", null, local)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts[0]
                .reason
        ).toBe("Supabase row exists for local insert");
        const plan = await buildReplayPlan(database.client, journal, {
            localWins: true,
        });
        expect(plan.conflicts).toEqual([]);
        expect(plan.overrides).toHaveLength(1);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.posts_i18n).toEqual([local, ja]);
    });

    it("언어별 소개 한 개 제약에서 원격 ID가 달라도 충돌 감지", async () => {
        const remote = {
            id: "remote-id",
            lang: "en",
            data: { name: "Remote" },
        };
        const local = { ...remote, id: "local-id", data: { name: "Local" } };
        const ja = { ...remote, lang: "ja" };
        const database = fakeDatabase({ about_data_i18n: [remote, ja] });
        const journal = [entry("about_data_i18n", null, local)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toHaveLength(1);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.about_data_i18n).toEqual([local, ja]);
    });
});
