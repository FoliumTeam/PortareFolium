import { test, expect } from "@playwright/test";

test.describe("언어별 공개 화면", () => {
    test.use({ locale: "ko-KR" });
    test("주소 유지와 직접 선택 복원", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
        });
        await page.goto("/web/resume");
        await expect(page.locator("html")).toHaveAttribute("lang", "ko");
        const before = page.url();
        await page
            .getByRole("combobox", { name: "화면 언어" })
            .selectOption("ja");
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        await expect(
            page.getByRole("combobox", { name: "表示言語" })
        ).toHaveValue("ja");
        expect(page.url()).toBe(before);
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        expect(errors).toEqual([]);
    });
    test("번역 없는 상세의 직무 목록 이동", async ({ page, context }) => {
        await context.addCookies([
            {
                name: "portarefolium_locale",
                value: "en",
                url: test.info().project.use.baseURL as string,
            },
        ]);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/web/portfolio/not-written-i18n-test");
        await expect(page).toHaveURL(/\/web\/portfolio$/);
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        expect(errors).toEqual([]);
    });
});
