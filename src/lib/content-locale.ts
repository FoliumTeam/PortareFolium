import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { isLocale, type Locale } from "@/lib/i18n";

const storage = new AsyncLocalStorage<Locale>();
const requestLocale = cache(() => ({ locale: "ko" as Locale }));

// 정적 페이지와 layout의 명시적 언어 설정
export const setRequestLocale = (locale: unknown): void => {
    if (!isLocale(locale)) throw new Error("Unsupported locale");
    requestLocale().locale = locale;
};

// 서버 작업 문맥 우선, React 요청 범위 언어 조회
export const getContentLocale = (): Locale =>
    storage.getStore() ?? requestLocale().locale;

// 비동기 작업 사이의 언어 격리
export const withContentLocale = <T>(locale: Locale, action: () => T): T =>
    storage.run(locale, action);
