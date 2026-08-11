import { expect, test, type Page } from "@playwright/test";

function trackRuntimeErrors(page: Page) {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(`console: ${message.text()}`);
        }
    });
    return errors;
}

test("web Portfolio 카드 본문 클릭은 프로젝트 기록으로 이동", async ({
    page,
}) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await page.goto("/web/portfolio", { waitUntil: "networkidle" });
    const projectRecord = page
        .getByRole("link", { name: /프로젝트 기록 보기$/ })
        .first();
    const card = projectRecord.locator("..");
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    await card.click({
        position: { x: cardBox!.width - 24, y: cardBox!.height / 2 },
    });
    await expect(page).toHaveURL(/\/web\/portfolio\/[^/]+$/);
    expect(runtimeErrors).toEqual([]);
});

test("web Resume 프로젝트 카드 본문 클릭은 프로젝트 기록으로 이동", async ({
    page,
}) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await page.goto("/web/resume", { waitUntil: "networkidle" });
    const projectRecord = page
        .getByRole("link", { name: /프로젝트 기록 보기$/ })
        .first();
    const card = projectRecord.locator("..");
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    await card.click({
        position: { x: cardBox!.width - 24, y: cardBox!.height / 2 },
    });
    await expect(page).toHaveURL(/\/web\/portfolio\/[^/]+$/);
    expect(runtimeErrors).toEqual([]);
});
