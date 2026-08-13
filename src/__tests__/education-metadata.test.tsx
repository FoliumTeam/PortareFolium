import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EducationMetadata from "@/components/resume/EducationMetadata";

describe("EducationMetadata", () => {
    it("표시할 항목 사이를 경력 메타데이터와 같은 중립색 구분선으로 나눈다", () => {
        const { container } = render(
            <EducationMetadata
                items={["학사", "Computer Science", null, "GPA 3.18 / 4.50"]}
            />
        );

        expect(screen.getByText("Computer Science")).toBeVisible();
        const separators = container.querySelectorAll("[aria-hidden='true']");

        expect(separators).toHaveLength(2);
        expect(separators[0]).toHaveTextContent("|");
        expect(separators[0]).toHaveClass("text-(--color-border)");
        expect(separators[0]).not.toHaveClass("border-(--color-accent)/75");
        expect(separators[0].parentElement).not.toHaveClass("contents");
    });
});
