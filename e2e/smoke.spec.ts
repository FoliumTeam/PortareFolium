import { test, expect } from "@playwright/test";

// 프론트엔드 주요 페이지 로딩 + 핵심 요소 확인
// 데이터 비의존적 — DB 연결 없이도 페이지 자체가 렌더링되는지 검증

test.describe("페이지 로딩 스모크 테스트", () => {
    test("홈 페이지 로딩", async ({ page }) => {
        const response = await page.goto("/");
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();
    });

    test("Resume 페이지 로딩", async ({ page }) => {
        const response = await page.goto("/resume");
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();
    });

    test("Portfolio 페이지 로딩", async ({ page }) => {
        const response = await page.goto("/portfolio");
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();
    });

    test("Blog 페이지 로딩", async ({ page }) => {
        const response = await page.goto("/blog");
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();
    });

    test("About 페이지 로딩", async ({ page }) => {
        const response = await page.goto("/about");
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();
    });

    test("존재하지 않는 페이지 → 404", async ({ page }) => {
        const response = await page.goto("/nonexistent-page-12345");
        expect(response?.status()).toBe(404);
    });
});
