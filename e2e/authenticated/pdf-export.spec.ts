import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function trackRuntimeErrors(page: Page) {
    const runtimeErrors: string[] = [];

    page.on("pageerror", (error) => {
        runtimeErrors.push(`pageerror: ${error.message}`);
    });

    page.on("console", (message) => {
        if (message.type() !== "error") return;
        runtimeErrors.push(`console: ${message.text()}`);
    });

    return runtimeErrors;
}

async function openPdfModal(page: Page) {
    const exportBtn = page.getByRole("button", { name: /pdf 내보내기/i });
    const dialogHeading = page.getByRole("heading", { name: "PDF 내보내기" });

    await expect(exportBtn).toBeVisible({ timeout: 10_000 });

    for (let attempt = 0; attempt < 2; attempt += 1) {
        await page.waitForTimeout(800);
        await exportBtn.click();
        try {
            await expect(dialogHeading).toBeVisible({ timeout: 3_000 });
            return { exportBtn, dialogHeading };
        } catch {
            // hydration 대기 뒤 1회 재시도
        }
    }

    await expect(dialogHeading).toBeVisible({ timeout: 10_000 });
    return { exportBtn, dialogHeading };
}

test.describe("PDF Export — Resume", () => {
    test("PDF 내보내기 버튼 표시 (인증 상태)", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        const exportBtn = page.getByRole("button", { name: /pdf 내보내기/i });
        await expect(exportBtn).toBeVisible({ timeout: 10_000 });
        expect(runtimeErrors).toEqual([]);
    });

    test("PDF 프리뷰 모달 열림 + 기본 UI 확인", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        const { dialogHeading } = await openPdfModal(page);

        // 모달 사이드바 표시
        await expect(dialogHeading).toBeVisible({ timeout: 10_000 });

        // 컬러 스킴 드롭다운 표시
        await expect(page.locator("text=Color Scheme")).toBeVisible();

        // 페이지 수 표시
        await expect(page.getByText("Pages", { exact: true })).toBeVisible();
        await expect(page.getByText(/\d+\s*pages?/)).toBeVisible();

        // 다운로드 버튼 표시
        await expect(
            page.getByRole("button", { name: /pdf 다운로드/i })
        ).toBeVisible();
        expect(runtimeErrors).toEqual([]);
    });

    test("페이지 구분선 존재", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        await openPdfModal(page);

        // 로딩 완료 대기
        await page.waitForTimeout(1500);

        // dashed 페이지 구분선 존재 확인
        const dividers = page.locator(
            "[class*='border-dashed'][class*='border-red']"
        );
        const count = await dividers.count();
        expect(count).toBeGreaterThan(0);
        expect(runtimeErrors).toEqual([]);
    });

    test("컬러 스킴 변경 시 페이지 수 유지", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        await openPdfModal(page);
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
        expect(runtimeErrors).toEqual([]);
    });

    test("프로젝트 카드 grid 2열 레이아웃 유지", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        await openPdfModal(page);
        await page.waitForTimeout(1500);

        // data-pdf-block-item 부모 grid의 column 수 확인
        const colCount = await page.evaluate(() => {
            const item = document.querySelector("[data-pdf-block-item]");
            if (!item?.parentElement) return 0;
            const cols = getComputedStyle(
                item.parentElement
            ).gridTemplateColumns;
            return cols.split(" ").filter((c) => c !== "").length;
        });
        expect(colCount).toBeGreaterThanOrEqual(2);
        expect(runtimeErrors).toEqual([]);
    });

    test("ESC 키로 모달 닫기", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/resume", { waitUntil: "load" });
        const { dialogHeading } = await openPdfModal(page);

        await page.keyboard.press("Escape");
        await expect(dialogHeading).not.toBeVisible({
            timeout: 3000,
        });
        expect(runtimeErrors).toEqual([]);
    });
});

test.describe("PDF Export — Portfolio", () => {
    test("PDF 내보내기 버튼 표시 + 모달 열림", async ({ page }) => {
        const runtimeErrors = trackRuntimeErrors(page);
        await page.goto("/portfolio", { waitUntil: "load" });
        await openPdfModal(page);

        // 페이지 수 표시
        const pageInfo = page.locator("text=/\\d+ pages?/");
        await expect(pageInfo).toBeVisible();
        expect(runtimeErrors).toEqual([]);
    });
});
