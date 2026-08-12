import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PortfolioGallery from "@/components/portfolio/PortfolioGallery";

describe("PortfolioGallery", () => {
    it("video를 controls, poster, caption, print fallback link와 함께 렌더", () => {
        const { container } = render(
            <PortfolioGallery
                media={[
                    {
                        type: "video",
                        src: "/portfolio/project/demo.mp4",
                        poster: "/portfolio/project/poster.webp",
                        alt: "Gameplay demo",
                        caption: "입력과 feedback 확인",
                    },
                ]}
            />
        );

        const video = container.querySelector("video");
        expect(video).toHaveAttribute("controls");
        expect(video).toHaveAttribute(
            "poster",
            "/portfolio/project/poster.webp"
        );
        expect(video).not.toHaveAttribute("autoplay");
        expect(
            screen.getByRole("heading", { name: "대표 이미지" })
        ).toBeInTheDocument();
        expect(screen.getByText("입력과 feedback 확인")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /영상 원본/ })).toHaveAttribute(
            "href",
            "/portfolio/project/demo.mp4"
        );
        expect(screen.getByRole("img", { name: "Gameplay demo" })).toHaveClass(
            "print:block"
        );
    });
});
