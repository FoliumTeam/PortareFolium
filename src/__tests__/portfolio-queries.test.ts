import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => {
    const calls: Array<{ key: string; value: unknown }> = [];
    const createBuilder = () => {
        const builder = {
            select: () => builder,
            eq: (key: string, value: unknown) => {
                calls.push({ key, value });
                return builder;
            },
            single: () => Promise.resolve({ data: null, error: null }),
            then: (
                onfulfilled?: ((value: unknown) => unknown) | null,
                onrejected?: ((reason: unknown) => unknown) | null
            ) =>
                Promise.resolve({ data: [], error: null }).then(
                    onfulfilled,
                    onrejected
                ),
        };
        return builder;
    };
    return {
        calls,
        client: { from: () => createBuilder() },
    };
});

vi.mock("@/lib/supabase", () => ({ serverClient: queryMock.client }));
vi.mock("@/lib/post-content-chunks", () => ({
    readPostContentById: vi.fn(),
}));

import {
    getAllPortfolioSlugs,
    getPortfolioItem,
    getPortfolioItemMeta,
} from "@/lib/queries";

describe("public portfolio queries", () => {
    beforeEach(() => {
        queryMock.calls.length = 0;
    });

    it.each([
        ["item", () => getPortfolioItem("draft")],
        ["metadata", () => getPortfolioItemMeta("draft")],
        ["static params", () => getAllPortfolioSlugs()],
    ])("%s query가 unpublished row를 제외", async (_label, run) => {
        await run();
        expect(queryMock.calls).toContainEqual({
            key: "published",
            value: true,
        });
    });
});
