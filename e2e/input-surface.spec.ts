import { expect, test } from "@playwright/test";

test("text input surface는 주변 page background와 구분", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    const input = page.locator("#admin-email");
    await expect(input).toBeVisible();

    const colors = await input.evaluate((element) => ({
        input: getComputedStyle(element).backgroundColor,
        page: getComputedStyle(document.body).backgroundColor,
    }));
    expect(colors.input).not.toBe(colors.page);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
