"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { browserClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-auth";

export default function LoginForm({
    siteName = "",
    returnUrl,
    googleEnabled = false,
    legacyEnabled = false,
}: {
    siteName?: string;
    returnUrl?: string;
    googleEnabled?: boolean;
    legacyEnabled?: boolean;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { data: session, status } = useSession();

    // 이미 로그인된 유저 → 랜딩 페이지로 리다이렉트
    useEffect(() => {
        if (status !== "authenticated" || !session?.user?.isAdmin) return;
        window.location.href = returnUrl || "/admin";
    }, [returnUrl, session, status]);

    // legacy Supabase 세션 있으면 migration 화면으로 이동
    useEffect(() => {
        if (!legacyEnabled || !browserClient) return;
        browserClient.auth.getUser().then(({ data }) => {
            const legacyEmail = data.user?.email ?? null;
            if (legacyEmail && isAdminEmail(legacyEmail)) {
                window.location.href = "/admin/migrate";
            }
        });
    }, [legacyEnabled]);

    // Google OAuth 로그인 시작
    const handleGoogleSignIn = async () => {
        if (!googleEnabled) {
            setError("Google OAuth 환경변수가 설정되지 않았습니다.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await signIn("google", {
                callbackUrl: returnUrl || "/admin",
            });
        } catch {
            setError("로그인에 실패했습니다. 관리자 이메일 설정을 확인하세요.");
            setLoading(false);
        }
    };

    // legacy Supabase 이메일/패스워드 로그인
    const handleLegacySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!legacyEnabled || !browserClient) {
            setError("Legacy 로그인 비활성화 상태");
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: authError } =
            await browserClient.auth.signInWithPassword({ email, password });

        const legacyEmail = data.user?.email ?? null;
        if (authError || !legacyEmail || !isAdminEmail(legacyEmail)) {
            if (data.user) {
                await browserClient.auth.signOut();
            }
            setError("기존 관리자 계정 로그인에 실패했습니다.");
            setLoading(false);
            return;
        }

        window.location.href = "/admin/migrate";
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-(--color-surface) px-4">
            {/* 배경 글로우 */}
            <div
                aria-hidden="true"
                className="tablet:h-96 tablet:w-96 pointer-events-none absolute top-1/3 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-accent) opacity-[0.08] blur-3xl"
            />

            <div className="relative w-full max-w-sm">
                {/* 워드마크 */}
                <div className="mb-10 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span
                            className="h-2.5 w-2.5 rounded-full bg-(--color-accent)"
                            aria-hidden="true"
                        />
                        <span className="text-lg font-black tracking-tight text-(--color-foreground)">
                            {siteName}
                        </span>
                    </div>
                    <h1 className="text-3xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                        Admin 로그인
                    </h1>
                    <p className="text-sm text-(--color-muted)">
                        관리자 계정으로 로그인하세요
                    </p>
                </div>

                {/* 로그인 카드 */}
                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-7 shadow-sm ring-1 ring-(--color-border)/40">
                    <div className="space-y-5">
                        <p className="text-sm text-(--color-muted)">
                            Google OAuth 기반 관리자 로그인
                        </p>
                        {/* 에러 메시지 */}
                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        {legacyEnabled && (
                            <form
                                onSubmit={handleLegacySubmit}
                                className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                            >
                                <p className="text-sm font-semibold text-(--color-foreground)">
                                    기존 Supabase 로그인 1회 허용
                                </p>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) py-3 text-sm font-bold text-(--color-foreground) transition-all hover:-translate-y-0.5 hover:border-(--color-accent) disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading
                                        ? "확인 중..."
                                        : "기존 계정으로 로그인"}
                                </button>
                            </form>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleGoogleSignIn()}
                            disabled={loading || !googleEnabled}
                            className="w-full rounded-2xl bg-(--color-accent) py-3 text-sm font-bold text-(--color-on-accent) transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "로그인 중..." : "Google로 로그인"}
                        </button>
                        {!googleEnabled && (
                            <p className="text-sm text-(--color-muted)">
                                Google OAuth 환경변수 설정 후 사용 가능
                            </p>
                        )}
                        {legacyEnabled && (
                            <p className="text-xs text-(--color-muted)">
                                기존 로그인은 계정 전환 1회용
                            </p>
                        )}
                    </div>
                </div>

                {/* 홈으로 돌아가기 */}
                <p className="mt-6 text-center">
                    <a
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        사이트로 돌아가기
                    </a>
                </p>
            </div>
        </div>
    );
}
