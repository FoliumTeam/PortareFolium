import {
    getRefugeDatabase,
    listRefugeRows,
    writeRefugeRows,
} from "@/lib/refuge/store";
import type { Migration } from "@/lib/migrations";
import type { RefugeRow } from "@/lib/refuge/schema";

function normalizeVersionValue(value: unknown): string | null {
    if (typeof value !== "string") return value == null ? null : String(value);
    if (!value.startsWith('"')) return value;
    try {
        return JSON.parse(value) as string;
    } catch {
        return value;
    }
}

export function getSqliteRefugeSchemaVersion(): string | null {
    const row = listRefugeRows("site_config").find(
        (item) => item.key === "db_schema_version"
    );
    return normalizeVersionValue(row?.value);
}

export function setSqliteRefugeSchemaVersion(version: string): void {
    const rows = listRefugeRows("site_config");
    const nextRow: RefugeRow = {
        key: "db_schema_version",
        value: version,
    };
    const index = rows.findIndex((row) => row.key === "db_schema_version");
    if (index >= 0) rows[index] = { ...rows[index], ...nextRow };
    else rows.push(nextRow);
    writeRefugeRows("site_config", rows);
}

export function applySqliteRefugeMigration(migration: Migration): void {
    if (migration.sqliteSql?.trim()) {
        getRefugeDatabase().exec(migration.sqliteSql);
    }
    setSqliteRefugeSchemaVersion(migration.version);
}
