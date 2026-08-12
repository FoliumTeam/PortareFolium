import { describe, expect, it } from "vitest";
import {
    handleGetSchema,
    prepareMcpPortfolioCreate,
    prepareMcpPortfolioUpdate,
} from "@/lib/mcp-tools";
import type { PortfolioRawRow } from "@/types/portfolio";

const content = `## Rendering
### 목표와 제약
Goal
### 내 역할
Contribution
### 핵심 구현
Build
### 게임 효과
Result

## Performance
### 목표와 제약
Goal
### 내 역할
Contribution
### 핵심 구현
Build
### 게임 효과
Result`;

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
    it("create는 즉시 Published이며 row key와 data를 분리", () => {
        const prepared = prepareMcpPortfolioCreate({
            slug: "draft",
            title: "Draft",
            featured: true,
            order_idx: 2,
            job_field: "game",
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

        expect(prepared.published).toBe(true);
        expect(prepared.featured).toBe(true);
        expect(prepared.order_idx).toBe(2);
        expect(prepared.job_field).toEqual(["game"]);
        expect(prepared.data).toMatchObject({
            caseStudyVersion: 2,
            oneLinePitch: "Draft pitch",
            futureKey: "keep",
        });
    });

    it("omitted data는 update payload에서 제외", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            title: "Renamed",
        });
        expect(prepared.updateFields).toMatchObject({
            title: "Renamed",
            published: true,
        });
        expect(prepared.finalRow.data).toMatchObject(current.data ?? {});
    });

    it("update 직무 분야는 Supabase text[] 계약으로 변환", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            job_field: "game",
        });
        expect(prepared.updateFields.job_field).toEqual(["game"]);
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
        expect(prepared.finalRow.published).toBe(true);
    });

    it("MCP update는 Release link를 유지하며 즉시 공개한다", () => {
        const prepared = prepareMcpPortfolioUpdate(current, {
            title: "Renamed",
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
        expect(schema.portfolio_items.v2_content).toContain("목표와 제약");
    });
});
