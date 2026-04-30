import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
    DEFAULT_REFUGE_BACKUP_PATH,
    REFUGE_DB_PATH,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
    REFUGE_UNSUPPORTED_REPORT_PATH,
} from "../src/lib/refuge/paths";
import {
    replaceRefugeTableRows,
    resetRefugeDatabase,
} from "../src/lib/refuge/store";
import { sha256, stableJson } from "../src/lib/refuge/mode";
import {
    REFUGE_EXCLUDED_TABLES,
    REFUGE_SUPPORTED_TABLES,
    type RefugeManifest,
    type RefugeModeState,
    type RefugeRow,
} from "../src/lib/refuge/schema";

type BackupShape = {
    createdAt?: string;
    source?: string;
    tables?: Record<string, RefugeRow[]>;
};

function getArgValue(name: string): string | null {
    const index = process.argv.indexOf(name);
    if (index < 0) return null;
    return process.argv[index + 1] ?? null;
}

function hasArg(name: string): boolean {
    return process.argv.includes(name);
}

function ensureRefugeDir(): void {
    fs.mkdirSync(path.dirname(REFUGE_DB_PATH), { recursive: true });
}

function loadBackup(filePath: string): {
    source: string;
    tables: Record<string, RefugeRow[]>;
} {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as BackupShape;
    const tables = parsed.tables ?? {};
    return {
        source: parsed.source ?? filePath,
        tables,
    };
}

async function loadSupabase(): Promise<{
    source: string;
    tables: Record<string, RefugeRow[]>;
}> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SECRET_KEY ??
        process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    const client = createClient(url, key);
    const tables: Record<string, RefugeRow[]> = {};
    for (const table of REFUGE_SUPPORTED_TABLES) {
        const { data, error } = await client.from(table).select("*");
        if (error) throw new Error(`${table}: ${error.message}`);
        tables[table] = (data ?? []) as RefugeRow[];
    }
    return { source: url, tables };
}

function pickSource(): { type: "backup"; path: string } | { type: "supabase" } {
    const fromArg = getArgValue("--from") ?? getArgValue("--backup");
    if (fromArg) return { type: "backup", path: path.resolve(fromArg) };
    if (fs.existsSync(DEFAULT_REFUGE_BACKUP_PATH)) {
        return { type: "backup", path: DEFAULT_REFUGE_BACKUP_PATH };
    }
    return { type: "supabase" };
}

async function main(): Promise<void> {
    ensureRefugeDir();
    const sourceChoice = pickSource();
    const sourceData =
        sourceChoice.type === "backup"
            ? loadBackup(sourceChoice.path)
            : await loadSupabase();

    const database = resetRefugeDatabase();
    const manifestTables: RefugeManifest["tables"] = {};
    for (const table of REFUGE_SUPPORTED_TABLES) {
        const rows = sourceData.tables[table] ?? [];
        replaceRefugeTableRows(
            database,
            table,
            rows.map((row) => ({ ...row }))
        );
        manifestTables[table] = {
            rowCount: rows.length,
            checksum: sha256(stableJson(rows)),
        };
    }

    fs.writeFileSync(REFUGE_JOURNAL_PATH, "", "utf8");
    const manifest: RefugeManifest = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        source: sourceData.source,
        sourceHash: sha256(sourceData.source),
        dbPath: REFUGE_DB_PATH,
        modePath: REFUGE_MODE_PATH,
        journalPath: REFUGE_JOURNAL_PATH,
        tables: manifestTables,
        excludedTables: [...REFUGE_EXCLUDED_TABLES],
    };
    fs.writeFileSync(
        REFUGE_MANIFEST_PATH,
        JSON.stringify(manifest, null, 2),
        "utf8"
    );
    fs.writeFileSync(
        REFUGE_UNSUPPORTED_REPORT_PATH,
        JSON.stringify(
            {
                createdAt: manifest.createdAt,
                excludedTables: manifest.excludedTables,
                unsupportedActions: [
                    "agent token mutation",
                    "MCP token authentication",
                ],
                degradedSurfaces: [
                    "MCP token authentication remains unavailable in local SQLite refuge",
                    "refuge:push defaults to replay-plan dry-run unless --apply is supplied",
                ],
            },
            null,
            2
        ),
        "utf8"
    );

    if (hasArg("--activate")) {
        const state: RefugeModeState = {
            mode: "sqlite-refuge",
            activatedAt: new Date().toISOString(),
            dbPath: REFUGE_DB_PATH,
            manifestPath: REFUGE_MANIFEST_PATH,
            journalPath: REFUGE_JOURNAL_PATH,
        };
        fs.writeFileSync(
            REFUGE_MODE_PATH,
            JSON.stringify(state, null, 2),
            "utf8"
        );
    }

    console.log(
        JSON.stringify(
            {
                ok: true,
                activated: hasArg("--activate"),
                manifestPath: REFUGE_MANIFEST_PATH,
                unsupportedReportPath: REFUGE_UNSUPPORTED_REPORT_PATH,
                dbPath: REFUGE_DB_PATH,
                tables: manifestTables,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(`[refuge-pull::main] ${(error as Error).message}`);
    process.exit(1);
});
