import { test, expect } from "@playwright/test";

// 반응형 레이아웃 검증 — 주요 breakpoint에서 레이아웃 깨짐 없는지 확인

const viewports = [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
] as const;

for (const vp of viewports) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test("홈 페이지 렌더링", async ({ page }) => {
            await page.goto("/");
            // 수평 스크롤바 없음 확인 (레이아웃 overflow 감지)
            const scrollWidth = await page.evaluate(
                () => document.documentElement.scrollWidth
            );
            const clientWidth = await page.evaluate(
                () => document.documentElement.clientWidth
            );
            expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        });

        test("Resume 페이지 렌더링", async ({ page }) => {
            await page.goto("/resume");
            const scrollWidth = await page.evaluate(
                () => document.documentElement.scrollWidth
            );
            const clientWidth = await page.evaluate(
                () => document.documentElement.clientWidth
            );
            expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        });

        test("Portfolio 페이지 렌더링", async ({ page }) => {
            await page.goto("/portfolio");
            const scrollWidth = await page.evaluate(
                () => document.documentElement.scrollWidth
            );
            const clientWidth = await page.evaluate(
                () => document.documentElement.clientWidth
            );
            expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        });
    });
}
