import { test, expect } from "@playwright/test";

test.describe("PDF Export — Resume", () => {
    test("PDF 내보내기 버튼 표시 (인증 상태)", async ({ page }) => {
        await page.goto("/resume");
        const exportBtn = page.getByRole("button", { name: /pdf 내보내기/i });
        await expect(exportBtn).toBeVisible({ timeout: 10_000 });
    });

    test("PDF 프리뷰 모달 열림 + 기본 UI 확인", async ({ page }) => {
        await page.goto("/resume");
        await page.getByRole("button", { name: /pdf 내보내기/i }).click();

        // 모달 사이드바 표시
        const sidebar = page.locator("h2:text('PDF 내보내기')");
        await expect(sidebar).toBeVisible({ timeout: 10_000 });

        // 컬러 스킴 드롭다운 표시
        await expect(page.locator("text=Color Scheme")).toBeVisible();

        // 페이지 수 표시
        await expect(page.getByText("Pages", { exact: true })).toBeVisible();
        await expect(page.getByText(/\d+\s*pages?/)).toBeVisible();

        // 다운로드 버튼 표시
        await expect(
            page.getByRole("button", { name: /pdf 다운로드/i })
        ).toBeVisible();
    });

    test("페이지 구분선 존재", async ({ page }) => {
        await page.goto("/resume");
        await page.getByRole("button", { name: /pdf 내보내기/i }).click();
        await page.locator("h2:text('PDF 내보내기')").waitFor();

        // 로딩 완료 대기
        await page.waitForTimeout(1500);

        // dashed 페이지 구분선 존재 확인
        const dividers = page.locator(
            "[class*='border-dashed'][class*='border-red']"
        );
        const count = await dividers.count();
        expect(count).toBeGreaterThan(0);
    });

    test("컬러 스킴 변경 시 페이지 수 유지", async ({ page }) => {
        await page.goto("/resume");
        await page.getByRole("button", { name: /pdf 내보내기/i }).click();
        await page.locator("h2:text('PDF 내보내기')").waitFor();
        await page.waitForTimeout(1500);

        // 현재 페이지 수 기록
        const pageText = await page.locator("text=/\\d+ pages?/").textContent();
        const initialCount = parseInt(pageText?.match(/\d+/)?.[0] ?? "0");
        expect(initialCount).toBeGreaterThan(0);

        // 컬러 스킴 드롭다운 열기
        await page.locator("text=Black & White").click();
        // 다른 스킴 선택
        await page.locator("text=Blue").click();
        await page.waitForTimeout(2000);

        // 페이지 수 동일 확인
        const afterText = await page
            .locator("text=/\\d+ pages?/")
            .textContent();
        const afterCount = parseInt(afterText?.match(/\d+/)?.[0] ?? "0");
        expect(afterCount).toBe(initialCount);
    });

    test("ESC 키로 모달 닫기", async ({ page }) => {
        await page.goto("/resume");
        await page.getByRole("button", { name: /pdf 내보내기/i }).click();
        await page.locator("h2:text('PDF 내보내기')").waitFor();

        await page.keyboard.press("Escape");
        await expect(page.locator("h2:text('PDF 내보내기')")).not.toBeVisible({
            timeout: 3000,
        });
    });
});

test.describe("PDF Export — Portfolio", () => {
    test("PDF 내보내기 버튼 표시 + 모달 열림", async ({ page }) => {
        await page.goto("/portfolio");
        const exportBtn = page.getByRole("button", { name: /pdf 내보내기/i });
        await expect(exportBtn).toBeVisible({ timeout: 10_000 });

        await exportBtn.click();
        await expect(page.locator("h2:text('PDF 내보내기')")).toBeVisible({
            timeout: 10_000,
        });

        // 페이지 수 표시
        const pageInfo = page.locator("text=/\\d+ pages?/");
        await expect(pageInfo).toBeVisible();
    });
});
