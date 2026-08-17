import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AwardsSection from "@/components/resume/AwardsSection";

describe("AwardsSection", () => {
    it("수상 정보와 A4 이미지 슬롯이 있는 단일 행 카드를 렌더링", () => {
        const html = renderToStaticMarkup(
            <AwardsSection
                label="수상"
                awards={[
                    {
                        title: "게임 개발 트랙 최종 프로젝트 - 동상",
                        awarder: "원티드",
                        date: "2026-07",
                        summary: "프로젝트 결과와 협업 역량을 인정받았습니다.",
                    },
                ]}
                dataPdfBlock
            />
        );

        expect(html).toContain("space-y-4");
        expect(html).toContain("aspect-[210/297]");
        expect(html).toContain("/images/sample-award-certificate.png");
        expect(html).toContain("2026-07");
        expect(html).toContain("동상");
        expect(html).not.toContain("게임 개발 트랙 최종 프로젝트 - 동상");
        expect(html).toContain("원티드");
        expect(html).toContain("border-l-2");
    });

    it("수상 항목이 없으면 섹션을 렌더링하지 않음", () => {
        expect(
            renderToStaticMarkup(<AwardsSection label="수상" awards={[]} />)
        ).toBe("");
    });
});
