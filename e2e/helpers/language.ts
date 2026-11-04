import type { Page } from "@playwright/test";
import { LOCALE_LABELS, type Locale } from "../../src/lib/i18n";

export const displayLanguageName = /^(화면 언어|Display language|表示言語)$/;
export const contentLanguageName =
    /^(콘텐츠 언어|Content language|入力するコンテンツの言語)$/;
type LanguageKind = "display" | "content";

export const languageButton = (page: Page, kind: LanguageKind) =>
    page.getByRole("button", {
        name: kind === "display" ? displayLanguageName : contentLanguageName,
    });

// 파일 로딩 완료 대기 없이 실제 메뉴 조작만 수행해 빠른 전환 조건 유지
export const selectLanguage = async (
    page: Page,
    kind: LanguageKind,
    locale: Locale
) => {
    await languageButton(page, kind).click();
    await page
        .getByRole("menuitemradio", {
            name: LOCALE_LABELS[locale],
            exact: true,
        })
        .click();
};
