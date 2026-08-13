import { expect, test, type Page } from "@playwright/test";

const resumePaths = ["/web/resume", "/game/resume"] as const;
const profilePaths = ["/web", "/game"] as const;

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

for (const profilePath of profilePaths) {
    test(`${profilePath} 전체 공개 경로가 직무 분야를 유지`, async ({
        page,
    }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        const response = await page.goto(profilePath, {
            waitUntil: "domcontentloaded",
        });

        expect(response?.ok()).toBe(true);
        await expect(page.getByRole("main").first()).toBeVisible();
        await expect(
            page.getByRole("link", { name: "About me" })
        ).toHaveAttribute("href", `${profilePath}/about`);
        await expect(page.locator("#site-header a").first()).toHaveAttribute(
            "href",
            profilePath
        );

        await page.getByRole("link", { name: "About me" }).click();
        await expect(page).toHaveURL(`${profilePath}/about`);
        await expect(page.getByText("어떤 분야의")).toHaveCount(0);
        expect(runtimeErrors).toEqual([]);
    });
}
