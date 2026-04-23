import { expect, test } from "@playwright/test";

test.describe("Admin login", () => {
    test("공개 페이지에 로그인 버튼 비노출", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("link", { name: "로그인" })).toHaveCount(0);
    });

    test("admin login 화면에 credentials 로그인 폼 표시", async ({ page }) => {
        await page.goto("/admin/login");
        await expect(
            page.getByText(/email\/password 기반 관리자 로그인/i)
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /^로그인$/i })
        ).toBeVisible();
        await expect(page.getByPlaceholder("admin@example.com")).toBeVisible();
        await expect(
            page.getByText(/관리자 계정으로 로그인하세요/i)
        ).toBeVisible();
    });
});
