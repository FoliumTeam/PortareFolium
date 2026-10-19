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

test.describe("주소로 지정한 공개 언어", () => {
    test.use({ locale: "ko-KR" });

    for (const [query, locale] of [
        ["kr", "ko"],
        ["en", "en"],
        ["ja", "ja"],
    ] as const) {
        test(`lang=${query}가 저장한 언어보다 우선하고 쿠키 변경 제외`, async ({
            page,
            context,
            baseURL,
        }) => {
            if (!baseURL) throw new Error("공개 언어 시험의 baseURL 필요");
            const saved = locale === "ja" ? "en" : "ja";
            await context.addCookies([
                { name: UI_LOCALE_COOKIE, value: saved, url: baseURL },
            ]);
            await page.goto(`/web/resume?lang=${query}`);

            await expect(page.locator("html")).toHaveAttribute("lang", locale);
            await expectHeaderLanguage(page, locale);
            expect(new URL(page.url()).searchParams.get("lang")).toBe(query);
            expect(
                (await context.cookies(baseURL)).find(
                    (cookie) => cookie.name === UI_LOCALE_COOKIE
                )?.value
            ).toBe(saved);
        });
    }

    test("잘못된 주소 언어는 저장한 선택으로 복구", async ({
        page,
        context,
        baseURL,
    }) => {
        if (!baseURL) throw new Error("공개 언어 시험의 baseURL 필요");
        await context.addCookies([
            { name: UI_LOCALE_COOKIE, value: "ja", url: baseURL },
        ]);
        await page.goto("/web/resume?lang=invalid");
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        await expectHeaderLanguage(page, "ja");
        expect(
            (await context.cookies(baseURL)).find(
                (cookie) => cookie.name === UI_LOCALE_COOKIE
            )?.value
        ).toBe("ja");
    });

    test("공개 메뉴 이동에 유효 언어만 이어 전달", async ({ page }) => {
        await page.goto("/web/resume?lang=ja&source=mail");
        await expectHeaderLanguage(page, "ja");
        await page
            .locator("#site-header")
            .getByRole("link", { name: navigation.ja.portfolio, exact: true })
            .click();
        await expect(page).toHaveURL(
            (url) =>
                url.pathname === "/web/portfolio" &&
                url.searchParams.get("lang") === "ja"
        );
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
        expect(new URL(page.url()).searchParams.has("source")).toBe(false);
    });

    for (const selected of ["ja", "en"] as const) {
        test(`강제 일본어에서 ${selected} 직접 선택 시 lang만 제거하고 선택 저장`, async ({
            page,
            context,
            baseURL,
        }) => {
            if (!baseURL) throw new Error("공개 언어 시험의 baseURL 필요");
            await context.addCookies([
                { name: UI_LOCALE_COOKIE, value: "ko", url: baseURL },
            ]);
            await page.goto("/web/resume?lang=ja&source=mail#career");
            await expectHeaderLanguage(page, "ja");

            await Promise.all([
                page.waitForEvent("domcontentloaded"),
                page
                    .getByRole("combobox", { name: displayLanguageName })
                    .selectOption(selected),
            ]);

            await expect(page.locator("html")).toHaveAttribute(
                "lang",
                selected
            );
            const url = new URL(page.url());
            expect(url.pathname).toBe("/web/resume");
            expect(url.searchParams.has("lang")).toBe(false);
            expect(url.searchParams.get("source")).toBe("mail");
            expect(url.hash).toBe("#career");
            expect(
                (await context.cookies(baseURL)).find(
                    (cookie) => cookie.name === UI_LOCALE_COOKIE
                )?.value
            ).toBe(selected);
        });
    }

    test("번역 없는 상세의 목록 이동에서도 언어와 다른 검색 값 유지", async ({
        page,
    }) => {
        await page.goto(
            "/web/portfolio/not-written-i18n-test?lang=ja&source=mail"
        );
        await expect(page).toHaveURL(
            (url) =>
                url.pathname === "/web/portfolio" &&
                url.searchParams.get("lang") === "ja" &&
                url.searchParams.get("source") === "mail"
        );
        await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    });

    test("강제 언어의 공개 검색 요청에 표시 언어와 직무 범위 전달", async ({
        page,
        context,
        baseURL,
    }) => {
        if (!baseURL) throw new Error("공개 언어 시험의 baseURL 필요");
        await context.addCookies([
            { name: UI_LOCALE_COOKIE, value: "en", url: baseURL },
        ]);
        await page.goto("/web/resume?lang=ja");
        await expectHeaderLanguage(page, "ja");
        const query = "language-scope-probe";
        const requestPromise = page.waitForRequest(
            (request) =>
                request.method() === "POST" &&
                Boolean(request.headers()["next-action"]) &&
                Boolean(request.postData()?.includes(query))
        );
        const header = page.locator("#site-header");
        await header.getByRole("button", { name: "検索", exact: true }).click();
        await header.getByRole("textbox").fill(query);
        const request = await requestPromise;

        expect(request.postDataJSON()).toEqual([query, "web", "ja"]);
        expect((await request.response())?.status()).toBe(200);
        expect(new URL(page.url()).searchParams.get("lang")).toBe("ja");
    });
});
