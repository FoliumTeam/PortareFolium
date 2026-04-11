import { test, expect } from "@playwright/test";

// SEO 메타데이터 + 접근성 기본 검증

test.describe("SEO 메타데이터", () => {
    const pages = [
        { path: "/", title: "Home" },
        { path: "/resume", title: "Resume" },
        { path: "/portfolio", title: "Portfolio" },
        { path: "/blog", title: "Blog" },
        { path: "/about", title: "About" },
    ];

    for (const { path, title } of pages) {
        test(`${path} — title 존재`, async ({ page }) => {
            await page.goto(path);
            const pageTitle = await page.title();
            expect(pageTitle.length).toBeGreaterThan(0);
        });
    }

    test("메타 description 존재 (홈)", async ({ page }) => {
        await page.goto("/");
        const desc = page.locator('meta[name="description"]');
        await expect(desc).toHaveAttribute("content", /.+/);
    });

    test("viewport 메타 태그 존재", async ({ page }) => {
        await page.goto("/");
        const viewport = page.locator('meta[name="viewport"]');
        await expect(viewport).toHaveAttribute("content", /width/);
    });
});

test.describe("접근성 기본 검증", () => {
    test("이미지에 alt 속성 존재", async ({ page }) => {
        await page.goto("/resume");
        const images = page.locator("img");
        const count = await images.count();
        for (let i = 0; i < count; i++) {
            const alt = await images.nth(i).getAttribute("alt");
            // alt 속성이 존재 (빈 문자열 허용 — decorative 이미지)
            expect(alt).not.toBeNull();
        }
    });

    test("html lang 속성 존재", async ({ page }) => {
        await page.goto("/");
        const lang = await page.locator("html").getAttribute("lang");
        expect(lang).toBeTruthy();
    });
});
