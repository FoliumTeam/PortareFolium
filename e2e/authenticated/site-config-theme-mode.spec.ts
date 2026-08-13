import { expect, test } from "@playwright/test";

test("Admin Config에서 화면 모드 정책을 라이트 고정으로 저장", async ({
    page,
}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin#config");

    await expect(
        page.getByRole("heading", { name: "화면 모드" })
    ).toBeVisible();

    const lightMode = page.getByRole("radio", { name: /라이트 고정/ });
    const darkMode = page.getByRole("radio", { name: /다크 고정/ });
    const systemMode = page.getByRole("radio", { name: /시스템 따름/ });

    await expect(lightMode).toBeVisible();
    await expect(darkMode).toBeVisible();
    await expect(systemMode).toBeVisible();

    await page
        .locator('label:has(input[name="theme-mode"][value="dark"])')
        .click();
    await expect(darkMode).toBeChecked();
    await page
        .locator('label:has(input[name="theme-mode"][value="light"])')
        .click();
    await expect(lightMode).toBeChecked();
    await page.getByRole("button", { name: "설정 저장" }).click();
    await expect(page.getByText(/설정이 저장됐습니다/)).toBeVisible();

    await page.goto("/web/resume");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
