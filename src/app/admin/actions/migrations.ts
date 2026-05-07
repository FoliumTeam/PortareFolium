"use server";

import { getPendingMigrations } from "@/lib/migrations";
import { isSqliteRefugeMode } from "@/lib/refuge/mode";
import {
    applySqliteRefugeMigration,
    getSqliteRefugeSchemaVersion,
} from "@/lib/refuge/sqlite-migrations";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

export type DbMigrationApplyResult = {
    applied: number;
    mode: "sqlite-refuge" | "supabase";
    versions: string[];
};

function normalizeDbSchemaVersion(value: unknown): string | null {
    if (typeof value !== "string") return value == null ? null : String(value);
    if (!value.startsWith('"')) return value;
    return JSON.parse(value) as string;
}

export async function applyPendingDbMigrations(): Promise<DbMigrationApplyResult> {
    await requireAdminSession();

    if (isSqliteRefugeMode()) {
        const dbVersion = getSqliteRefugeSchemaVersion();
        if (!dbVersion) {
            throw new Error("sqlite refuge db_schema_version 없음");
        }

        const pending = getPendingMigrations(dbVersion);
        const versions: string[] = [];
        for (const migration of pending) {
            applySqliteRefugeMigration(migration);
            versions.push(migration.version);
        }

        return {
            applied: versions.length,
            mode: "sqlite-refuge",
            versions,
        };
    }

    if (!serverClient) {
        throw new Error("서버 Supabase client가 설정되지 않았습니다");
    }

    const { data: versionRow } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "db_schema_version")
        .single();

    const dbVersion = normalizeDbSchemaVersion(versionRow?.value);
    if (!dbVersion) {
        throw new Error(
            "db_schema_version 없음. supabase/setup.sql을 먼저 실행하세요."
        );
    }

    const pending = getPendingMigrations(dbVersion);
    const versions: string[] = [];
    for (const migration of pending) {
        const { error } = await serverClient.rpc("exec_sql", {
            sql: migration.sql,
        });
        if (error) {
            throw new Error(
                `마이그레이션 v${migration.version} 실패: ${error.message}`
            );
        }
        versions.push(migration.version);
    }

    return {
        applied: versions.length,
        mode: "supabase",
        versions,
    };
}
