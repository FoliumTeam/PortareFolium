import { cookies, headers } from "next/headers";
import {
    CONTENT_LOCALE_COOKIE,
    UI_LOCALE_COOKIE,
    getBrowserLocale,
    isLocale,
    type Locale,
} from "@/lib/i18n";
import { withContentLocale } from "@/lib/content-locale";

// 관리자 입력 언어와 공개 화면 언어의 별도 요청 범위
export const withActionLocale = async <T>(
    kind: "content" | "public",
    action: () => Promise<T>
): Promise<T> => {
    const cookieStore = await cookies();
    const saved = cookieStore.get(
        kind === "content" ? CONTENT_LOCALE_COOKIE : UI_LOCALE_COOKIE
    )?.value;
    const locale: Locale = isLocale(saved)
        ? saved
        : kind === "content"
          ? "ko"
          : getBrowserLocale((await headers()).get("accept-language"));
    return withContentLocale(locale, action);
};
