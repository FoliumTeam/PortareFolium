import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    requireAdminSession: vi.fn().mockResolvedValue(undefined),
    getPublicJobFields: vi.fn().mockResolvedValue([
        { id: "frontend", name: "Frontend", emoji: "🖥️" },
        { id: "game-design", name: "Game Design", emoji: "🎮" },
    ]),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/public-job-field", () => ({
    getPublicJobFields: mocks.getPublicJobFields,
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

    it("Portfolio 상세와 목록의 등록 직무 분야 경로를 갱신한다", async () => {
        await revalidatePortfolioItem("its-api");

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/portfolio/its-api",
            "/portfolio",
            "/frontend/portfolio/its-api",
            "/frontend/portfolio",
            "/frontend",
            "/game-design/portfolio/its-api",
            "/game-design/portfolio",
            "/game-design",
            "/",
        ]);
    });

    it("Blog 상세와 목록의 등록 직무 분야 경로를 갱신한다", async () => {
        await revalidatePost("example-post");

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/blog/example-post",
            "/blog",
            "/frontend/blog/example-post",
            "/frontend/blog",
            "/frontend",
            "/game-design/blog/example-post",
            "/game-design/blog",
            "/game-design",
            "/",
        ]);
    });

    it("Resume의 등록 직무 분야 경로를 갱신한다", async () => {
        await revalidateResume();

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/resume",
            "/frontend/resume",
            "/frontend",
            "/game-design/resume",
            "/game-design",
        ]);
    });

    it("About Me와 등록 직무 분야 landing 경로를 갱신한다", async () => {
        await revalidateAbout();

        expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
            "/about",
            "/frontend/about",
            "/frontend",
            "/game-design/about",
            "/game-design",
            "/",
        ]);
    });
});
