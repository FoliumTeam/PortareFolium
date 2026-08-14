import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
    PortfolioBoundary,
    PortfolioFeatureGrid,
    PortfolioFlow,
} from "@/components/portfolio/PortfolioShowcaseBlocks";

describe("Portfolio 사례 표현", () => {
    it("카드·책임 경계·흐름 컴포넌트를 HTML로 렌더링", () => {
        const html = renderToStaticMarkup(
            <>
                <PortfolioFeatureGrid items='[{"label":"핵심","title":"공통 규약","description":"여러 AI 도구 연결"}]' />
                <PortfolioBoundary
                    owned='["프로젝트 규약"]'
                    outside='["모델 실행"]'
                />
                <PortfolioFlow steps='[{"title":"구성","description":"작업 기준 정리"}]' />
            </>
        );

        expect(html).toContain("공통 규약");
        expect(html).toContain("관리 범위");
        expect(html).toContain("STEP");
        expect(html).toContain("01");
        expect(html).toContain("!text-white");
        expect(html).toContain("list-none");
        expect(html).toContain("text-base font-extrabold");
    });
});
