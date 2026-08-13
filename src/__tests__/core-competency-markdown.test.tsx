import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CoreCompetencyMarkdown from "@/components/resume/CoreCompetencyMarkdown";

describe("CoreCompetencyMarkdown", () => {
    it("굵은 Markdown을 직무 색상 강조로 표시하고 빈 줄을 문단으로 나눈다", () => {
        const { container } = render(
            <CoreCompetencyMarkdown
                description={
                    "**핵심 결과**를 먼저 표시\n\n다음 문단에 근거를 표시"
                }
            />
        );

        expect(screen.getByText("핵심 결과").tagName).toBe("STRONG");
        expect(screen.getByText("핵심 결과")).toHaveClass(
            "text-(--color-accent)"
        );
        expect(container.querySelectorAll("p")).toHaveLength(2);
    });
});
