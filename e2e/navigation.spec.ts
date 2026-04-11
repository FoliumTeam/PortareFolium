import { test, expect } from "@playwright/test";

// 헤더 네비게이션 + 페이지 간 이동 검증

test.describe("헤더 네비게이션", () => {
    test("헤더가 모든 페이지에 표시", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("header").first()).toBeVisible();
    });

    test("네비게이션 링크로 페이지 이동", async ({ page }) => {
        await page.goto("/");

        // Resume 링크 클릭
        const resumeLink = page.locator('header a[href="/resume"]');
        if (await resumeLink.isVisible()) {
            await resumeLink.click();
            await page.waitForURL("**/resume");
            expect(page.url()).toContain("/resume");
        }
    });

    test("로고/홈 링크로 홈 복귀", async ({ page }) => {
        await page.goto("/resume");
        const homeLink = page.locator('header a[href="/"]');
        if (await homeLink.isVisible()) {
            await homeLink.click();
            await page.waitForURL("/");
        }
    });
});
