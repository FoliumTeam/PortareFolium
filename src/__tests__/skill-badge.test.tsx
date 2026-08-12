import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkillBadge, SkillIcon } from "@/components/resume/SkillBadge";

describe("SkillBadge", () => {
    it("DB iconUrl을 Simple Icons보다 우선 표시한다", () => {
        render(
            <SkillBadge
                name="Amazon S3"
                overrideSlug="amazon-s3"
                overrideColor="#7AA116"
                iconUrl="https://example.com/amazon-s3.png"
            />
        );

        const icon = screen.getByRole("img", { name: "Amazon S3 로고" });
        expect(icon.getAttribute("src")).toContain(
            encodeURIComponent("https://example.com/amazon-s3.png")
        );
        expect(screen.getByText("Amazon S3")).toHaveStyle({
            backgroundColor: "#7AA116",
        });
    });

    it("iconUrl이 없으면 Simple Icons를 표시한다", () => {
        render(<SkillIcon name="React" slug="react" />);

        expect(screen.getByRole("img", { name: "React 로고" })).toBeVisible();
    });

    it("알 수 없는 slug와 빈 iconUrl이면 로고를 표시하지 않는다", () => {
        const { container } = render(
            <SkillIcon name="Unknown" slug="missing-icon" />
        );

        expect(container).toBeEmptyDOMElement();
    });
});
