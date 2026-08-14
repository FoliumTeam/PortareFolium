import { expect, test } from "@playwright/test";

test("Resume 관리자에서 핵심 역량 Markdown 표시를 전환한다", async ({
    page,
}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });

    const coreCompetenciesSection = page.locator(
        '[data-resume-section="coreCompetencies"]'
    );
    const markdownToggle = coreCompetenciesSection
        .getByRole("button", { name: "Markdown", exact: true })
        .first();

    await expect(markdownToggle).toBeVisible();
    const before = await markdownToggle.getAttribute("aria-pressed");
    expect(before).toMatch(/^(true|false)$/);

    await markdownToggle.click();
    await expect(markdownToggle).toHaveAttribute(
        "aria-pressed",
        before === "true" ? "false" : "true"
    );
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
