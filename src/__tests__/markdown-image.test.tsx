import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownImage from "@/components/MarkdownImage";

describe("MarkdownImage", () => {
    it("caption을 이미지 아래의 figcaption으로 표시", () => {
        render(
            <MarkdownImage
                src="/portfolio/example.webp"
                alt="예시 화면"
                caption="예시 화면 설명"
            />
        );

        expect(screen.getByRole("img", { name: "예시 화면" })).toHaveAttribute(
            "src",
            "/portfolio/example.webp"
        );
        expect(screen.getByText("예시 화면 설명").tagName).toBe("FIGCAPTION");
    });

    it("출처 링크를 이미지 캡션 안에 표시", () => {
        render(
            <MarkdownImage
                src="/portfolio/example.webp"
                alt="예시 화면"
                caption="예시 화면 설명"
                sourceUrl="https://example.com/source"
                sourceLabel="출처: 예시"
            />
        );

        expect(
            screen.getByRole("link", { name: "출처: 예시" })
        ).toHaveAttribute("href", "https://example.com/source");
    });

    it("이미지와 캡션을 같은 가운데 정렬 figure 안에 표시", () => {
        const { container } = render(
            <MarkdownImage
                src="/portfolio/example.webp"
                alt="예시 화면"
                caption="예시 화면 설명"
                align="center"
            />
        );

        const figure = container.querySelector("figure");
        expect(figure).toHaveClass("w-fit", "max-w-full", "mx-auto");
        expect(figure?.querySelector("figcaption")).toHaveTextContent(
            "예시 화면 설명"
        );
    });
});
