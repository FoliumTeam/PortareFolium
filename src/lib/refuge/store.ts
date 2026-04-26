import fs from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REFUGE_DB_PATH, REFUGE_JOURNAL_PATH } from "@/lib/refuge/paths";
import {
    getRefugeIdentity,
    type RefugeJournalEntry,
    type RefugeRow,
} from "@/lib/refuge/schema";

let db: DatabaseSync | null = null;

// journal hash chain? ???? ??? ? entry? prevHash? ????.
export const REFUGE_JOURNAL_GENESIS_HASH = "0".repeat(64);

function ensureParent(filePath: string): void {
    fs.mkdirSync(dirname(filePath), { recursive: true });
}

function stableJournalJson(value: unknown): string {
    return JSON.stringify(normalizeJournalValue(value));
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

function hashJournalEntry(entry: RefugeJournalEntry): string {
    return createHash("sha256")
        .update(stableJournalJson(entry), "utf8")
        .digest("hex");
}

function withoutEntryHash(entry: RefugeJournalEntry): RefugeJournalEntry {
    const { hash: _hash, ...entryForHash } = entry;
    return entryForHash;
}

function parseJournalLine(line: string, index: number): RefugeJournalEntry {
    try {
        return JSON.parse(line) as RefugeJournalEntry;
    } catch {
        throw new Error(`refuge journal invalid JSON at entry ${index + 1}`);
    }
}

// journal entry? prevHash/hash chain? ???? local replay ??? ????.
export function verifyRefugeJournal(entries: RefugeJournalEntry[]): void {
    let expectedPrevHash = REFUGE_JOURNAL_GENESIS_HASH;
    entries.forEach((entry, index) => {
        const label = entry.id ? `${index + 1}:${entry.id}` : `${index + 1}`;
        if (!entry.prevHash || !entry.hash) {
            throw new Error(`refuge journal hash missing at entry ${label}`);
        }
        if (entry.prevHash !== expectedPrevHash) {
            throw new Error(
                `refuge journal prevHash mismatch at entry ${label}`
            );
        }
        const actualHash = hashJournalEntry(withoutEntryHash(entry));
        if (actualHash !== entry.hash) {
            throw new Error(`refuge journal hash mismatch at entry ${label}`);
        }
        expectedPrevHash = entry.hash;
    });
}

// replay plan? ?? append?? ??? ?? journal hash? ????.
export function getRefugeJournalHeadHash(
    entries: RefugeJournalEntry[] = readRefugeJournal()
): string {
    return entries.at(-1)?.hash ?? REFUGE_JOURNAL_GENESIS_HASH;
}

export function getRefugeDatabase(): DatabaseSync {
    ensureParent(REFUGE_DB_PATH);
    db ??= new DatabaseSync(REFUGE_DB_PATH);
    initializeRefugeDatabase(db);
    return db;
}

export function initializeRefugeDatabase(database: DatabaseSync): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS refuge_rows (
            table_name TEXT NOT NULL,
            identity TEXT NOT NULL,
            row_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (table_name, identity)
        );
        CREATE INDEX IF NOT EXISTS idx_refuge_rows_table_name
            ON refuge_rows(table_name);
    `);
}

export function replaceRefugeTableRows(
    database: DatabaseSync,
    table: string,
    rows: RefugeRow[]
): void {
    const deleteRows = database.prepare(
        "DELETE FROM refuge_rows WHERE table_name = ?"
    );
    const insertRow = database.prepare(`
        INSERT INTO refuge_rows (table_name, identity, row_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    database.exec("BEGIN IMMEDIATE");
    try {
        deleteRows.run(table);
        for (const row of rows) {
            const identity = getRefugeIdentity(table, row);
            insertRow.run(table, identity, JSON.stringify(row));
        }
        database.exec("COMMIT");
    } catch (error) {
        database.exec("ROLLBACK");
        throw error;
    }
}

export function listRefugeRows(table: string): RefugeRow[] {
    const database = getRefugeDatabase();
    const rows = database
        .prepare(
            "SELECT row_json FROM refuge_rows WHERE table_name = ? ORDER BY identity"
        )
        .all(table) as { row_json: string }[];
    return rows.map((row) => JSON.parse(row.row_json) as RefugeRow);
}

export function writeRefugeRows(table: string, rows: RefugeRow[]): void {
    const database = getRefugeDatabase();
    replaceRefugeTableRows(database, table, rows);
}

export function appendRefugeJournal(entry: RefugeJournalEntry): void {
    ensureParent(REFUGE_JOURNAL_PATH);
    const prevHash = getRefugeJournalHeadHash();
    const { hash: _hash, prevHash: _prevHash, ...journalPayload } = entry;
    const entryForHash: RefugeJournalEntry = { ...journalPayload, prevHash };
    const nextEntry: RefugeJournalEntry = {
        ...entryForHash,
        hash: hashJournalEntry(entryForHash),
    };
    fs.appendFileSync(
        REFUGE_JOURNAL_PATH,
        `${JSON.stringify(nextEntry)}\n`,
        "utf8"
    );
}

export function readRefugeJournal(): RefugeJournalEntry[] {
    if (!fs.existsSync(REFUGE_JOURNAL_PATH)) return [];
    const entries = fs
        .readFileSync(REFUGE_JOURNAL_PATH, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseJournalLine);
    verifyRefugeJournal(entries);
    return entries;
}

export function closeRefugeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

export function resetRefugeDatabase(): DatabaseSync {
    closeRefugeDatabase();
    ensureParent(REFUGE_DB_PATH);
    if (fs.existsSync(REFUGE_DB_PATH)) fs.rmSync(REFUGE_DB_PATH);
    const database = getRefugeDatabase();
    return database;
}
