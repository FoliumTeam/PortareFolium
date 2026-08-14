import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("Markdown 렌더링", () => {
    it("강조 문법은 렌더링하고 단일 물결표 범위 표기는 취소선으로 해석하지 않는다", async () => {
        const html = await renderMarkdown("**강조 문구**\n\n1~2시간에서 1~2분");

        expect(html).toContain("<strong>강조 문구</strong>");
        expect(html).not.toContain("**강조 문구**");
        expect(html).toContain("1~2시간에서 1~2분");
        expect(html).not.toContain("<del>");
    }, 15_000);

    it("목록 문장 안의 공백·가운뎃점을 포함한 강조를 렌더링한다", async () => {
        const html = await renderMarkdown(
            "- 최대 5시간 분량 통행배정 **4분 이내·실패율 0%**로 안정화"
        );

        expect(html).toContain("<strong>4분 이내·실패율 0%</strong>");
        expect(html).not.toContain("**4분 이내·실패율 0%**");
    }, 15_000);
});
