"use client";

/**
 * AuthGuard
 *
 * 어드민 페이지를 Supabase Auth로 보호하는 래퍼 컴포넌트.
 * - 마운트 시 세션을 확인하고, 미인증이면 /admin/login 으로 리다이렉트한다.
 * - 정적 사이트이므로 서버 미들웨어 대신 클라이언트 사이드 가드를 사용한다.
 * - Supabase RLS가 2차 방어선이므로 보안상 안전하다.
 */
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";

interface Props {
    children: React.ReactNode;
}

/** 인증 상태 타입 */
type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function AuthGuard({ children }: Props) {
    const [authState, setAuthState] = useState<AuthState>("loading");

    useEffect(() => {
        // browserClient 미설정 시 (env 미입력) 바로 로그인 페이지로
        if (!browserClient) {
            window.location.href = "/admin/login";
            return;
        }

        // 현재 세션 확인
        browserClient.auth.getUser().then(({ data }) => {
            if (data.user) {
                setAuthState("authenticated");
            } else {
                window.location.href = "/admin/login";
            }
        });

        // 세션 변경 구독 (로그아웃 시 즉시 리다이렉트)
        const { data: listener } = browserClient.auth.onAuthStateChange(
            (_event, session) => {
                if (!session) {
                    window.location.href = "/admin/login";
                }
            }
        );

        return () => listener.subscription.unsubscribe();
    }, []);

    if (authState === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-(--color-surface)">
                <div className="flex flex-col items-center gap-3 text-(--color-muted)">
                    {/* 스피너 */}
                    <svg
                        className="h-8 w-8 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    <span className="text-sm">인증 확인 중...</span>
                </div>
            </div>
        );
    }

    if (authState === "unauthenticated") {
        // 리다이렉트 중 빈 화면 방지
        return null;
    }

    return <>{children}</>;
}
