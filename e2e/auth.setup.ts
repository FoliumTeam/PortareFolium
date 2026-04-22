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

    // E2E credentials 입력
    await page.locator("#e2e-email").fill(email);
    await page.locator("#e2e-password").fill(password);

    // 테스트 로그인 버튼 클릭
    await page.getByRole("button", { name: /테스트 계정으로 로그인/i }).click();

    // /admin으로 리다이렉트 대기
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    // storageState 저장
    await page.context().storageState({ path: authFile });
});
