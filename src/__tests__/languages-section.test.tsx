import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LanguagesSection, {
    getLanguageCode,
    getLanguageCountryCode,
    getLanguageFlagSrc,
} from "@/components/resume/LanguagesSection";

describe("LanguagesSection", () => {
    it("언어별 국기와 숙련도를 카드로 표시한다", () => {
        const { container } = render(
            <LanguagesSection
                label="언어"
                languages={[
                    { language: "한국어", fluency: "모국어" },
                    { language: "영어", fluency: "비즈니스 수준" },
                ]}
            />
        );

        expect(
            screen.getByRole("img", { name: "한국어 국기" })
        ).toHaveAttribute("src", "https://flagcdn.com/w80/kr.png");
        expect(screen.getByText("비즈니스 수준")).toBeVisible();
        expect(container.querySelector("section > div")).toHaveClass(
            "grid-cols-1",
            "tablet:grid-cols-2"
        );
        expect(container.querySelector("article")).not.toHaveClass(
            "border-l-(--color-accent)"
        );
    });

    it("언어명을 국제화 데이터로 국가 코드와 국기 이미지로 자동 변환한다", () => {
        expect(getLanguageCode("한국어")).toBe("ko");
        expect(getLanguageCode("영어")).toBe("en");
        expect(getLanguageCountryCode("영어")).toBe("us");
        expect(getLanguageCountryCode("en-GB")).toBe("gb");
        expect(getLanguageFlagSrc("en-GB")).toBe(
            "https://flagcdn.com/w80/gb.png"
        );
    });

    it("인식할 수 없는 언어에는 국기 이미지를 표시하지 않는다", () => {
        expect(getLanguageFlagSrc("가상의 언어")).toBeNull();
    });
});
