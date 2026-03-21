"use server";

import { serverClient } from "@/lib/supabase";

export interface Snapshot {
    id: string;
    source_table: string;
    record_id: string;
    data: unknown;
    triggered_by: string;
    created_at: string;
}

// 테이블별 스냅샷 목록 조회
export async function listSnapshots(
    sourceTable?: string,
    limit = 50
): Promise<Snapshot[]> {
    if (!serverClient) return [];

    let query = serverClient
        .from("content_snapshots")
        .select("id, source_table, record_id, triggered_by, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (sourceTable) {
        query = query.eq("source_table", sourceTable);
    }

    const { data } = await query;
    return (data as Snapshot[]) ?? [];
}

// 스냅샷 단건 조회 (data 포함)
export async function getSnapshot(id: string): Promise<Snapshot | null> {
    if (!serverClient) return null;

    const { data } = await serverClient
        .from("content_snapshots")
        .select("*")
        .eq("id", id)
        .single();

    return (data as Snapshot) ?? null;
}

// 스냅샷 복원 (해당 테이블의 레코드를 snapshot data로 덮어쓰기)
export async function restoreSnapshot(
    id: string
): Promise<{ success: boolean } | { error: string }> {
    if (!serverClient) return { error: "serverClient 없음" };

    const snapshot = await getSnapshot(id);
    if (!snapshot) return { error: "스냅샷 없음" };

    const { source_table, record_id, data } = snapshot;
    const record = data as Record<string, unknown>;

    const { error } = await serverClient
        .from(source_table)
        .update(record)
        .eq("id", record_id);

    if (error) return { error: error.message };
    return { success: true };
}
