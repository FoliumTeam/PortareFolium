import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// 콘텐츠 렌더링 검증 — 블로그 글에서 MDX 렌더링 요소 확인
// 블로그 목록에서 첫 번째 글을 사용 (데이터 독립적)

test.describe.configure({ mode: "serial" });

// lightbox 대상 이미지 탐색
async function getVisibleLightboxImage(page: Page) {
    await expect
        .poll(
            async () =>
                page.locator(".post-content img[data-lightbox-idx]").count(),
            { timeout: 10_000 }
        )
        .toBeGreaterThan(0);

    const candidates = page.locator(".post-content img[data-lightbox-idx]");
    const count = await candidates.count();

    for (let i = 0; i < count; i += 1) {
        const candidate = candidates.nth(i);
        await candidate.scrollIntoViewIfNeeded();

        await expect
            .poll(
                async () =>
                    candidate.evaluate((el) =>
                        el instanceof HTMLImageElement
                            ? el.complete && el.naturalWidth > 0
                            : false
                    ),
                { timeout: 10_000 }
            )
            .toBe(true);

        return candidate;
    }

    return null;
}

// R2 pub-*.r2.dev 는 CI runner IP에서 Cloudflare abuse filter로 차단됨
// /_next/image optimization이 upstream fetch 실패로 400 반환 → 해당 pattern만 허용
// custom domain 전환 시 이 entry 제거 예정
function getR2ImageAllowPattern(): string | null {
    const raw = process.env.R2_PUBLIC_URL;
    if (!raw) return null;
    try {
        const host = new URL(raw).hostname;
        return `/_next/image?url=${encodeURIComponent(`https://${host}`)}`;
    } catch {
        return null;
    }
}

const ALLOWED_4XX_PATTERNS = [getR2ImageAllowPattern()].filter(
    (pattern): pattern is string => pattern !== null
);

// 브라우저 런타임 에러 수집
function trackRuntimeErrors(page: Page) {
    const runtimeErrors: string[] = [];

    page.on("pageerror", (error) => {
        runtimeErrors.push(`pageerror: ${error.message}`);
    });

    page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        // Chromium이 subresource 실패 시 뿌리는 generic console error는 URL 미포함
        // response hook이 이미 URL 기반으로 판단 + 필요시 기록하므로 중복 제거
        if (
            text.includes(
                "Failed to load resource: the server responded with a status of"
            )
        ) {
            return;
        }
        if (
            text.includes(
                "Permissions policy violation: compute-pressure is not allowed in this document."
            )
        ) {
            return;
        }
        runtimeErrors.push(`console: ${text}`);
    });

    page.on("response", (response) => {
        const status = response.status();
        if (status < 400) return;
        const url = response.url();
        if (ALLOWED_4XX_PATTERNS.some((pattern) => url.includes(pattern))) {
            return;
        }
        runtimeErrors.push(`http ${status}: ${url}`);
    });

    return runtimeErrors;
}

// button tooltip 검증
async function expectButtonTooltip(
    page: Page,
    button: Locator,
    tooltipText: string
) {
    await button.hover({ force: true });
    const tooltip = page
        .locator('[data-slot="tooltip-content"]')
        .filter({ hasText: tooltipText })
        .last();
    await expect(tooltip).toBeVisible();
    const className = await tooltip.getAttribute("class");
    expect(className).toContain("z-[130]");
}

test.describe("콘텐츠 렌더링", () => {
    let blogSlug: string | null = null;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await page.goto("/blog");
        await page.waitForLoadState("domcontentloaded");
        const firstLink = page.locator('a[href^="/blog/"]').first();
        await expect(firstLink).toBeVisible({ timeout: 10_000 });
        const href = await firstLink.getAttribute("href").catch(() => null);
        blogSlug = href;
        await page.close();
    });

    test("코드 블록 (Shiki) 하이라이팅", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!, { waitUntil: "domcontentloaded" });
        // Shiki가 렌더링한 코드 블록: pre > code with data-language
        const codeBlock = page.locator("pre code[data-language]");
        // 코드 블록이 없는 글일 수 있으므로 soft check
        const count = await codeBlock.count();
        if (count > 0) {
            await expect(codeBlock.first()).toBeVisible();
            const lang = await codeBlock.first().getAttribute("data-language");
            expect(lang).toBeTruthy();
        }
        expect(runtimeErrors).toEqual([]);
    });

    test("이미지 lazy loading", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!, { waitUntil: "domcontentloaded" });
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
        expect(runtimeErrors).toEqual([]);
    });

    test("lightbox open/close", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!, { waitUntil: "domcontentloaded" });
        const images = page.locator(".post-content img[data-lightbox-idx]");
        const count = await images.count();
        if (count === 0) return;

        const target = await getVisibleLightboxImage(page);
        expect(target).not.toBeNull();
        await target!.click({ force: true });
        const dialog = page.locator(
            '[role="dialog"][aria-label="이미지 확대 보기"]'
        );
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(`1 / ${count}`)).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        expect(runtimeErrors).toEqual([]);
    });

    test("lightbox navigation + filmstrip", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!);
        const images = page.locator(".post-content img[data-lightbox-idx]");
        const count = await images.count();
        if (count < 2) return;

        const target = await getVisibleLightboxImage(page);
        expect(target).not.toBeNull();
        await target!.click({ force: true });
        const dialog = page.locator(
            '[role="dialog"][aria-label="이미지 확대 보기"]'
        );
        await expect(dialog).toBeVisible();

        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "축소" }),
            "축소"
        );
        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "확대" }),
            "확대"
        );
        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "확대 초기화" }),
            "확대 초기화"
        );
        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "닫기" }),
            "닫기"
        );
        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "다음 이미지" }),
            "다음 이미지"
        );

        await dialog.getByRole("button", { name: "다음 이미지" }).click();
        await expect(dialog.getByText(`2 / ${count}`)).toBeVisible();
        await expectButtonTooltip(
            page,
            dialog.getByRole("button", { name: "이전 이미지" }),
            "이전 이미지"
        );

        const filmstripButtons = dialog.getByRole("button", {
            name: "filmstrip 이미지로 이동",
        });
        const filmstripCount = await filmstripButtons.count();
        expect(filmstripCount).toBeGreaterThan(0);

        const targetIndex = Math.min(1, filmstripCount - 1);
        await filmstripButtons.nth(targetIndex).click();
        await expect(dialog).toBeVisible();

        await dialog.locator("[data-lightbox-controls]").evaluate((element) => {
            element.dispatchEvent(
                new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                })
            );
        });
        await expect(dialog).toBeVisible();

        await dialog
            .locator("[data-lightbox-bottom-panel]")
            .evaluate((element) => {
                element.dispatchEvent(
                    new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                    })
                );
            });
        await expect(dialog).toBeVisible();

        await dialog
            .locator("[data-lightbox-filmstrip]")
            .evaluate((element) => {
                element.dispatchEvent(
                    new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                    })
                );
            });
        await expect(dialog).toBeVisible();

        await dialog.click({ position: { x: 10, y: 10 } });
        await expect(dialog).toBeHidden();
        expect(runtimeErrors).toEqual([]);
    });

    test("YouTube embed lightbox + play button", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        const response = await page.goto(
            "/blog/console-engine-project-2-review"
        );
        if (!response || response.status() >= 400) return;

        const youtubeTrigger = page.locator(
            '.post-content [data-lightbox-open="youtube"]'
        );
        const count = await youtubeTrigger.count();
        if (count === 0) return;

        await youtubeTrigger.first().click();
        const dialog = page.locator(
            '[role="dialog"][aria-label="이미지 확대 보기"]'
        );
        await expect(dialog).toBeVisible();

        const playButton = dialog.getByRole("button", { name: "영상 재생" });
        await expect(playButton).toBeVisible();
        await expectButtonTooltip(page, playButton, "영상 재생");
        await playButton.click();
        await expect(dialog.locator("iframe")).toBeVisible();
        expect(runtimeErrors).toEqual([]);
    });

    test("목차 (TOC) 생성", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!);
        // GithubToc 또는 TableOfContents 영역에 anchor 링크 존재
        const tocLinks = page.locator(
            'nav a[href^="#"], [class*="toc"] a[href^="#"]'
        );
        const count = await tocLinks.count();
        if (count > 0) {
            await expect(tocLinks.first()).toBeVisible();
        }
        expect(runtimeErrors).toEqual([]);
    });

    test("Mermaid 다이어그램 렌더링", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
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
        expect(runtimeErrors).toEqual([]);
    });

    test("KaTeX 수식 렌더링", async ({ page }) => {
        test.skip(!blogSlug, "블로그 글 없음");
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto(blogSlug!);
        // KaTeX 렌더링 결과: .katex 클래스 요소
        const katexElements = page.locator(".post-content .katex");
        const count = await katexElements.count();
        if (count > 0) {
            await expect(katexElements.first()).toBeVisible();
        }
        expect(runtimeErrors).toEqual([]);
    });
});
