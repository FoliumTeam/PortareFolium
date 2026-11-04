import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ gate: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/server-admin", () => ({ requireAdminSession: state.gate }));
vi.mock("@/lib/supabase", () => ({ serverClient: { from: state.from } }));
vi.mock("@/lib/action-locale", () => ({ withActionLocale: vi.fn() }));
vi.mock("@/lib/refuge/mode", () => ({ isSqliteRefugeMode: () => false }));
vi.mock("@/lib/refuge/sqlite-migrations", () => ({
    getSqliteRefugeSchemaVersion: vi.fn(),
}));

import { getAdminProfileImage } from "@/app/admin/actions/public-data";

describe("관리자 프로필 이미지의 비공개 경계", () => {
    beforeEach(() => vi.clearAllMocks());

    it("직접 호출도 인증 실패 시 비공개 이력서 조회 전에 거부", async () => {
        state.gate.mockRejectedValueOnce(new Error("denied"));
        await expect(getAdminProfileImage()).rejects.toThrow("denied");
        expect(state.from).not.toHaveBeenCalled();
    });

    it("관리자 인증 뒤 프로필 이미지 조회 허용", async () => {
        state.gate.mockResolvedValueOnce({ user: { role: "admin" } });
        const query = {
            select: () => query,
            eq: () => query,
            single: async () => ({
                data: { data: { basics: { image: "/private-avatar.webp" } } },
            }),
        };
        state.from.mockReturnValueOnce(query);
        await expect(getAdminProfileImage()).resolves.toBe(
            "/private-avatar.webp"
        );
        expect(state.from).toHaveBeenCalledWith("resume_data");
    });
});
