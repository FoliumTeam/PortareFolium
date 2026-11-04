import { describe, expect, it } from "vitest";
import {
    getMissingContentHref,
    getQueryLocale,
    withLanguageQuery,
    withoutLanguageQuery,
} from "@/lib/query-language";

describe("공개 주소 언어 값 해석", () => {
    it.each([
        ["kr", "ko"],
        ["en", "en"],
        ["ja", "ja"],
    ])("공개값 %s를 내부 언어 %s로 해석", (value, locale) => {
        expect(getQueryLocale(value)).toBe(locale);
    });

    it.each([undefined, null, "", "ko", "KR", "fr", "ja-JP", " en "])(
        "유효하지 않은 %s는 강제 선택에서 제외",
        (value) => {
            expect(getQueryLocale(value)).toBeNull();
        }
    );
});

describe("공개 이동 링크의 언어 전달", () => {
    it.each([
        ["/web/resume", "?lang=ja", "/web/resume?lang=ja"],
        [
            "/web/portfolio?page=2#projects",
            "?lang=kr&utm_source=link",
            "/web/portfolio?page=2&lang=kr#projects",
        ],
        [
            "/web/blog?lang=en&page=2#posts",
            "?lang=ja",
            "/web/blog?lang=en&page=2#posts",
        ],
        [
            "/web/blog?lang=fr&page=2#posts",
            "?lang=en",
            "/web/blog?page=2&lang=en#posts",
        ],
        ["/web/resume", "?lang=ko", "/web/resume"],
        ["/web/resume?lang=ja", "?lang=invalid", "/web/resume?lang=ja"],
        ["/web/resume?view=print#work", "", "/web/resume?view=print#work"],
        ["portfolio", "?lang=en", "portfolio?lang=en"],
        ["./portfolio?page=2", "?lang=ja", "./portfolio?page=2&lang=ja"],
        ["../portfolio#projects", "?lang=kr", "../portfolio?lang=kr#projects"],
        ["?page=2", "?lang=en&view=print", "?page=2&lang=en"],
    ])("%s 이동에서 현재 유효 언어만 전달", (href, search, expected) => {
        expect(withLanguageQuery(href, search)).toBe(expected);
    });

    it.each([
        "/admin",
        "/admin/login?returnUrl=/web/resume",
        "/api/mcp",
        "/_next/static/chunk.js",
        "/resume.pdf",
        "/portfolio/project/image.webp",
        "https://example.com/web/resume",
        "https://other.example/web/resume",
        "//other.example/web/resume",
        "  //other.example/web/resume",
        "\thttps://other.example/web/resume",
        "mailto:example@example.test",
        "javascript:alert(1)",
        "data:text/plain,content",
        "#career",
        "\\web\\resume",
    ])("언어 전달 대상이 아닌 %s는 원문 유지", (href) => {
        expect(withLanguageQuery(href, "?lang=ja")).toBe(href);
    });
});

describe("직접 언어 선택 후 주소 정리", () => {
    it.each([
        [
            "/web/resume?lang=ja&view=print#career",
            "/web/resume?view=print#career",
        ],
        [
            "/web/resume?view=print&lang=kr&page=2",
            "/web/resume?view=print&page=2",
        ],
        ["/web/resume?lang=en#career", "/web/resume#career"],
        ["?lang=ja&page=2#posts", "?page=2#posts"],
        [
            "https://example.com/web/resume?lang=ja&view=print#career",
            "https://example.com/web/resume?view=print#career",
        ],
        ["#career?lang=en", "#career?lang=en"],
        ["/web/resume?page=2&lang=ja&lang=en", "/web/resume?page=2"],
        [
            "/web/resume?language=ja&lang=invalid&x=1",
            "/web/resume?language=ja&x=1",
        ],
        ["/web/resume?view=print#career", "/web/resume?view=print#career"],
        [
            "/web/resume?text=A%20B&lang=ja&path=%2f&plus=a+b#career",
            "/web/resume?text=A%20B&path=%2f&plus=a+b#career",
        ],
    ])("%s에서 lang만 제거", (href, expected) => {
        expect(withoutLanguageQuery(href)).toBe(expected);
    });
});

it("누락 상세의 상위 목록으로 언어·다른 검색 값·hash를 함께 전달", () => {
    expect(
        getMissingContentHref(
            "/web/portfolio",
            "?lang=ja&category=frontend&page=2",
            "#case"
        )
    ).toBe("/web/portfolio?lang=ja&category=frontend&page=2#case");
});
