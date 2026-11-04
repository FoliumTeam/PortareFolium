export const LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const UI_LOCALE_COOKIE = "portarefolium_locale";
export const CONTENT_LOCALE_COOKIE = "portarefolium_content_locale";
export const LOCALE_LABELS: Record<Locale, string> = {
    ko: "한국어",
    en: "English",
    ja: "日本語",
};

// 지원 언어 검사
export const isLocale = (value: unknown): value is Locale =>
    LOCALES.includes(value as Locale);

// 지원하지 않는 방문자 언어의 영어 기본값
export const normalizeLocale = (value: unknown): Locale =>
    isLocale(value) ? value : "en";

// 브라우저 언어 목록의 지원 언어 우선순위
export const getBrowserLocale = (header: string | null): Locale => {
    let result: Locale = "en";
    let quality = 0;
    for (const item of (header ?? "").split(",")) {
        const match = item
            .trim()
            .match(
                /^([a-z]{2,8}(?:-[a-z0-9]{1,8})*)(?:\s*;\s*q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i
            );
        if (!match) continue;
        const candidate = match[1].split("-")[0].toLowerCase();
        const weight = match[2] === undefined ? 1 : Number(match[2]);
        if (isLocale(candidate) && weight > quality) {
            result = candidate;
            quality = weight;
        }
    }
    return result;
};

// 공개 주소에서 내부 언어 경로 제거
export const publicPath = (pathname: string): string =>
    pathname.replace(/^\/(ko|en|ja)(?=\/|$)/, "") || "/";

// 해당 상세의 직무·공유 범위를 보존한 상위 목록
export const getParentContentPath = (pathname: string): string => {
    const path = publicPath(pathname).replace(/\/$/, "");
    return path.slice(0, path.lastIndexOf("/")) || "/";
};
