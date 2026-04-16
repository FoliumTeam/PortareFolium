import { test, expect } from "@playwright/test";

test.describe("Admin editor viewport fit", () => {
    test("Posts 편집 화면은 main 영역에 외곽 세로 스크롤이 없어야 함 (laptop viewport)", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto("/admin#posts");

        // posts list 안정화 대기
        await page.waitForLoadState("networkidle");

        // 편집 버튼 텍스트 기반 탐색 (PostsPanel 목록 행의 편집 버튼)
        const editBtn = page.locator("button:has-text('편집')").first();
        const hasEditBtn = await editBtn.isVisible().catch(() => false);

        // 빈 DB CI 환경에서는 editor viewport 검증 대상 없음 skip
        test.skip(!hasEditBtn, "No posts available in admin list");

        await editBtn.click();

        // 에디터 로드 대기
        await page.waitForSelector(".ProseMirror, [contenteditable='true']", {
            timeout: 15_000,
        });
        await page.waitForTimeout(500);

        // 외곽 세로 스크롤 없음 검증 (main tablet:overflow-hidden 효과)
        const overflowDelta = await page.evaluate(() => {
            return document.body.scrollHeight - window.innerHeight;
        });
        expect(overflowDelta).toBeLessThanOrEqual(2);
    });

    test("Portfolio 편집 화면도 main 영역에 외곽 세로 스크롤이 없어야 함", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto("/admin#portfolio");

        await page.waitForLoadState("networkidle");

        const editBtn = page.locator("button:has-text('편집')").first();
        const hasEditBtn = await editBtn.isVisible().catch(() => false);

        test.skip(!hasEditBtn, "No portfolio items available in admin list");

        await editBtn.click();

        await page.waitForSelector(".ProseMirror, [contenteditable='true']", {
            timeout: 15_000,
        });
        await page.waitForTimeout(500);

        const overflowDelta = await page.evaluate(() => {
            return document.body.scrollHeight - window.innerHeight;
        });
        expect(overflowDelta).toBeLessThanOrEqual(2);
    });
});
