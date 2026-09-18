import { describe, expect, it, vi } from "vitest";
const gate = vi.hoisted(() => ({ requireAdminSession: vi.fn() }));
vi.mock("@/lib/server-admin", () => gate);
vi.mock("@/lib/supabase", () => ({ serverClient: null }));
vi.mock("@/lib/r2", () => ({
    r2Client: {},
    R2_BUCKET: "test",
    R2_PUBLIC_URL: "",
}));
vi.mock("@/lib/post-content-chunks", () => ({ readPostContentById: vi.fn() }));
import { GET } from "@/app/api/orireki-export/route";

describe("이전 다운로드 권한", () => {
    it("관리자 세션 없는 요청 거부", async () => {
        gate.requireAdminSession.mockRejectedValueOnce(new Error("denied"));
        const response = await GET();
        expect(response.status).toBe(401);
    });
    it("관리자 인증 뒤 DB 미설정을 별도 보고", async () => {
        gate.requireAdminSession.mockResolvedValueOnce({});
        const response = await GET();
        expect(response.status).toBe(503);
    });
});
