import { test, expect } from "@playwright/test";

// 콘텐츠 렌더링 검증 — 블로그 글에서 MDX 렌더링 요소 확인
// 블로그 목록에서 첫 번째 글을 사용 (데이터 독립적)

test.describe("콘텐츠 렌더링", () => {
    let blogSlug: string | null = null;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await page.goto("/blog");
        const firstLink = page.locator('a[href^="/blog/"]').first();
        const href = await firstLink.getAttribute("href").catch(() => null);
        blogSlug = href;
        await page.close();
    });

    test("코드 블록 (Shiki) 하이라이팅", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        // Shiki가 렌더링한 코드 블록: pre > code with data-language
        const codeBlock = page.locator("pre code[data-language]");
        // 코드 블록이 없는 글일 수 있으므로 soft check
        const count = await codeBlock.count();
        if (count > 0) {
            await expect(codeBlock.first()).toBeVisible();
            const lang = await codeBlock.first().getAttribute("data-language");
            expect(lang).toBeTruthy();
        }
    });

    test("이미지 lazy loading", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        const images = page.locator(".post-content img");
        const count = await images.count();
        if (count > 0) {
            // 최소 하나의 이미지가 lazy loading
            const lazyImages = page.locator(
                '.post-content img[loading="lazy"]'
            );
            const lazyCount = await lazyImages.count();
            expect(lazyCount).toBeGreaterThan(0);
        }
    });

    test("lightbox open/close", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        const images = page.locator(".post-content img");
        const count = await images.count();
        if (count === 0) return;

        await images.first().click();
        const dialog = page.locator(
            '[role="dialog"][aria-label="이미지 확대 보기"]'
        );
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(`1 / ${count}`)).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    });

    test("lightbox navigation + filmstrip", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        const images = page.locator(".post-content img");
        const count = await images.count();
        if (count < 2) return;

        await images.first().click();
        const dialog = page.locator(
            '[role="dialog"][aria-label="이미지 확대 보기"]'
        );
        await expect(dialog).toBeVisible();

        await dialog.getByRole("button", { name: "다음 이미지" }).click();
        await expect(dialog.getByText(`2 / ${count}`)).toBeVisible();

        const filmstripButtons = dialog.getByRole("button", {
            name: "filmstrip 이미지로 이동",
        });
        const filmstripCount = await filmstripButtons.count();
        expect(filmstripCount).toBeGreaterThan(0);

        const targetIndex = Math.min(1, filmstripCount - 1);
        await filmstripButtons.nth(targetIndex).click();
        await expect(dialog).toBeVisible();

        await dialog.click({ position: { x: 10, y: 10 } });
        await expect(dialog).toBeHidden();
    });

    test("목차 (TOC) 생성", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        // GithubToc 또는 TableOfContents 영역에 anchor 링크 존재
        const tocLinks = page.locator(
            'nav a[href^="#"], [class*="toc"] a[href^="#"]'
        );
        const count = await tocLinks.count();
        if (count > 0) {
            await expect(tocLinks.first()).toBeVisible();
        }
    });

    test("Mermaid 다이어그램 렌더링", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        // Mermaid SVG 존재 여부 (해당 글에 Mermaid가 있을 때만)
        const mermaidSvg = page.locator(".post-content svg");
        const mermaidBlocks = page.locator(
            '.post-content pre code[class*="mermaid"], .post-content .mermaid'
        );
        const blockCount = await mermaidBlocks.count();
        if (blockCount > 0) {
            // Mermaid 블록이 있으면 SVG로 렌더링되어야 함
            await expect(mermaidSvg.first()).toBeVisible({ timeout: 10_000 });
        }
    });

    test("KaTeX 수식 렌더링", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        await page.goto(blogSlug!);
        // KaTeX 렌더링 결과: .katex 클래스 요소
        const katexElements = page.locator(".post-content .katex");
        const count = await katexElements.count();
        if (count > 0) {
            await expect(katexElements.first()).toBeVisible();
        }
    });
});
