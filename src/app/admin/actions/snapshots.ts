"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

export type DatabaseSnapshot = {
    id: string;
    filename: string;
    table_names: string[];
    created_at: string;
};

type DatabaseSnapshotRow = DatabaseSnapshot & {
    data: unknown;
};

export type SnapshotDownload = {
    filename: string;
    content: string;
};

// Snapshot 목록 조회
export async function listSnapshots(limit = 30): Promise<DatabaseSnapshot[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    const { data, error } = await serverClient
        .from("database_snapshots")
        .select("id, filename, table_names, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error(`[snapshots.ts::listSnapshots] ${error.message}`);
        return [];
    }

    return (data as DatabaseSnapshot[]) ?? [];
}

// Snapshot 생성
export async function createSnapshot(): Promise<
    DatabaseSnapshot | { error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { error: "serverClient 없음" };

    const { data, error } = await serverClient
        .rpc("create_database_snapshot")
        .single();

    if (error) {
        console.error(`[snapshots.ts::createSnapshot] ${error.message}`);
        return { error: error.message };
    }

    return data as DatabaseSnapshot;
}

// Snapshot 다운로드 데이터 조회
export async function getSnapshotDownload(
    id: string
): Promise<SnapshotDownload | { error: string }> {
    await requireAdminSession();
    if (!serverClient) return { error: "serverClient 없음" };

    const { data, error } = await serverClient
        .from("database_snapshots")
        .select("filename, data")
        .eq("id", id)
        .single();

    if (error) {
        console.error(`[snapshots.ts::getSnapshotDownload] ${error.message}`);
        return { error: error.message };
    }

    const row = data as Pick<DatabaseSnapshotRow, "filename" | "data"> | null;

    if (!row) {
        return { error: "Snapshot 없음" };
    }

    return {
        filename: row.filename,
        content: JSON.stringify(row.data ?? {}, null, 2),
    };
}

// Snapshot 삭제
export async function deleteSnapshot(
    id: string
): Promise<{ success: boolean } | { error: string }> {
    await requireAdminSession();
    if (!serverClient) return { error: "serverClient 없음" };

    const { error } = await serverClient
        .from("database_snapshots")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`[snapshots.ts::deleteSnapshot] ${error.message}`);
        return { error: error.message };
    }

    return { success: true };
}
