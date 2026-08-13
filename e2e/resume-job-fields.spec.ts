import { expect, test, type Page } from "@playwright/test";

const resumePaths = ["/web/resume", "/game/resume"] as const;

const trackRuntimeErrors = (page: Page) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(`console: ${message.text()}`);
        }
    });
    return errors;
};

for (const resumePath of resumePaths) {
    test(`${resumePath} 공개 이력서 렌더링`, async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        const response = await page.goto(resumePath, {
            waitUntil: "domcontentloaded",
        });

        expect(response?.ok()).toBe(true);
        await expect(page.getByRole("main").first()).toBeVisible();
        expect(runtimeErrors).toEqual([]);
    });
}
