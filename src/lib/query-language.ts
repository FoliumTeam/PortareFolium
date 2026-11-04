import type { Locale } from "@/lib/i18n";

// 공개 주소의 언어 코드와 저장 코드 연결
export const getQueryLocale = (
    value: string | null | undefined
): Locale | null =>
    value === "kr" ? "ko" : value === "en" || value === "ja" ? value : null;

// 나머지 query·hash의 원문 보존
export const withoutLanguageQuery = (href: string): string => {
    const hashIndex = href.indexOf("#");
    const hash = hashIndex < 0 ? "" : href.slice(hashIndex);
    const address = hashIndex < 0 ? href : href.slice(0, hashIndex);
    const queryIndex = address.indexOf("?");
    if (queryIndex < 0) return href;
    const parts = address
        .slice(queryIndex + 1)
        .split("&")
        .filter((part) => {
            try {
                return (
                    decodeURIComponent(
                        part.split("=")[0].replace(/\+/g, " ")
                    ) !== "lang"
                );
            } catch {
                return true;
            }
        });
    const query = parts.filter(Boolean).join("&");
    return address.slice(0, queryIndex) + (query ? `?${query}` : "") + hash;
};

// 공개 페이지 이동에만 강제 언어 전파
export const withLanguageQuery = (href: string, search: string): string => {
    const query = new URLSearchParams(search);
    const language = query.get("lang");
    if (
        !getQueryLocale(language) ||
        !href ||
        href.startsWith("#") ||
        /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) ||
        href.includes("\\")
    )
        return href;
    let target: URL;
    try {
        target = new URL(href, "https://public.invalid/");
    } catch {
        return href;
    }
    if (
        target.origin !== "https://public.invalid" ||
        /^\/(?:admin|api|_next)(?:\/|$)/.test(target.pathname) ||
        /\.[a-z\d]{1,10}$/i.test(target.pathname) ||
        target.searchParams.has("download")
    )
        return href;
    if (getQueryLocale(target.searchParams.get("lang"))) return href;
    const clean = withoutLanguageQuery(href);
    const hashIndex = clean.indexOf("#");
    const hash = hashIndex < 0 ? "" : clean.slice(hashIndex);
    const address = hashIndex < 0 ? clean : clean.slice(0, hashIndex);
    return `${address}${address.includes("?") ? "&" : "?"}lang=${language}${hash}`;
};

// 누락 상세의 목록 이동에도 기존 필터·언어 유지
export const getMissingContentHref = (
    href: string,
    search: string,
    hash = ""
): string => {
    const target = new URL(href, "https://public.invalid/");
    const incoming = new URLSearchParams(search);
    const existingKeys = new Set(target.searchParams.keys());
    for (const [key, value] of incoming) {
        if (!existingKeys.has(key)) target.searchParams.append(key, value);
    }
    return `${target.pathname}${target.search}${target.hash || hash}`;
};
