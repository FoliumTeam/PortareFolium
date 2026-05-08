import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
    REFUGE_DB_PATH,
    REFUGE_DIR,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
} from "../src/lib/refuge/paths";
import { sha256, stableJson } from "../src/lib/refuge/mode";
import type {
    RefugeJournalEntry,
    RefugeManifest,
} from "../src/lib/refuge/schema";
import { sanitizeRefugeRowForReplay } from "../src/lib/refuge/schema";

type Row = Record<string, unknown>;

const CONTENT_TABLES = new Set(["posts", "portfolio_items", "books"]);
const GENESIS_HASH = "0".repeat(64);

function hasArg(name: string): boolean {
    return process.argv.includes(name);
}

function getArgValue(name: string): string | null {
    const index = process.argv.indexOf(name);
    return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function timestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeJournalValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalizeJournalValue);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(([, item]) => typeof item !== "undefined")
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, normalizeJournalValue(item)])
    );
}

function stableJournalJson(value: unknown): string {
    return JSON.stringify(normalizeJournalValue(value));
}

function hashJournalEntry(entry: RefugeJournalEntry): string {
    return createHash("sha256")
        .update(stableJournalJson(entry), "utf8")
        .digest("hex");
}

function removeContentMode(value: unknown): {
    value: unknown;
    changed: boolean;
    removed: number;
} {
    if (Array.isArray(value)) {
        let removed = 0;
        const next = value.map((item) => {
            const result = removeContentMode(item);
            removed += result.removed;
            return result.value;
        });
        const changed = removed > 0;
        return { value: changed ? next : value, changed, removed };
    }
    if (!value || typeof value !== "object") {
        return { value, changed: false, removed: 0 };
    }
    let removed = 0;
    const next: Row = {};
    for (const [key, item] of Object.entries(value as Row)) {
        if (key === "content_mode") {
            removed += 1;
            continue;
        }
        const result = removeContentMode(item);
        removed += result.removed;
        next[key] = result.value;
    }
    const changed = removed > 0;
    return { value: changed ? next : value, changed, removed };
}

function sanitizeSchemaFields(
    table: string,
    row: Row | null | undefined
): {
    row: Row | null | undefined;
    removed: number;
} {
    if (!row) return { row, removed: 0 };
    const sanitized = sanitizeRefugeRowForReplay(table, row) as
        | Row
        | null
        | undefined;
    if (!sanitized) return { row: sanitized, removed: 0 };
    return {
        row: sanitized,
        removed: Object.keys(row).length - Object.keys(sanitized).length,
    };
}

function withoutUpdatedAt(row: Row | null | undefined): Row | null | undefined {
    if (!row) return row;
    const next = { ...row };
    delete next.updated_at;
    return next;
}

function shouldDropNoopEntry(entry: RefugeJournalEntry): boolean {
    if (!CONTENT_TABLES.has(entry.table)) return false;
    if (!["update", "upsert"].includes(entry.operation)) return false;
    if (!entry.before || !entry.after) return false;
    return (
        stableJson(withoutUpdatedAt(entry.before)) ===
        stableJson(withoutUpdatedAt(entry.after))
    );
}

function readJournalUnchecked(): RefugeJournalEntry[] {
    if (!fs.existsSync(REFUGE_JOURNAL_PATH)) return [];
    return fs
        .readFileSync(REFUGE_JOURNAL_PATH, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RefugeJournalEntry);
}

function rehashJournal(entries: RefugeJournalEntry[]): RefugeJournalEntry[] {
    let prevHash = GENESIS_HASH;
    return entries.map((entry) => {
        const { hash: _hash, prevHash: _prevHash, ...payload } = entry;
        const next = { ...payload, prevHash } as RefugeJournalEntry;
        next.hash = hashJournalEntry(next);
        prevHash = next.hash;
        return next;
    });
}

function cleanseJournal(entries: RefugeJournalEntry[]) {
    let cleanedFields = 0;
    let schemaFieldsRemoved = 0;
    let droppedNoops = 0;
    const nextEntries: RefugeJournalEntry[] = [];

    for (const originalEntry of entries) {
        const entry = clone(originalEntry);
        const before = removeContentMode(entry.before);
        const after = removeContentMode(entry.after);
        const beforeSchema = sanitizeSchemaFields(
            entry.table,
            before.value as Row | null | undefined
        );
        const afterSchema = sanitizeSchemaFields(
            entry.table,
            after.value as Row | null | undefined
        );
        entry.before = beforeSchema.row as RefugeJournalEntry["before"];
        entry.after = afterSchema.row as RefugeJournalEntry["after"];
        cleanedFields += before.removed + after.removed;
        schemaFieldsRemoved += beforeSchema.removed + afterSchema.removed;
        if (shouldDropNoopEntry(entry)) {
            droppedNoops += 1;
            continue;
        }
        nextEntries.push(entry);
    }

    return {
        entries: rehashJournal(nextEntries),
        cleanedFields,
        schemaFieldsRemoved,
        droppedNoops,
    };
}

function cleanseDatabase(apply: boolean): {
    dbRowsScanned: number;
    dbRowsCleaned: number;
    dbSchemaFieldsRemoved: number;
} {
    if (!fs.existsSync(REFUGE_DB_PATH)) {
        return {
            dbRowsScanned: 0,
            dbRowsCleaned: 0,
            dbSchemaFieldsRemoved: 0,
        };
    }
    const db = new DatabaseSync(REFUGE_DB_PATH);
    try {
        const rows = db
            .prepare("SELECT table_name, identity, row_json FROM refuge_rows")
            .all() as {
            table_name: string;
            identity: string;
            row_json: string;
        }[];
        let cleaned = 0;
        let schemaFieldsRemoved = 0;
        if (apply) db.exec("BEGIN IMMEDIATE");
        try {
            const update = db.prepare(
                "UPDATE refuge_rows SET row_json = ?, updated_at = CURRENT_TIMESTAMP WHERE table_name = ? AND identity = ?"
            );
            for (const row of rows) {
                const parsed = JSON.parse(row.row_json) as Row;
                const contentResult = removeContentMode(parsed);
                const schemaResult = sanitizeSchemaFields(
                    row.table_name,
                    contentResult.value as Row
                );
                const changed =
                    contentResult.changed || schemaResult.removed > 0;
                if (!changed) continue;
                cleaned += 1;
                schemaFieldsRemoved += schemaResult.removed;
                if (apply) {
                    update.run(
                        JSON.stringify(schemaResult.row),
                        row.table_name,
                        row.identity
                    );
                }
            }
            if (apply) db.exec("COMMIT");
        } catch (error) {
            if (apply) db.exec("ROLLBACK");
            throw error;
        }
        return {
            dbRowsScanned: rows.length,
            dbRowsCleaned: cleaned,
            dbSchemaFieldsRemoved: schemaFieldsRemoved,
        };
    } finally {
        db.close();
    }
}

function readRefugeRowsForManifest(table: string): Row[] {
    if (!fs.existsSync(REFUGE_DB_PATH)) return [];
    const db = new DatabaseSync(REFUGE_DB_PATH);
    try {
        const rows = db
            .prepare(
                "SELECT row_json FROM refuge_rows WHERE table_name = ? ORDER BY identity"
            )
            .all(table) as { row_json: string }[];
        return rows.map((row) => JSON.parse(row.row_json) as Row);
    } finally {
        db.close();
    }
}

function updateManifest(apply: boolean): string[] {
    if (!fs.existsSync(REFUGE_MANIFEST_PATH)) return [];
    const manifest = JSON.parse(
        fs.readFileSync(REFUGE_MANIFEST_PATH, "utf8")
    ) as RefugeManifest;
    const updatedTables: string[] = [];
    for (const table of Object.keys(manifest.tables)) {
        if (!manifest.tables[table]) continue;
        const rows = readRefugeRowsForManifest(table);
        manifest.tables[table] = {
            rowCount: rows.length,
            checksum: sha256(stableJson(rows)),
        };
        updatedTables.push(table);
    }
    if (apply) {
        fs.writeFileSync(
            REFUGE_MANIFEST_PATH,
            JSON.stringify(manifest, null, 2),
            "utf8"
        );
    }
    return updatedTables;
}

function backupLocalFiles(): string {
    const backupDir =
        getArgValue("--backup-dir") ??
        path.join(REFUGE_DIR, "..", "refuge-backups", `keditor-${timestamp()}`);
    fs.mkdirSync(backupDir, { recursive: true });
    for (const filePath of [
        REFUGE_DB_PATH,
        REFUGE_JOURNAL_PATH,
        REFUGE_MANIFEST_PATH,
        REFUGE_MODE_PATH,
    ]) {
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(
                filePath,
                path.join(backupDir, path.basename(filePath))
            );
        }
    }
    return backupDir;
}

async function main(): Promise<void> {
    const apply = hasArg("--apply");
    const backupDir = apply ? backupLocalFiles() : null;
    const journal = readJournalUnchecked();
    const journalResult = cleanseJournal(journal);
    const databaseResult = cleanseDatabase(apply);
    const manifestTables = updateManifest(apply);

    if (apply) {
        fs.writeFileSync(
            REFUGE_JOURNAL_PATH,
            `${journalResult.entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
            "utf8"
        );
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                apply,
                backupDir,
                journalEntriesBefore: journal.length,
                journalEntriesAfter: journalResult.entries.length,
                journalContentModeFieldsRemoved: journalResult.cleanedFields,
                journalSchemaFieldsRemoved: journalResult.schemaFieldsRemoved,
                journalNoopEntriesDropped: journalResult.droppedNoops,
                dbRowsScanned: databaseResult.dbRowsScanned,
                dbRowsCleaned: databaseResult.dbRowsCleaned,
                dbSchemaFieldsRemoved: databaseResult.dbSchemaFieldsRemoved,
                manifestTables,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(
        `[cleanse-keditor-residue::main] ${(error as Error).message}`
    );
    process.exit(1);
});
