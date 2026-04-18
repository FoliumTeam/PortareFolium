import { describe, it, expect } from "vitest";
import {
    normalizeAdjacentImageMarkdown,
    unescapeJsxBrackets,
} from "@/lib/tiptap-markdown";

describe("unescapeJsxBrackets", () => {
    it("JSX 속성값 내부 \\[ \\] 복원", () => {
        const input = `<ColoredTable rows={'[[\\"a\\",\\"b\\"\\],\\[\\"c\\",\\"d\\"\\]\\]'} />`;
        const result = unescapeJsxBrackets(input);
        expect(result).not.toContain("\\[");
        expect(result).not.toContain("\\]");
    });

    it("JSX tag 바깥의 markdown link escape는 건드리지 않음", () => {
        const input = `일반 단락의 \\[링크\\]는 유지\n<ColoredTable rows={'\\[\\]'} />`;
        const result = unescapeJsxBrackets(input);
        expect(result).toContain("\\[링크\\]");
        expect(result).toContain("<ColoredTable");
        expect(result.match(/<ColoredTable[\s\S]*?\/>/)?.[0]).not.toContain(
            "\\["
        );
    });

    it("JSX 없으면 원본 그대로 반환", () => {
        const input = "일반 markdown 본문 \\[link\\]";
        expect(unescapeJsxBrackets(input)).toBe(input);
    });

    it("소문자로 시작하는 태그는 대상 외", () => {
        const input = "<img src=\\[foo\\] />";
        expect(unescapeJsxBrackets(input)).toBe(input);
    });
});

describe("normalizeAdjacentImageMarkdown", () => {
    it("연속 image markdown 사이를 blank line으로 분리", () => {
        const input =
            "![](https://example.com/a.webp)![](https://example.com/b.webp)";
        expect(normalizeAdjacentImageMarkdown(input)).toBe(
            "![](https://example.com/a.webp)\n\n![](https://example.com/b.webp)"
        );
    });

    it("이미 줄바꿈이 있으면 유지", () => {
        const input =
            "![](https://example.com/a.webp)\n\n![](https://example.com/b.webp)";
        expect(normalizeAdjacentImageMarkdown(input)).toBe(input);
    });

    it("link 뒤 image는 건드리지 않음", () => {
        const input =
            "[ref](https://example.com)![](https://example.com/a.webp)";
        expect(normalizeAdjacentImageMarkdown(input)).toBe(input);
    });
});
