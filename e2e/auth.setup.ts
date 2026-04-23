import { test as setup, expect } from "@playwright/test";

const authFile = ".auth/user.json";

setup("Admin 로그인 + storageState 저장", async ({ page }) => {
    const email = process.env.AUTH_ADMIN_EMAIL || process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "AUTH_ADMIN_EMAIL 또는 E2E_EMAIL, 그리고 E2E_PASSWORD 환경 변수가 필요"
        );
    }

    await page.goto("/admin/login");

    // 관리자 credentials 입력
    await page.getByPlaceholder("admin@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);

    // 로그인 버튼 클릭
    await page.getByRole("button", { name: /^로그인$/i }).click();

    // /admin 대시보드 진입 대기
    await expect(page).toHaveURL(/\/admin(?:#.*)?$/, { timeout: 15_000 });
    await expect(page.getByText(/admin 대시보드/i)).toBeVisible({
        timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /로그아웃/i })).toBeVisible({
        timeout: 15_000,
    });

    // authenticated route 사전 컴파일
    await page.goto("/resume", { waitUntil: "load" });
    await expect(
        page.getByRole("button", { name: /pdf 내보내기/i })
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/portfolio", { waitUntil: "load" });
    await expect(
        page.getByRole("button", { name: /pdf 내보내기/i })
    ).toBeVisible({ timeout: 15_000 });

    // storageState 저장
    await page.context().storageState({ path: authFile });
});
