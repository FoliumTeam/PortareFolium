import { test as setup, expect } from "@playwright/test";

const authFile = ".auth/user.json";

setup("Admin 로그인 + storageState 저장", async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "E2E_EMAIL / E2E_PASSWORD 환경 변수가 설정되지 않음. .env.local 확인 필요"
        );
    }

    await page.goto("/admin/login");

    // 이메일/패스워드 입력 (id="email", id="password")
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    // 로그인 버튼 클릭
    await page.getByRole("button", { name: /로그인/i }).click();

    // /admin으로 리다이렉트 대기
    await page.waitForURL("**/admin", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin/);

    // storageState 저장
    await page.context().storageState({ path: authFile });
});
