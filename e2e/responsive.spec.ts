import { test, expect, type Page } from "@playwright/test";

// 반응형 레이아웃 검증 — 주요 breakpoint에서 레이아웃 깨짐 없는지 확인

const viewports = [
    { name: "small-mobile", width: 320, height: 720 },
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
] as const;

function trackRuntimeErrors(page: Page) {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
        if (message.type() === "error")
            errors.push(`console: ${message.text()}`);
    });
    return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1
    );
}

for (const vp of viewports) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test("홈 페이지 렌더링", async ({ page }) => {
            const runtimeErrors = trackRuntimeErrors(page);
            await page.goto("/", { waitUntil: "domcontentloaded" });
            await expectNoHorizontalOverflow(page);
            expect(runtimeErrors).toEqual([]);
        });

        test("Resume 페이지 렌더링", async ({ page }) => {
            const runtimeErrors = trackRuntimeErrors(page);
            await page.goto("/resume", { waitUntil: "domcontentloaded" });
            await expectNoHorizontalOverflow(page);
            expect(runtimeErrors).toEqual([]);
        });

        test("Portfolio 페이지 렌더링", async ({ page }) => {
            const runtimeErrors = trackRuntimeErrors(page);
            await page.goto("/portfolio", { waitUntil: "networkidle" });
            await expectNoHorizontalOverflow(page);
            expect(runtimeErrors).toEqual([]);
        });

        test("Portfolio 상세 페이지 렌더링", async ({ page }) => {
            const runtimeErrors = trackRuntimeErrors(page);
            await page.goto("/portfolio", { waitUntil: "networkidle" });
            const firstCaseStudy = page
                .getByRole("link", {
                    name: /프로젝트 기록 보기$/,
                })
                .first();
            await expect(firstCaseStudy).toBeVisible();
            const href = await firstCaseStudy.getAttribute("href");
            expect(href).toMatch(/^\/portfolio\//);
            await page.goto(href!, { waitUntil: "domcontentloaded" });
            await expectNoHorizontalOverflow(page);
            expect(runtimeErrors).toEqual([]);
        });
    });
}
