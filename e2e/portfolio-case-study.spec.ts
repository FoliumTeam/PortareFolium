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
    await page.goto("/portfolio", { waitUntil: "networkidle" });

    await expect(
        page.getByRole("heading", { name: "Portfolio" })
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
    await expect(page).toHaveURL(/\/portfolio\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test("상세 페이지는 TOC landmark를 최대 하나만 렌더하고 legacy 기록을 접음", async ({
    page,
}) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await page.goto("/portfolio", { waitUntil: "networkidle" });
    const href = await page
        .getByRole("link", { name: /프로젝트 기록 보기$/ })
        .first()
        .getAttribute("href");
    await page.goto(href!, { waitUntil: "domcontentloaded" });

    const legacyDisclosure = page.getByText("전체 기술 기록 펼치기", {
        exact: true,
    });
    if ((await legacyDisclosure.count()) > 0) {
        const details = legacyDisclosure.locator("..");
        await expect(details).not.toHaveAttribute("open", "");
        await legacyDisclosure.click();
        await expect(details).toHaveAttribute("open", "");
    }

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
