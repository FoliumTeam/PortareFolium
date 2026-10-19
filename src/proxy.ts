import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getQueryLocale } from "@/lib/query-language";
import {
    getBrowserLocale,
    isLocale,
    UI_LOCALE_COOKIE,
    publicPath,
} from "@/lib/i18n";

// NextAuth v5 기본 session cookie name (dev / production)
const SESSION_COOKIE_NAMES = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
];

// 이 proxy는 session cookie가 없는 요청만 차단함 (unauthenticated 트래픽 필터)
// admin 권한 검증은 각 server action / API route에서 requireAdminSession()이 담당
// Next.js 16: middleware → proxy 파일 컨벤션 마이그레이션
export function proxy(req: NextRequest) {
    const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
        req.cookies.get(name)
    );
    const path = req.nextUrl.pathname;
    const protectedPath =
        path.startsWith("/admin") ||
        path.startsWith("/api/upload-image") ||
        path.startsWith("/api/storage-ops");
    if (!protectedPath) {
        const explicit = path.match(/^\/(ko|en|ja)(?=\/|$)/)?.[1];
        if (explicit) {
            if (req.headers.get("x-folium-internal-locale") === explicit)
                return NextResponse.next();
            const url = req.nextUrl.clone();
            url.pathname = publicPath(path);
            return NextResponse.redirect(url);
        }
        const saved = req.cookies.get(UI_LOCALE_COOKIE)?.value;
        const locale =
            getQueryLocale(req.nextUrl.searchParams.get("lang")) ??
            (isLocale(saved)
                ? saved
                : getBrowserLocale(req.headers.get("accept-language")));
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}${path === "/" ? "" : path}`;
        const headers = new Headers(req.headers);
        headers.set("x-folium-internal-locale", locale);
        const response = NextResponse.rewrite(url, { request: { headers } });
        response.headers.set("Content-Language", locale);
        return response;
    }
    if (hasSessionCookie || path === "/admin/login") return NextResponse.next();
    if (path.startsWith("/admin")) {
        const url = new URL("/admin/login", req.url);
        url.searchParams.set("returnUrl", path);
        return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
}

export const config = {
    matcher: [
        "/admin",
        "/admin/((?!login).*)",
        "/api/upload-image/:path*",
        "/api/storage-ops/:path*",
        "/((?!api(?:/|$)|_next/|.*\\.[^/]+$).*)",
    ],
};
