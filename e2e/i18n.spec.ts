import { test as base, expect, type Page } from "@playwright/test";
import { UI_LOCALE_COOKIE, type Locale } from "../src/lib/i18n";

const test = base.extend<{ runtimeErrors: string[] }>({
    runtimeErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on("pageerror", (error) => errors.push(error.message));
            page.on("console", (message) => {
                if (message.type() === "error") errors.push(message.text());
            });
            await use(errors);
            expect(errors).toEqual([]);
        },
        { auto: true },
    ],
});

const displayLanguageName = /^(화면 언어|Display language|表示言語)$/;
const navigation = {
    ko: { resume: "이력서", portfolio: "포트폴리오", blog: "블로그" },
    en: { resume: "Resume", portfolio: "Portfolio", blog: "Blog" },
    ja: { resume: "履歴書", portfolio: "ポートフォリオ", blog: "ブログ" },
};

const expectHeaderLanguage = async (page: Page, locale: Locale) => {
    const header = page.locator("#site-header");
    const selector = header.getByRole("combobox", {
        name: displayLanguageName,
    });
    if (!(await selector.isVisible())) {
        await header.getByRole("button", { expanded: false }).click();
    }
    await expect(selector).toHaveValue(locale);
    for (const label of Object.values(navigation[locale])) {
        await expect(
            header.getByRole("link", { name: label, exact: true })
        ).toBeVisible();
    }
};

for (const [browserLocale, expected] of [
    ["ko-KR", "ko"],
    ["ja-JP", "ja"],
    ["fr-FR", "en"],
] as const) {
    test.describe(`${browserLocale} 방문자 자동 언어`, () => {
        test.use({ locale: browserLocale });
        test(`${expected} 화면 문구를 기존 공개 주소에서 제공`, async ({
            page,
        }) => {
            await page.goto("/web/resume");
            await expect(page.locator("html")).toHaveAttribute(
                "lang",
                expected
            );
            await expectHeaderLanguage(page, expected);
            await expect(page).toHaveURL(/\/web\/resume$/);
        });
    });
}

test.describe("언어별 공개 화면", () => {
    test.use({ locale: "ko-KR" });

    test("세 언어의 실제 문구 전환 중 주소 유지와 직접 선택 복원", async ({
        page,
    }) => {
        await page.goto("/web/resume");
        const originalURL = page.url();
        await expectHeaderLanguage(page, "ko");

        for (const locale of ["en", "ko", "ja"] as const) {
            await Promise.all([
                page.waitForEvent("domcontentloaded"),
                page
                    .getByRole("combobox", { name: displayLanguageName })
                    .selectOption(locale),
            ]);
            await expect(page.locator("html")).toHaveAttribute("lang", locale);
            await expectHeaderLanguage(page, locale);
            expect(page.url()).toBe(originalURL);
        }

        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        await expectHeaderLanguage(page, "ja");
        expect(page.url()).toBe(originalURL);
    });

    test("390px Header 메뉴에서 언어 선택과 같은 주소 전환", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/web/resume");
        const originalURL = page.url();
        const header = page.locator("#site-header");
        const selector = header.getByRole("combobox", {
            name: displayLanguageName,
        });
        await expect(selector).toBeHidden();
        await header.getByRole("button", { expanded: false }).click();
        await expect(selector).toBeVisible();

        await Promise.all([
            page.waitForEvent("domcontentloaded"),
            selector.selectOption("en"),
        ]);

        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expect(selector).toBeHidden();
        await expectHeaderLanguage(page, "en");
        expect(page.url()).toBe(originalURL);
    });

    test("번역 없는 상세에서 같은 직무 목록과 영어 문구 제공", async ({
        page,
        context,
        baseURL,
    }) => {
        if (!baseURL) throw new Error("공개 언어 시험의 baseURL 필요");
        await context.addCookies([
            { name: UI_LOCALE_COOKIE, value: "en", url: baseURL },
        ]);
        await page.goto("/web/portfolio/not-written-i18n-test");
        await expect(page).toHaveURL(/\/web\/portfolio$/);
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expectHeaderLanguage(page, "en");
    });
});
