import { beforeEach, describe, expect, it, vi } from "vitest";

type TestRow = Record<string, unknown> & { id: string; slug: string };

const database = vi.hoisted(() => {
    const state = {
        rows: [] as TestRow[],
        writes: 0,
    };

    class QueryBuilder {
        private operation: "select" | "update" | "insert" | "delete" = "select";
        private payload: Record<string, unknown> | null = null;
        private filters: Array<
            | { kind: "eq"; key: string; value: unknown }
            | { kind: "in"; key: string; values: unknown[] }
        > = [];

        select() {
            return this;
        }

        update(payload: Record<string, unknown>) {
            this.operation = "update";
            this.payload = payload;
            return this;
        }

        insert(payload: Record<string, unknown>) {
            this.operation = "insert";
            this.payload = payload;
            return this;
        }

        delete() {
            this.operation = "delete";
            return this;
        }

        eq(key: string, value: unknown) {
            this.filters.push({ kind: "eq", key, value });
            return this;
        }

        in(key: string, values: unknown[]) {
            this.filters.push({ kind: "in", key, values });
            return this;
        }

        order() {
            return this;
        }

        neq() {
            return this;
        }

        private matches(row: TestRow): boolean {
            return this.filters.every((filter) =>
                filter.kind === "eq"
                    ? row[filter.key] === filter.value
                    : filter.values.includes(row[filter.key])
            );
        }

        private execute(single: boolean) {
            const matches = state.rows.filter((row) => this.matches(row));
            if (this.operation === "update" && this.payload) {
                state.rows = state.rows.map((row) =>
                    this.matches(row) ? { ...row, ...this.payload } : row
                );
                state.writes += 1;
            } else if (this.operation === "insert" && this.payload) {
                state.rows.push({
                    id: `row-${state.rows.length + 1}`,
                    slug: String(this.payload.slug),
                    ...this.payload,
                });
                state.writes += 1;
            } else if (this.operation === "delete") {
                state.rows = state.rows.filter((row) => !this.matches(row));
                state.writes += 1;
            }
            const refreshed = state.rows.filter((row) => this.matches(row));
            return {
                data: single ? (refreshed[0] ?? matches[0] ?? null) : refreshed,
                error: null,
            };
        }

        single() {
            return Promise.resolve(this.execute(true));
        }

        then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?:
                | ((value: unknown) => TResult1 | PromiseLike<TResult1>)
                | null,
            onrejected?:
                | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
                | null
        ) {
            return Promise.resolve(this.execute(false)).then(
                onfulfilled,
                onrejected
            );
        }
    }

    return {
        state,
        client: {
            from: () => new QueryBuilder(),
        },
    };
});

vi.mock("@/lib/supabase", () => ({ serverClient: database.client }));
vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/admin/actions/revalidate", () => ({
    revalidatePortfolioItem: vi.fn().mockResolvedValue(undefined),
}));

import {
    batchSetPortfolioPublished,
    savePortfolioItem,
    setPortfolioPublished,
} from "@/app/admin/actions/portfolio";

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

const validData = {
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
    links: [],
    devlogs: [],
    credits: [],
};

const createRow = (
    id: string,
    slug: string,
    data: Record<string, unknown>,
    published = false
): TestRow => ({
    id,
    slug,
    title: slug,
    description: null,
    tags: [],
    thumbnail: "/portfolio/project/cover.webp",
    content,
    data,
    featured: false,
    order_idx: 0,
    published,
    job_field: ["game"],
    meta_title: null,
    meta_description: null,
    og_image: null,
});

describe("portfolio server publication paths", () => {
    beforeEach(() => {
        database.state.rows = [];
        database.state.writes = 0;
    });

    it("savePortfolioItem은 invalid Published v2를 mutation 전에 차단", async () => {
        const result = await savePortfolioItem({
            slug: "invalid",
            title: "Invalid",
            description: null,
            tags: [],
            thumbnail: null,
            content: "",
            data: { caseStudyVersion: 2 },
            featured: false,
            order_idx: 0,
            published: true,
            job_field: "game",
            meta_title: null,
            meta_description: null,
            og_image: null,
        });

        expect(result.success).toBe(false);
        expect(database.state.writes).toBe(0);
    });

    it("savePortfolioItem은 valid Published v2를 저장", async () => {
        const result = await savePortfolioItem({
            slug: "valid",
            title: "Valid",
            description: null,
            tags: [],
            thumbnail: "/portfolio/project/cover.webp",
            content,
            data: validData,
            featured: true,
            order_idx: 0,
            published: true,
            job_field: "game",
            meta_title: null,
            meta_description: null,
            og_image: null,
        });

        expect(result.success).toBe(true);
        expect(database.state.rows[0]?.published).toBe(true);
    });

    it("setPortfolioPublished는 invalid v2를 차단하고 legacy를 허용", async () => {
        database.state.rows = [
            createRow("invalid", "invalid", { caseStudyVersion: 2 }),
            createRow("legacy", "legacy", { role: "Programmer" }),
        ];

        const invalid = await setPortfolioPublished("invalid", "invalid", true);
        const legacy = await setPortfolioPublished("legacy", "legacy", true);

        expect(invalid.success).toBe(false);
        expect(legacy.success).toBe(true);
        expect(database.state.rows[0]?.published).toBe(false);
        expect(database.state.rows[1]?.published).toBe(true);
    });

    it("batch Published는 한 항목이라도 invalid면 전체 mutation을 중단", async () => {
        database.state.rows = [
            createRow("valid", "valid", validData),
            createRow("invalid", "invalid", { caseStudyVersion: 2 }),
        ];

        const result = await batchSetPortfolioPublished(
            ["valid", "invalid"],
            true
        );

        expect(result.success).toBe(false);
        expect(database.state.writes).toBe(0);
        expect(
            database.state.rows.every((row) => row.published === false)
        ).toBe(true);
    });

    it("batch Published는 모든 항목이 valid면 한 번에 저장", async () => {
        database.state.rows = [
            createRow("one", "one", validData),
            createRow("two", "two", { role: "Programmer" }),
        ];

        const result = await batchSetPortfolioPublished(["one", "two"], true);

        expect(result.success).toBe(true);
        expect(database.state.rows.every((row) => row.published === true)).toBe(
            true
        );
    });
});
