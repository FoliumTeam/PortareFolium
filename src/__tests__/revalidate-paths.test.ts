import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: mocks.requireAdminSession,
}));

import {
    revalidateAbout,
    revalidatePortfolioItem,
    revalidatePost,
    revalidateResume,
} from "@/app/admin/actions/revalidate";

describe("직무별 공개 경로 cache revalidation", () => {
    beforeEach(() => {
        mocks.revalidatePath.mockClear();
        mocks.requireAdminSession.mockClear();
    });

    it("Portfolio 상세와 목록의 legacy·web·game 경로를 갱신한다", async () => {
        await revalidatePortfolioItem("its-api");

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/portfolio/its-api",
            "/portfolio",
            "/web/portfolio/its-api",
            "/web/portfolio",
            "/web",
            "/game/portfolio/its-api",
            "/game/portfolio",
            "/game",
            "/",
        ]);
    });

    it("Blog 상세와 목록의 legacy·web·game 경로를 갱신한다", async () => {
        await revalidatePost("example-post");

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/blog/example-post",
            "/blog",
            "/web/blog/example-post",
            "/web/blog",
            "/game/blog/example-post",
            "/game/blog",
            "/",
        ]);
    });

    it("Resume의 legacy·web·game 경로를 갱신한다", async () => {
        await revalidateResume();

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/resume",
            "/web/resume",
            "/game/resume",
        ]);
    });

    it("About Me와 직무별 landing 경로를 갱신한다", async () => {
        await revalidateAbout();

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/about",
            "/web/about",
            "/web",
            "/game/about",
            "/game",
            "/",
        ]);
    });
});
