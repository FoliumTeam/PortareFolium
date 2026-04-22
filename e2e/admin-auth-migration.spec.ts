import { expect, test } from "@playwright/test";

test.describe("Admin auth migration", () => {
    test("공개 페이지에 로그인 버튼 비노출", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("link", { name: "로그인" })).toHaveCount(0);
    });

    test("legacy 계정 로그인 시 migration 화면으로 이동", async ({ page }) => {
        const email = process.env.E2E_EMAIL;
        const password = process.env.E2E_PASSWORD;
        const adminEmails =
            process.env.AUTH_ADMIN_EMAILS?.split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean) ?? [];

        test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD 필요");
        test.skip(
            !adminEmails.includes(email!.toLowerCase()),
            "legacy migration 테스트용 관리자 이메일 allowlist 필요"
        );

        await page.goto("/admin/login");
        await page.getByPlaceholder("admin@example.com").fill(email!);
        await page.getByPlaceholder("••••••••").first().fill(password!);
        await page
            .getByRole("button", { name: /기존 계정으로 로그인/i })
            .click();

        await expect(page).toHaveURL(/\/admin\/migrate/, { timeout: 15_000 });
        await expect(page.getByText(/계정 전환/)).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Google로 전환/i })
        ).toBeVisible();
    });
});
