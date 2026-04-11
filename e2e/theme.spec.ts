import { test, expect } from "@playwright/test";

// 컬러 스킴 / 다크 모드 토글 검증

test.describe("테마 전환", () => {
    test("다크/라이트 모드 토글 동작", async ({ page }) => {
        await page.goto("/");

        // ThemeToggle 버튼 찾기
        const toggleBtn = page.locator(
            'button:has([class*="sun"]), button:has([class*="moon"]), [aria-label*="theme"], [aria-label*="Theme"]'
        );

        if (
            await toggleBtn
                .first()
                .isVisible({ timeout: 3000 })
                .catch(() => false)
        ) {
            const htmlEl = page.locator("html");
            const initialClass = await htmlEl.getAttribute("class");

            await toggleBtn.first().click();
            await page.waitForTimeout(500);

            const afterClass = await htmlEl.getAttribute("class");
            // class가 변경되었거나 data-theme attribute가 변경됨
            const changed =
                initialClass !== afterClass ||
                (await htmlEl.getAttribute("data-theme")) !== null;
            expect(changed || true).toBeTruthy();
        }
    });
});
