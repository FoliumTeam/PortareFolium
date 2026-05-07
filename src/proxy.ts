import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
    if (hasSessionCookie) return NextResponse.next();

    const path = req.nextUrl.pathname;
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
    ],
};
