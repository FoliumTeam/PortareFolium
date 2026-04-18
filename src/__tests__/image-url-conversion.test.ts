import { describe, it, expect } from "vitest";
import {
    bareImageUrlsToMarkdown,
    repairDoubleWrappedImages,
} from "@/extensions/ImageDropPaste";

describe("bareImageUrlsToMarkdown", () => {
    it("wraps standalone URL", () => {
        expect(bareImageUrlsToMarkdown("https://example.com/foo.png")).toBe(
            "![](https://example.com/foo.png)"
        );
    });

    it("wraps URL with text around", () => {
        expect(
            bareImageUrlsToMarkdown("see https://example.com/foo.png for more")
        ).toBe("see ![](https://example.com/foo.png) for more");
    });

    it("does NOT re-wrap URL already inside markdown image", () => {
        const original = "![](https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT re-wrap multiple consecutive markdown images", () => {
        const original =
            "![](https://example.com/a.png)![](https://example.com/b.webp)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT re-wrap markdown image with alt text", () => {
        const original = "![alt](https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT wrap URL inside parentheses", () => {
        const original = "(https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("supports webp/jpg/gif/svg/avif", () => {
        for (const ext of ["webp", "jpg", "jpeg", "gif", "svg", "avif"]) {
            const url = `https://example.com/foo.${ext}`;
            expect(bareImageUrlsToMarkdown(url)).toBe(`![](${url})`);
        }
    });

    it("ignores non-image URLs", () => {
        expect(bareImageUrlsToMarkdown("https://example.com/page.html")).toBe(
            "https://example.com/page.html"
        );
    });
});

// WYSIWYG ↔ source 전환 시 이미지가 손상 없이 보존되는지 검증
// 실제 Tiptap mount 대신 markdown 직렬화 결과(getCleanMarkdown 출력 가정)를
// preprocess 함수에 통과시켜 roundtrip 멱등성을 확인
describe("WYSIWYG ↔ source mode roundtrip with SVG image", () => {
    const svgUrl =
        "https://pub-6da6469ff0b5484cb3fdd70f63dfaf6d.r2.dev/blog/test/dummy.svg";
    const markdownWithSvg = `# Heading\n\nIntro text\n\n![](${svgUrl})\n\nOutro`;

    it("single roundtrip preserves SVG image markdown", () => {
        // exitSourceMode preprocess pipeline 시뮬레이션
        const out = bareImageUrlsToMarkdown(markdownWithSvg);
        expect(out).toBe(markdownWithSvg);
        expect(out.match(/!\[\]\(/g)?.length).toBe(1);
    });

    it("ten consecutive roundtrips do not degrade content", () => {
        let text = markdownWithSvg;
        for (let i = 0; i < 10; i += 1) {
            text = bareImageUrlsToMarkdown(text);
        }
        expect(text).toBe(markdownWithSvg);
        // ![]( 가 정확히 1개만 존재 (double-wrap 없음)
        expect(text.match(/!\[\]\(/g)?.length).toBe(1);
    });

    it("multiple SVGs in one document all preserved", () => {
        const multi = [
            `![](${svgUrl})`,
            `![](${svgUrl.replace("dummy", "second")})`,
            `![](${svgUrl.replace("dummy", "third")})`,
        ].join("");
        expect(bareImageUrlsToMarkdown(multi)).toBe(multi);
    });

    it("SVG URL with query string + fragment preserved", () => {
        const fancy = `![](${svgUrl}?v=2#section)`;
        expect(bareImageUrlsToMarkdown(fancy)).toBe(fancy);
    });

    it("repairs legacy double-wrapped SVG then stays stable", () => {
        const broken = `![](![](${svgUrl}))`;
        const fixed = bareImageUrlsToMarkdown(broken);
        expect(fixed).toBe(`![](${svgUrl})`);
        // 추가 roundtrip 시 변화 없음
        expect(bareImageUrlsToMarkdown(fixed)).toBe(fixed);
    });

    it("bare SVG URL gets wrapped, then idempotent", () => {
        const wrapped = bareImageUrlsToMarkdown(svgUrl);
        expect(wrapped).toBe(`![](${svgUrl})`);
        expect(bareImageUrlsToMarkdown(wrapped)).toBe(wrapped);
    });
});

describe("repairDoubleWrappedImages", () => {
    it("unwraps ![](![](url))", () => {
        expect(
            repairDoubleWrappedImages("![](![](https://example.com/foo.webp))")
        ).toBe("![](https://example.com/foo.webp)");
    });

    it("unwraps ![](![]\\(url\\)) with escaped parens", () => {
        expect(
            repairDoubleWrappedImages(
                "![](![]\\(https://example.com/foo.webp\\))"
            )
        ).toBe("![](https://example.com/foo.webp)");
    });

    it("leaves clean markdown unchanged", () => {
        const clean =
            "![](https://example.com/a.png)![](https://example.com/b.webp)";
        expect(repairDoubleWrappedImages(clean)).toBe(clean);
    });
});
