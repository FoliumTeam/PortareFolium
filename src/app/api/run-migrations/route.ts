import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase";
import { getPendingMigrations } from "@/lib/migrations";

export async function POST() {
    if (!serverClient) {
        return NextResponse.json(
            { error: "서버 클라이언트가 설정되지 않았습니다" },
            { status: 500 }
        );
    }

    const { data: versionRow } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "db_schema_version")
        .single();

    if (!versionRow?.value) {
        return NextResponse.json(
            {
                error: "db_schema_version 없음. setup.sql 또는 migration-whole.sql을 먼저 실행하세요.",
            },
            { status: 400 }
        );
    }

    const raw = versionRow.value;
    const dbVersion =
        typeof raw === "string" && raw.startsWith('"')
            ? JSON.parse(raw)
            : String(raw);

    const pending = getPendingMigrations(dbVersion);

    if (pending.length === 0) {
        return NextResponse.json({
            success: true,
            applied: 0,
            message: "이미 최신 상태입니다",
        });
    }

    const applied: string[] = [];
    for (const migration of pending) {
        const { error } = await serverClient.rpc("exec_sql", {
            sql: migration.sql,
        });
        if (error) {
            return NextResponse.json(
                {
                    error: `마이그레이션 v${migration.version} 실패: ${error.message}`,
                    applied,
                },
                { status: 500 }
            );
        }
        applied.push(migration.version);
    }

    return NextResponse.json({
        success: true,
        applied: applied.length,
        versions: applied,
    });
}
