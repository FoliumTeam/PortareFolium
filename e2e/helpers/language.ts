import { expect, type Locator, type Page } from "@playwright/test";
import { LOCALE_LABELS, type Locale } from "../../src/lib/i18n";

// React가 이벤트 처리기를 붙였는지(hydration 완료) 확인
// domcontentloaded 직후의 클릭은 처리기 연결 전이면 무시되어 메뉴가 열리지 않음
export const waitForHydrated = (locator: Locator) =>
    expect
        .poll(
            () =>
                locator.evaluate((element) =>
                    Object.keys(element).some((key) =>
                        key.startsWith("__reactProps$")
                    )
                ),
            { timeout: 15_000 }
        )
        .toBe(true);

// 관리자 첫 화면 대기: 새 build 직후 여러 worker가 원격 DB를 동시에 읽으면 기본 5초를 넘김
export const ADMIN_PANEL_TIMEOUT = 20_000;

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
    const button = languageButton(page, kind);
    await waitForHydrated(button);
    await button.click();
    await page
        .getByRole("menuitemradio", {
            name: LOCALE_LABELS[locale],
            exact: true,
        })
        .click();
};
