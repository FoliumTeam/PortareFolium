import { expect, test, type Page } from "@playwright/test";

function trackRuntimeErrors(page: Page) {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
        if (message.type() === "error")
            errors.push(`console: ${message.text()}`);
    });
    return errors;
}

test("Portfolio 카드 전체 클릭으로 프로젝트 기록에 이동하고 keyboard focus가 표시", async ({
    page,
}) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await page.goto("/web/portfolio", { waitUntil: "networkidle" });

    await expect(
        page.getByRole("heading", { level: 1, name: "Portfolio" })
    ).toBeVisible();
    const projectRecord = page
        .getByRole("link", { name: /프로젝트 기록 보기$/ })
        .first();
    await expect(projectRecord).toBeVisible();
    await projectRecord.focus();
    await expect(projectRecord).toBeFocused();
    const focusVisible = await projectRecord.evaluate((element) =>
        element.matches(":focus-visible")
    );
    expect(focusVisible).toBe(true);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/web\/portfolio\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test("상세 페이지는 TOC landmark를 최대 하나만 렌더하고 이전 기록도 바로 표시", async ({
    page,
}) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await page.goto("/web/portfolio/ai-model-files", {
        waitUntil: "domcontentloaded",
    });

    await expect(page.locator(".portfolio-legacy-content")).toBeVisible();
    await expect(
        page.getByText("전체 기술 기록 펼치기", { exact: true })
    ).toHaveCount(0);

    expect(
        await page.getByRole("navigation", { name: "목차" }).count()
    ).toBeLessThanOrEqual(1);

    const galleryImage = page.locator(".portfolio-gallery img").first();
    if ((await galleryImage.count()) > 0) {
        await galleryImage.click();
        await expect(
            page.getByRole("dialog", { name: "이미지 확대 보기" })
        ).toBeVisible();
        await page.keyboard.press("Escape");
    }
    expect(runtimeErrors).toEqual([]);
});

test("tablet 이상 Portfolio 목차는 우측 중앙에 고정", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/web/portfolio/portare-folium", {
        waitUntil: "domcontentloaded",
    });

    const toc = page.getByRole("navigation", { name: "목차" });
    const article = page.locator(".portfolio-case-study-content");
    await expect(toc).toBeVisible();
    await expect(article).toBeVisible();
    const initialTocBox = await toc.boundingBox();
    const articleBox = await article.boundingBox();
    expect(initialTocBox).not.toBeNull();
    expect(articleBox).not.toBeNull();
    expect(initialTocBox!.y).toBeGreaterThanOrEqual(articleBox!.y - 1);

    const galleryImages = page.locator(".portfolio-gallery img");
    await expect(galleryImages).toHaveCount(4);
    await galleryImages.first().scrollIntoViewIfNeeded();
    await expect
        .poll(() =>
            galleryImages.evaluateAll((images) =>
                images.every(
                    (image) =>
                        (image as HTMLImageElement).complete &&
                        (image as HTMLImageElement).naturalWidth > 0
                )
            )
        )
        .toBe(true);

    await galleryImages.first().click();
    const filmstripImages = page.locator(
        'button[aria-label="filmstrip 이미지로 이동"] img'
    );
    await expect(filmstripImages.first()).toBeVisible();
    await expect
        .poll(() =>
            filmstripImages.evaluateAll((images) =>
                images.every(
                    (image) =>
                        (image as HTMLImageElement).complete &&
                        (image as HTMLImageElement).naturalWidth > 0
                )
            )
        )
        .toBe(true);
    await page.keyboard.press("Escape");

    await page
        .getByRole("heading", {
            name: "관리자 화면으로 운영하는 콘텐츠 플랫폼",
        })
        .scrollIntoViewIfNeeded();

    await expect(page.locator("[data-toc-sticky]")).toHaveCSS(
        "position",
        "sticky"
    );
    const tocBox = await toc.boundingBox();
    expect(tocBox).not.toBeNull();
    expect(Math.abs(tocBox!.y + tocBox!.height / 2 - 400)).toBeLessThan(8);
});
