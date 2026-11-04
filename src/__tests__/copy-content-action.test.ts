import { beforeEach, describe, expect, it, vi } from "vitest";
import { withContentLocale } from "@/lib/content-locale";
import { copyContentToLanguage } from "@/app/admin/actions/content-variants";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    copy: vi.fn(),
    invalidate: vi.fn(),
}));
vi.mock("@/lib/server-admin", () => ({ requireAdminSession: mocks.auth }));
vi.mock("@/lib/supabase", () => ({ serverClient: null }));
vi.mock("@/lib/application-profile", () => ({
    createApplicationSourceSnapshot: vi.fn(),
}));
vi.mock("@/lib/post-content-chunks", () => ({ readPostContentById: vi.fn() }));
vi.mock("@/lib/content-variants", async (original) => ({
    ...(await original<typeof import("@/lib/content-variants")>()),
    copyContentVariant: mocks.copy,
}));
vi.mock("@/app/admin/actions/revalidate", () => ({
    revalidateLayout: mocks.invalidate,
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { email: "admin@example.test" } });
    mocks.copy.mockResolvedValue({
        success: true,
        lang: "ja",
        published: false,
    });
});

describe("현재 콘텐츠를 명시한 언어에 복사", () => {
    it("본문 검증의 내부 오류는 사용자용 중단 안내로 전달", async () => {
        mocks.copy.mockRejectedValue(
            new Error("[post-content-chunks::read] checksum mismatch")
        );
        await expect(
            copyContentToLanguage("post", "ja", "saved-title", {
                __contentLocale: "ko",
            })
        ).rejects.toThrow("자료 확인 실패로 복사 중단");
        expect(mocks.invalidate).not.toHaveBeenCalled();
    });
    it("화면 언어와 무관하게 캡처한 입력 언어·대상·항목을 전달하고 캐시 갱신", async () => {
        const result = await withContentLocale("en", () =>
            copyContentToLanguage("post", "ja", "saved-title", {
                __contentLocale: "ko",
            })
        );
        expect(mocks.copy).toHaveBeenCalledExactlyOnceWith(
            "post",
            "ko",
            "ja",
            "saved-title"
        );
        expect(result).toEqual({ success: true, lang: "ja", published: false });
        expect(mocks.invalidate).toHaveBeenCalledOnce();
    });

    it("인증 실패 시 조회·복사·캐시 변경 차단", async () => {
        mocks.auth.mockRejectedValue(new Error("Unauthorized"));
        await expect(
            copyContentToLanguage("resume", "en", undefined, {
                __contentLocale: "ko",
            })
        ).rejects.toThrow("Unauthorized");
        expect(mocks.copy).not.toHaveBeenCalled();
        expect(mocks.invalidate).not.toHaveBeenCalled();
    });

    it("잘못된 원본 범위·대상 언어·종류는 복사 전에 차단", async () => {
        const directCall = (...args: unknown[]) =>
            Reflect.apply(copyContentToLanguage, null, args) as ReturnType<
                typeof copyContentToLanguage
            >;
        await expect(
            directCall("resume", "en", undefined, {
                __contentLocale: "kr",
            })
        ).rejects.toThrow();
        await expect(
            directCall("resume", "kr", undefined, {
                __contentLocale: "ko",
            })
        ).rejects.toThrow();
        await expect(
            directCall("unknown", "ja", "saved-title", {
                __contentLocale: "ko",
            })
        ).rejects.toThrow();
        expect(mocks.copy).not.toHaveBeenCalled();
    });

    it("저장 실패 시 캐시 갱신과 성공 반환 제외", async () => {
        mocks.copy.mockRejectedValue(
            new Error("대상 언어의 기존 내용 보존을 위해 복사 중단")
        );
        await expect(
            copyContentToLanguage("book", "ja", "saved-title", {
                __contentLocale: "ko",
            })
        ).rejects.toThrow("기존 내용 보존");
        expect(mocks.invalidate).not.toHaveBeenCalled();
    });
});
