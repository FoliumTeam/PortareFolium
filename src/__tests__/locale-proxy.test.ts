import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("기존 주소의 언어별 내부 연결", () => {
    it.each([
        ["kr", "ko"],
        ["en", "en"],
        ["ja", "ja"],
    ])("주소 lang=%s가 저장한 선택과 브라우저보다 우선", (value, locale) => {
        const response = proxy(
            new NextRequest(
                `https://example.com/web/resume?lang=${value}&view=print`,
                {
                    headers: {
                        "accept-language": "ko-KR",
                        cookie: "portarefolium_locale=ja",
                    },
                }
            )
        );
        expect(response.headers.get("x-middleware-rewrite")).toBe(
            `https://example.com/${locale}/web/resume?lang=${value}&view=print`
        );
        expect(response.headers.get("content-language")).toBe(locale);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("location")).toBeNull();
    });

    it.each(["ko", "fr", "JA", "", "kr-KR"])(
        "잘못된 주소 언어 %s는 저장한 선택으로 복구",
        (value) => {
            const response = proxy(
                new NextRequest(
                    `https://example.com/web/resume?lang=${value}`,
                    {
                        headers: {
                            "accept-language": "en-US",
                            cookie: "portarefolium_locale=ja",
                        },
                    }
                )
            );
            expect(response.headers.get("content-language")).toBe("ja");
            expect(response.headers.get("set-cookie")).toBeNull();
        }
    );

    it("주소와 저장 값이 모두 잘못된 경우 브라우저 언어 사용", () => {
        const response = proxy(
            new NextRequest("https://example.com/web/resume?lang=invalid", {
                headers: {
                    "accept-language": "ja-JP",
                    cookie: "portarefolium_locale=invalid",
                },
            })
        );
        expect(response.headers.get("x-middleware-rewrite")).toBe(
            "https://example.com/ja/web/resume?lang=invalid"
        );
    });

    it.each([
        ["ko-KR", "ko"],
        ["ja-JP", "ja"],
        ["fr-FR", "en"],
    ])("%s 자동 선택", (browser, locale) => {
        const request = new NextRequest(
            "https://example.com/web/resume?view=print",
            { headers: { "accept-language": browser } }
        );
        const response = proxy(request);
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-rewrite")).toBe(
            `https://example.com/${locale}/web/resume?view=print`
        );
        expect(response.headers.get("content-language")).toBe(locale);
    });
    it("직접 선택한 언어 우선", () => {
        const response = proxy(
            new NextRequest("https://example.com/web/resume", {
                headers: {
                    "accept-language": "ko-KR",
                    cookie: "portarefolium_locale=ja",
                },
            })
        );
        expect(response.headers.get("x-middleware-rewrite")).toBe(
            "https://example.com/ja/web/resume"
        );
    });
    it("내부 주소 직접 노출 방지", () => {
        const response = proxy(
            new NextRequest("https://example.com/en/web/resume")
        );
        expect(response.headers.get("location")).toBe(
            "https://example.com/web/resume"
        );
    });
    it("관리자 인증 경계 보존", () => {
        const response = proxy(new NextRequest("https://example.com/admin"));
        expect(response.headers.get("location")).toContain("/admin/login");
        expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    });
});
