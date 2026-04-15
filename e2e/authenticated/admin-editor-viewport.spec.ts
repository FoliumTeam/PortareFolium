import { test, expect } from "@playwright/test";

test.describe("Admin editor viewport fit", () => {
    test("Posts 편집 화면은 main 영역에 외곽 세로 스크롤이 없어야 함 (laptop viewport)", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto("/admin#posts");

        // 첫 번째 포스트 편집 진입 — 편집 버튼(`Pencil` icon)이 있는 행 클릭
        const editBtn = page
            .locator('button[aria-label="편집"], a[aria-label="편집"]')
            .first();
        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
        } else {
            // fallback: URL 직접 이동 (slug는 admin list에서 첫 행)
            await page.waitForSelector("[data-post-slug]", { timeout: 10_000 });
            const slug = await page
                .locator("[data-post-slug]")
                .first()
                .getAttribute("data-post-slug");
            if (slug) {
                await page.goto(`/admin#posts/edit/${slug}`);
            }
        }

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

        const editBtn = page
            .locator('button[aria-label="편집"], a[aria-label="편집"]')
            .first();
        if (await editBtn.isVisible().catch(() => false)) {
            await editBtn.click();
        } else {
            await page.waitForSelector("[data-portfolio-slug]", {
                timeout: 10_000,
            });
            const slug = await page
                .locator("[data-portfolio-slug]")
                .first()
                .getAttribute("data-portfolio-slug");
            if (slug) {
                await page.goto(`/admin#portfolio/edit/${slug}`);
            }
        }

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
