import { isLocale, type Locale } from "@/lib/i18n";

export type ContentLocaleScope = { __contentLocale: Locale };

// 입력 payload와 구분되는 작업 언어 봉투
export const isContentLocaleScope = (
    value: unknown
): value is ContentLocaleScope =>
    typeof value === "object" &&
    value !== null &&
    "__contentLocale" in value &&
    isLocale(value.__contentLocale);
