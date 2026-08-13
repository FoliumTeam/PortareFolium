import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("Markdown 렌더링", () => {
    it("강조 문법은 렌더링하고 단일 물결표 범위 표기는 취소선으로 해석하지 않는다", async () => {
        const html = await renderMarkdown("**강조 문구**\n\n1~2시간에서 1~2분");

        expect(html).toContain("<strong>강조 문구</strong>");
        expect(html).not.toContain("**강조 문구**");
        expect(html).toContain("1~2시간에서 1~2분");
        expect(html).not.toContain("<del>");
    });
});
