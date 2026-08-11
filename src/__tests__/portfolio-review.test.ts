import { describe, expect, it } from "vitest";
import {
    getPortfolioReview,
    getPortfolioReviewDiff,
    getPublicPortfolioRow,
    preparePortfolioDraftSave,
    transitionPortfolioReview,
} from "@/lib/portfolio-review";
import type { PortfolioRawRow } from "@/types/portfolio";

const createRow = (
    overrides: Partial<PortfolioRawRow> = {}
): PortfolioRawRow => ({
    slug: "project",
    title: "Published title",
    description: "Published description",
    tags: ["C++"],
    thumbnail: "/portfolio/project/cover.webp",
    content: "Published content",
    data: { caseStudyVersion: 2 },
    featured: false,
    order_idx: 0,
    published: true,
    job_field: ["game"],
    ...overrides,
});

describe("portfolio review workflow", () => {
    it("Published 항목을 수정하면 공개본 스냅샷을 보존한 Draft가 된다", () => {
        const current = createRow();
        const draft = preparePortfolioDraftSave(
            current,
            createRow({ title: "Draft title", content: "Draft content" }),
            "2026-08-12T00:00:00.000Z"
        );

        expect(getPortfolioReview(draft.data).status).toBe("draft");
        expect(draft.published).toBe(true);
        expect(getPublicPortfolioRow(draft)?.title).toBe("Published title");
        expect(getPortfolioReviewDiff(draft)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: "제목",
                    previous: "Published title",
                    current: "Draft title",
                }),
            ])
        );
    });

    it("승인 후 Published 전환은 새 공개 스냅샷과 이력을 남긴다", () => {
        const draft = preparePortfolioDraftSave(
            null,
            createRow({ published: false, title: "Draft title" }),
            "2026-08-12T00:00:00.000Z"
        );
        const ready = transitionPortfolioReview(
            draft,
            "ready",
            "2026-08-12T00:01:00.000Z"
        );
        const approved = transitionPortfolioReview(
            ready,
            "approved",
            "2026-08-12T00:02:00.000Z"
        );
        const published = transitionPortfolioReview(
            approved,
            "published",
            "2026-08-12T00:03:00.000Z"
        );

        expect(published.published).toBe(true);
        expect(getPortfolioReview(published.data).status).toBe("published");
        expect(getPublicPortfolioRow(published)?.title).toBe("Draft title");
        expect(
            getPortfolioReview(published.data).history.map(
                (event) => event.status
            )
        ).toEqual(["ready", "approved", "published"]);
    });
});
