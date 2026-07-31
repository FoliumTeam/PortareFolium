import { describe, expect, it } from "vitest";
import {
    handleGetSchema,
    prepareMcpPortfolioCreate,
    prepareMcpPortfolioUpdate,
} from "@/lib/mcp-tools";
import type { PortfolioRawRow } from "@/types/portfolio";

const content = `## Rendering
### Problem
Problem
### Decision
Decision
### Implementation
Implementation
### Result
Result
### Trade-off
Trade-off

## Performance
### Problem
Problem
### Decision
Decision
### Implementation
Implementation
### Result
Result
### Trade-off
Trade-off`;

const current: PortfolioRawRow = {
    slug: "project",
    title: "Project",
    description: "Description",
    tags: ["C++"],
    thumbnail: "/portfolio/project/cover.webp",
    content,
    featured: false,
    order_idx: 4,
    published: false,
    job_field: "game",
    data: {
        caseStudyVersion: 2,
        oneLinePitch: "Pitch",
        engine: "Custom Engine",
        platforms: ["Windows"],
        ownership: ["Renderer 구현"],
        outcomes: [{ result: "Playable build" }],
        gallery: [
            {
                type: "image",
                src: "/portfolio/project/proof.webp",
                alt: "Proof",
            },
        ],
        links: [
            {
                kind: "release",
                url: "https://example.com/release",
                label: "Release",
            },
        ],
        devlogs: [],
        credits: [],
        role: "Programmer",
        futureKey: { nested: { keep: true } },
    },
};

describe("MCP portfolio contract", () => {
    it("create는 기본 Draft이며 row key와 data를 분리", () => {
        const prepared = prepareMcpPortfolioCreate({
            slug: "draft",
            title: "Draft",
            featured: true,
            order_idx: 2,
            data: {
                caseStudyVersion: 2,
                featured: false,
                order_idx: 99,
                published: true,
                title: "Nested title",
                oneLinePitch: "Draft pitch",
                futureKey: "keep",
            },
        });

        expect(prepared.published).toBe(false);
        expect(prepared.featured).toBe(true);
        expect(prepared.order_idx).toBe(2);
        expect(prepared.data).toEqual({
            caseStudyVersion: 2,
            oneLinePitch: "Draft pitch",
            futureKey: "keep",
        });
    });

    it("omitted data는 update payload에서 제외", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            title: "Renamed",
        });
        expect(prepared.updateFields).toEqual({ title: "Renamed" });
        expect(prepared.finalRow.data).toEqual(current.data);
    });

    it("known null 삭제, shallow replacement, unknown null 보존", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            data: {
                role: null,
                outcomes: [{ result: "Replaced" }],
                futureKey: null,
                anotherFutureKey: { enabled: true },
                published: true,
            },
        });

        const data = prepared.finalRow.data ?? {};
        expect(data).not.toHaveProperty("role");
        expect(data.outcomes).toEqual([{ result: "Replaced" }]);
        expect(data.futureKey).toEqual({ nested: { keep: true } });
        expect(data.anotherFutureKey).toEqual({ enabled: true });
        expect(data).not.toHaveProperty("published");
        expect(prepared.finalRow.published).toBe(false);
    });

    it("불완전한 v2 Published create와 update를 차단", () => {
        expect(() =>
            prepareMcpPortfolioCreate({
                slug: "invalid",
                title: "Invalid",
                published: true,
                data: { caseStudyVersion: 2 },
            })
        ).toThrow(/한 줄 소개/);

        expect(() =>
            prepareMcpPortfolioUpdate(current, {
                published: true,
                data: { engine: null },
            })
        ).toThrow(/Engine/);
    });

    it("완전한 v2 Published update와 Release link를 유지", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            published: true,
        });
        expect(prepared.updateFields.published).toBe(true);
        expect(prepared.finalRow.published).toBe(true);
        expect(
            (prepared.finalRow.data?.links as Array<{ kind: string }>)[0]?.kind
        ).toBe("release");
    });

    it("get_schema가 v2 key와 enum을 같은 이름으로 제공", async () => {
        const schema = (await handleGetSchema()) as {
            portfolio_items: {
                data: Record<string, unknown>;
                v2_content: string;
            };
        };
        expect(schema.portfolio_items.data).toHaveProperty("caseStudyVersion");
        expect(schema.portfolio_items.data).toHaveProperty("gallery");
        expect(schema.portfolio_items.v2_content).toContain("Trade-off");
    });
});
