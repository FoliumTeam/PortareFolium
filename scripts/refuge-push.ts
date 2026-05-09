import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    REFUGE_DIR,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
} from "../src/lib/refuge/paths";
import { stableJson } from "../src/lib/refuge/mode";
import {
    getRefugeJournalHeadHash,
    readRefugeJournal,
} from "../src/lib/refuge/store";
import {
    REFUGE_REPLAY_TABLES,
    REFUGE_SUPPORTED_TABLES,
    sanitizeRefugeRowForReplay,
    type RefugeJournalEntry,
    type RefugeManifest,
    type RefugeRow,
} from "../src/lib/refuge/schema";

const REPLAY_TABLES = new Set<string>(REFUGE_REPLAY_TABLES);
const DELETE_REPLAY_TABLES = new Set<string>(REFUGE_REPLAY_TABLES);

function hasArg(name: string): boolean {
    return process.argv.includes(name);
}

function getIdentityColumn(table: string): string {
    if (table === "site_config") return "key";
    if (table === "resume_data") return "lang";
    if (["posts", "portfolio_items", "books", "tags"].includes(table)) {
        return "slug";
    }
    return "id";
}

function getIdentityValue(
    table: string,
    row: RefugeRow | null | undefined
): string | null {
    if (!row) return null;
    const value = row[getIdentityColumn(table)];
    return value == null ? null : String(value);
}

function rowsMatch(a: RefugeRow | null, b: RefugeRow | null): boolean {
    if (!a || !b) return a === b;
    return stableJson(a) === stableJson(b);
}

function normalizeEntryForReplay(
    entry: RefugeJournalEntry
): RefugeJournalEntry {
    return {
        ...entry,
        before: sanitizeRefugeRowForReplay(entry.table, entry.before),
        after: sanitizeRefugeRowForReplay(entry.table, entry.after),
    };
}

function getClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    return createClient(url, key);
}

async function snapshotSupabase(client: SupabaseClient): Promise<string> {
    const tables: Record<string, RefugeRow[]> = {};
    for (const table of REFUGE_REPLAY_TABLES) {
        const { data, error } = await client.from(table).select("*");
        if (error) throw new Error(`${table}: ${error.message}`);
        tables[table] = (data ?? []) as RefugeRow[];
    }
    const filePath = path.join(
        REFUGE_DIR,
        `pre-push-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            { createdAt: new Date().toISOString(), tables },
            null,
            2
        ),
        "utf8"
    );
    return filePath;
}

async function fetchCurrentRow(
    client: SupabaseClient,
    table: string,
    identity: string
): Promise<RefugeRow | null> {
    const { data, error } = await client
        .from(table)
        .select("*")
        .eq(getIdentityColumn(table), identity)
        .maybeSingle();
    if (error) throw new Error(`${table}:${identity} ${error.message}`);
    return (data as RefugeRow | null) ?? null;
}

async function buildReplayPlan(
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
    const skippedLocalOnly: {
        table: string;
        identity: string;
        operation: RefugeJournalEntry["operation"];
    }[] = [];

    for (const originalEntry of journal) {
        const entry = normalizeEntryForReplay(originalEntry);
        if (!REFUGE_SUPPORTED_TABLES.includes(entry.table as never)) {
            conflicts.push({
                table: entry.table,
                identity: entry.identity,
                reason: "unsupported table",
            });
            continue;
        }
        if (!REPLAY_TABLES.has(entry.table)) {
            skippedLocalOnly.push({
                table: entry.table,
                identity: entry.identity,
                operation: entry.operation,
            });
            continue;
        }
        if (
            entry.operation === "delete" &&
            !DELETE_REPLAY_TABLES.has(entry.table)
        ) {
            conflicts.push({
                table: entry.table,
                identity: entry.identity,
                reason: "delete replay not allowed for table",
            });
            continue;
        }
        const identity =
            getIdentityValue(entry.table, entry.after) ??
            getIdentityValue(entry.table, entry.before) ??
            entry.identity;
        operations.push({
            table: entry.table,
            identity,
            operation: entry.operation,
        });

        if (!client) continue;
        const cacheKey = `${entry.table}:${identity}`;
        let current: RefugeRow | null;
        if (simulatedRows.has(cacheKey)) {
            current = simulatedRows.get(cacheKey) ?? null;
        } else {
            current = await fetchCurrentRow(client, entry.table, identity);
            simulatedRows.set(cacheKey, current);
        }
        if (entry.before === null || typeof entry.before === "undefined") {
            if (current !== null) {
                if (options.localWins) {
                    overrides.push({
                        table: entry.table,
                        identity,
                        reason: "Supabase row exists for local insert",
                    });
                    simulatedRows.set(
                        cacheKey,
                        entry.operation === "delete"
                            ? null
                            : (entry.after ?? null)
                    );
                    continue;
                }
                conflicts.push({
                    table: entry.table,
                    identity,
                    reason: "Supabase row exists for local insert",
                });
                continue;
            }
        } else if (!rowsMatch(current, entry.before)) {
            if (
                options.localWins ||
                (entry.operation === "delete" && current === null)
            ) {
                overrides.push({
                    table: entry.table,
                    identity,
                    reason:
                        entry.operation === "delete" && current === null
                            ? "Supabase row already absent for local delete"
                            : "Supabase row drifted after refuge activation",
                });
                simulatedRows.set(
                    cacheKey,
                    entry.operation === "delete" ? null : (entry.after ?? null)
                );
                continue;
            }
            conflicts.push({
                table: entry.table,
                identity,
                reason: "Supabase row drifted after refuge activation",
            });
            continue;
        }
        simulatedRows.set(
            cacheKey,
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

async function assertNoDriftForEntry(
    client: SupabaseClient,
    entry: RefugeJournalEntry,
    identity: string,
    options: { localWins?: boolean } = {}
): Promise<void> {
    if (options.localWins) return;
    const current = await fetchCurrentRow(client, entry.table, identity);
    if (entry.before === null || typeof entry.before === "undefined") {
        if (current !== null) {
            throw new Error(`${entry.table}:${identity} conflict before apply`);
        }
        return;
    }
    if (!rowsMatch(current, entry.before)) {
        throw new Error(`${entry.table}:${identity} drift before apply`);
    }
}

async function applyJournal(
    client: SupabaseClient,
    journal: RefugeJournalEntry[],
    options: { localWins?: boolean } = {}
): Promise<void> {
    for (const originalEntry of journal) {
        const entry = normalizeEntryForReplay(originalEntry);
        if (!REPLAY_TABLES.has(entry.table)) continue;
        const identity =
            getIdentityValue(entry.table, entry.after) ??
            getIdentityValue(entry.table, entry.before) ??
            entry.identity;
        await assertNoDriftForEntry(client, entry, identity, options);
        if (entry.operation === "delete") {
            if (!DELETE_REPLAY_TABLES.has(entry.table)) {
                throw new Error(
                    `${entry.table}:${identity} delete replay denied`
                );
            }
            const { error } = await client
                .from(entry.table)
                .delete()
                .eq(getIdentityColumn(entry.table), identity);
            if (error)
                throw new Error(`${entry.table}:${identity} ${error.message}`);
            continue;
        }
        if (!entry.after) continue;
        const { error } = await client.from(entry.table).upsert(entry.after, {
            onConflict: getIdentityColumn(entry.table),
        });
        if (error)
            throw new Error(`${entry.table}:${identity} ${error.message}`);
    }
}

async function main(): Promise<void> {
    if (!fs.existsSync(REFUGE_MODE_PATH)) throw new Error("mode.json missing");
    if (!fs.existsSync(REFUGE_MANIFEST_PATH))
        throw new Error("manifest.json missing");
    const mode = JSON.parse(fs.readFileSync(REFUGE_MODE_PATH, "utf8")) as {
        mode?: string;
    };
    if (mode.mode !== "sqlite-refuge")
        throw new Error("sqlite-refuge mode is not active");
    const manifest = JSON.parse(
        fs.readFileSync(REFUGE_MANIFEST_PATH, "utf8")
    ) as RefugeManifest;
    const journal = fs.existsSync(REFUGE_JOURNAL_PATH)
        ? readRefugeJournal()
        : [];
    const apply = hasArg("--apply");
    const checkRemote = hasArg("--check-remote");
    const localWins = hasArg("--local-wins");
    const client = apply || checkRemote ? getClient() : null;
    const snapshotPath =
        apply && client ? await snapshotSupabase(client) : null;
    const replay = await buildReplayPlan(client, journal, { localWins });
    const plan = {
        ok: replay.conflicts.length === 0,
        apply,
        checkRemote,
        localWins,
        manifestCreatedAt: manifest.createdAt,
        journalEntries: journal.length,
        journalHeadHash: getRefugeJournalHeadHash(journal),
        touchedTables: replay.touchedTables,
        operationCount: replay.operationCount,
        conflicts: replay.conflicts,
        overrides: replay.overrides,
        skippedLocalOnly: replay.skippedLocalOnly,
        policy: {
            order: apply
                ? "snapshot -> conflict-detect -> apply"
                : checkRemote
                  ? "remote conflict-detect replay-plan only"
                  : "local replay-plan only",
            defaultConflict: localWins
                ? "local SQLite row wins for refuge replay tables"
                : "reject",
            deletes: "journal-only for refuge supported tables",
            localOnlyTables:
                "admin_login_attempts stays local and is not replayed",
            storage: "excluded",
        },
    };
    const planPath = path.join(REFUGE_DIR, "replay-plan.json");
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
    if (!apply) {
        console.log(
            JSON.stringify({ ...plan, planPath, applied: false }, null, 2)
        );
        return;
    }
    if (!client || !snapshotPath) throw new Error("Supabase client missing");
    if (replay.conflicts.length > 0) {
        throw new Error(`conflict detected: ${planPath}`);
    }
    await applyJournal(client, journal, { localWins });
    console.log(
        JSON.stringify(
            { ...plan, planPath, snapshotPath, applied: true },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(`[refuge-push::main] ${(error as Error).message}`);
    process.exit(1);
});
