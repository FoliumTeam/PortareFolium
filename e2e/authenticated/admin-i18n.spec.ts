import { expect, test as base } from "@playwright/test";
import { CONTENT_LOCALE_COOKIE, UI_LOCALE_COOKIE } from "../../src/lib/i18n";

const test = base.extend<{ runtimeErrors: string[] }>({
    runtimeErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on("console", (message) => {
                if (message.type() === "error") errors.push(message.text());
            });
            page.on("pageerror", (error) => errors.push(error.message));
            await use(errors);
            expect(errors).toEqual([]);
        },
        { auto: true },
    ],
});

const displayLanguageName = /^(화면 언어|Display language|表示言語)$/;
const contentLanguageName =
    /^(콘텐츠 언어|Content language|入力するコンテンツの言語)$/;
const emailSelector = '[data-resume-section="basics"] input[type="email"]';
const uiLabels = {
    ko: { title: "이력서 편집", basics: "기본 정보", save: "변경사항 저장" },
    en: {
        title: "Edit resume",
        basics: "Basic information",
        save: "Save changes",
    },
    ja: { title: "履歴書を編集", basics: "基本情報", save: "変更を保存" },
};

test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error("관리자 언어 시험의 baseURL 필요");
    await context.addCookies([
        { name: UI_LOCALE_COOKIE, value: "ko", url: baseURL },
        { name: CONTENT_LOCALE_COOKIE, value: "ko", url: baseURL },
    ]);
});

for (const contentLocale of ["ko", "en", "ja"] as const) {
    test(`${contentLocale} 콘텐츠에서 화면 언어 3종 전환 중 미저장 입력 보존`, async ({
        page,
        context,
        baseURL,
    }) => {
        await context.addCookies([
            {
                name: CONTENT_LOCALE_COOKIE,
                value: contentLocale,
                url: baseURL!,
            },
        ]);
        await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });
        const email = page.locator(emailSelector);
        await expect(email).toBeVisible();
        await page.waitForLoadState("networkidle");
        const original = await email.inputValue();
        const changed =
            original === "admin-i18n-a@example.test"
                ? "admin-i18n-b@example.test"
                : "admin-i18n-a@example.test";

        // 개인 자료 쓰기 방지를 위한 자동 저장 시간 정지
        await page.clock.install();
        await page.clock.pauseAt(new Date(Date.now() + 1_000));
        const blockedMutations: string[] = [];
        await page.route("**/*", async (route) => {
            const request = route.request();
            const pathname = new URL(request.url()).pathname;
            if (
                !["GET", "HEAD", "OPTIONS"].includes(request.method()) &&
                (pathname === "/admin" || pathname.startsWith("/api/admin/"))
            ) {
                blockedMutations.push(pathname);
                await route.abort("blockedbyclient");
                return;
            }
            await route.continue();
        });
        await email.fill(changed);
        const contentLanguage = page.getByRole("combobox", {
            name: contentLanguageName,
        });
        await expect(contentLanguage).toBeDisabled();

        for (const locale of ["en", "ja", "ko"] as const) {
            await page
                .getByRole("combobox", { name: displayLanguageName })
                .selectOption(locale);
            await expect(page.locator("html")).toHaveAttribute("lang", locale);
            await expect(
                page.getByRole("heading", {
                    name: uiLabels[locale].title,
                    exact: true,
                })
            ).toBeVisible();
            await expect(
                page
                    .locator('[data-resume-section="basics"]')
                    .getByRole("heading", {
                        name: uiLabels[locale].basics,
                        exact: true,
                    })
            ).toBeAttached();
            await expect(
                page.getByRole("button", {
                    name: uiLabels[locale].save,
                    exact: true,
                })
            ).toBeEnabled();
            await expect(email).toHaveValue(changed);
            await expect(contentLanguage).toHaveValue(contentLocale);
            await expect(contentLanguage).toBeDisabled();
            await expect(page).toHaveURL(/\/admin#resume$/);
        }

        await email.fill(original);
        await expect(contentLanguage).toBeEnabled();
        expect(blockedMutations).toEqual([]);
    });
}

test("콘텐츠 언어 선택을 새로고침 후 복원하고 화면 언어 독립 유지", async ({
    page,
}) => {
    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });
    const email = page.locator(emailSelector);
    await expect(email).toBeVisible();
    const original = await email.inputValue();
    await page
        .getByRole("combobox", { name: displayLanguageName })
        .selectOption("ja");
    const contentLanguage = page.getByRole("combobox", {
        name: contentLanguageName,
    });

    await contentLanguage.selectOption("en");
    await expect(contentLanguage).toHaveValue("en");
    await expect(contentLanguage).toBeEnabled();
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(email).toBeVisible();
    await expect(contentLanguage).toHaveValue("en");
    await expect(
        page.getByRole("combobox", { name: displayLanguageName })
    ).toHaveValue("ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await contentLanguage.selectOption("ko");
    await expect(contentLanguage).toHaveValue("ko");
    await expect(email).toHaveValue(original);
    await expect(page).toHaveURL(/\/admin#resume$/);
});
