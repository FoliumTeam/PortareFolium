import { describe, it, expect, vi, beforeEach } from "vitest";
import { toSlug, uniqueSlug } from "@/lib/slug";

// Supabase mock
vi.mock("@/lib/supabase", () => ({
    serverClient: {
        from: vi.fn(),
    },
}));

describe("toSlug", () => {
    it("영문 제목을 slug로 변환", () => {
        expect(toSlug("Hello World")).toBe("hello-world");
    });

    it("한글 제목을 romanization으로 변환", () => {
        const result = toSlug("게임 엔진 프로젝트");
        expect(result).toMatch(/^[a-z0-9-]+$/);
        expect(result.length).toBeGreaterThan(0);
    });

    it("혼합 제목 (영문 + 한글) 처리", () => {
        const result = toSlug("Unity 게임 개발");
        expect(result).toMatch(/^unity-/);
        expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("특수문자 제거", () => {
        const result = toSlug("Hello! @World# $2024");
        expect(result).not.toMatch(/[!@#$]/);
    });

    it("연속 하이픈 정리", () => {
        expect(toSlug("a   b   c")).toBe("a-b-c");
    });

    it("80자 제한", () => {
        const long = "a".repeat(100);
        expect(toSlug(long).length).toBeLessThanOrEqual(80);
    });

    it("빈 결과 시 fallback", () => {
        const result = toSlug("   ");
        expect(result).toMatch(/^post-/);
    });
});

describe("uniqueSlug", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("중복 없으면 원래 slug 반환", async () => {
        const { serverClient } = await import("@/lib/supabase");
        const mockQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [] }),
        };
        vi.mocked(serverClient!.from).mockReturnValue(mockQuery as never);

        const result = await uniqueSlug("my-post", "posts");
        expect(result).toBe("my-post");
    });

    it("중복 시 suffix 추가", async () => {
        const { serverClient } = await import("@/lib/supabase");
        let callCount = 0;
        const mockQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            limit: vi.fn(() => {
                callCount++;
                // 첫 번째 호출: 중복 존재, 두 번째: 없음
                return Promise.resolve({
                    data: callCount === 1 ? [{ id: "x" }] : [],
                });
            }),
        };
        vi.mocked(serverClient!.from).mockReturnValue(mockQuery as never);

        const result = await uniqueSlug("my-post", "posts");
        expect(result).toBe("my-post-2");
    });
});
