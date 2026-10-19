import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFUGE_SUPPORTED_TABLES } from "@/lib/refuge/schema";
import type { ExportRow } from "@/lib/orireki-export";

const state = vi.hoisted(() => ({
    requireAdminSession: vi.fn(),
    isSqliteRefugeMode: vi.fn(),
    listRefugeRows: vi.fn(),
    from: vi.fn(),
    scopedFrom: vi.fn(),
    rpc: vi.fn(),
    snapshot: null as Record<string, unknown> | null,
}));
vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: state.requireAdminSession,
}));
vi.mock("@/lib/refuge/mode", () => ({
    isSqliteRefugeMode: state.isSqliteRefugeMode,
}));
vi.mock("@/lib/refuge/store", () => ({
    listRefugeRows: state.listRefugeRows,
}));
vi.mock("@/lib/supabase", () => ({
    unscopedServerClient: { from: state.from, rpc: state.rpc },
    serverClient: { from: state.scopedFrom },
}));

import {
    createSnapshot,
    deleteSnapshot,
    getSnapshotDownload,
    listSnapshots,
} from "@/app/admin/actions/snapshots";

describe("다국어 DB 백업", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.snapshot = null;
        state.requireAdminSession.mockResolvedValue({});
        state.isSqliteRefugeMode.mockReturnValue(true);
        state.listRefugeRows.mockImplementation((table: string) =>
            table === "resume_data"
                ? ["ko", "en", "ja"].map((lang) => ({
                      lang,
                      data: { name: lang },
                  }))
                : table.endsWith("_i18n")
                  ? ["en", "ja"].map((lang) => ({
                        id: "shared",
                        lang,
                        published: false,
                        content: `${table}:${lang}`,
                    }))
                  : []
        );
        state.from.mockImplementation(() => {
            const result = () => ({ data: state.snapshot, error: null });
            const query = {
                select: () => query,
                order: () => query,
                limit: async () => ({ data: [state.snapshot], error: null }),
                eq: () => query,
                delete: () => query,
                insert: (snapshot: Record<string, unknown>) => {
                    state.snapshot = snapshot;
                    return query;
                },
                single: async () => result(),
                then: (
                    resolve: (value: ReturnType<typeof result>) => unknown
                ) => Promise.resolve(result()).then(resolve),
            };
            return query;
        });
    });

    it("로컬 백업에 모든 언어·공개 상태·편집 이력을 보존하고 다운로드 결과 일치", async () => {
        const snapshot = await createSnapshot();
        expect(snapshot).not.toHaveProperty("error");
        const saved = state.snapshot!;
        const expectedTables = REFUGE_SUPPORTED_TABLES.filter(
            (table) => table !== "database_snapshots"
        );
        expect(saved.table_names).toEqual(expectedTables);
        const rows = saved.data as Record<string, ExportRow[]>;
        expect(rows.resume_data.map((row) => row.lang)).toEqual([
            "ko",
            "en",
            "ja",
        ]);
        expect(rows.posts_i18n).toHaveLength(2);
        expect(rows.posts_i18n[1]).toMatchObject({
            lang: "ja",
            published: false,
        });
        expect(rows.editor_states_i18n).toHaveLength(2);
        expect(rows.post_content_revisions_i18n).toHaveLength(2);
        expect(rows.post_content_chunks_i18n).toHaveLength(2);
        expect(rows.site_config_i18n).toHaveLength(2);
        expect(rows).not.toHaveProperty("ai_agent_tokens");
        expect(rows).not.toHaveProperty("database_snapshots");
        const download = await getSnapshotDownload(String(saved.id));
        expect(download).toHaveProperty("content");
        if (!("content" in download)) throw new Error("다운로드 자료 없음");
        expect(JSON.parse(download.content)).toEqual(rows);
        await listSnapshots();
        await deleteSnapshot(String(saved.id));
        expect(state.scopedFrom).not.toHaveBeenCalled();
        expect(state.rpc).not.toHaveBeenCalled();
    });

    it("Supabase 백업은 언어 필터 없는 기존 snapshot RPC 사용", async () => {
        state.isSqliteRefugeMode.mockReturnValue(false);
        const metadata = {
            id: "snapshot",
            filename: "all.json",
            table_names: ["posts_i18n"],
            created_at: "now",
        };
        state.rpc.mockReturnValue({
            single: async () => ({ data: metadata, error: null }),
        });
        expect(await createSnapshot()).toEqual(metadata);
        expect(state.rpc).toHaveBeenCalledWith("create_database_snapshot");
        expect(state.listRefugeRows).not.toHaveBeenCalled();
        expect(state.scopedFrom).not.toHaveBeenCalled();
    });

    it("백업의 모든 진입점에서 관리자 인증 실패 시 DB 접근 차단", async () => {
        state.requireAdminSession.mockRejectedValue(new Error("denied"));
        for (const action of [
            () => listSnapshots(),
            () => createSnapshot(),
            () => getSnapshotDownload("snapshot"),
            () => deleteSnapshot("snapshot"),
        ]) {
            await expect(action()).rejects.toThrow("denied");
        }
        expect(state.from).not.toHaveBeenCalled();
        expect(state.rpc).not.toHaveBeenCalled();
        expect(state.listRefugeRows).not.toHaveBeenCalled();
    });
});
