"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import type { getAdminCredentialSetup } from "@/lib/admin-credentials";

export default function LoginForm({
    siteName = "",
    returnUrl,
    e2eEnabled = false,
    setupState,
}: {
    siteName?: string;
    returnUrl?: string;
    e2eEnabled?: boolean;
    setupState: ReturnType<typeof getAdminCredentialSetup>;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [e2eEmail, setE2eEmail] = useState("");
    const [e2ePassword, setE2ePassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { data: session, status } = useSession();
    const setupReady = setupState.missingEnvKeys.length === 0;

    // 이미 로그인된 유저 → 랜딩 페이지로 리다이렉트
    useEffect(() => {
        if (status !== "authenticated" || !session?.user?.isAdmin) return;
        window.location.href = returnUrl || "/admin";
    }, [returnUrl, session, status]);

    // admin credentials 로그인
    const handleAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!setupReady) {
            setError("관리자 로그인 환경변수가 설정되지 않았습니다.");
            return;
        }

        setLoading(true);
        setError(null);
        const result = await signIn("admin-credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: returnUrl || "/admin",
        });
        if (result?.error) {
            setError("관리자 계정 로그인에 실패했습니다.");
            setLoading(false);
            return;
        }
        window.location.href = result?.url || returnUrl || "/admin";
    };

    // E2E credentials 로그인
    const handleE2ESubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!e2eEnabled) return;

        setLoading(true);
        setError(null);
        const result = await signIn("e2e-credentials", {
            email: e2eEmail,
            password: e2ePassword,
            redirect: false,
            callbackUrl: "/admin",
        });
        if (result?.error) {
            setError("테스트 로그인 실패");
            setLoading(false);
            return;
        }
        window.location.href = result?.url || "/admin";
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
                            email/password 기반 관리자 로그인
                        </p>
                        {/* 에러 메시지 */}
                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        {!setupReady && (
                            <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-semibold">
                                    관리자 로그인 설정 필요
                                </p>
                                <p>
                                    이 사이트는 아래 env가 있어야 관리자
                                    로그인을 사용할 수 있습니다.
                                </p>
                                <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
                                    {setupState.missingEnvKeys.map((key) => (
                                        <li key={key}>{key}</li>
                                    ))}
                                </ul>
                                <div className="space-y-1 text-xs">
                                    <p className="font-semibold">
                                        password hash 생성 예시
                                    </p>
                                    <code className="block overflow-x-auto rounded-lg bg-black/80 px-3 py-2 text-[11px] text-white">
                                        {
                                            "node -e \"const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('YOUR_PASSWORD', salt, 64).toString('hex'); console.log('scrypt$' + salt + '$' + hash)\""
                                        }
                                    </code>
                                </div>
                                <p className="text-xs">
                                    Vercel 사용 시 Project Settings →
                                    Environment Variables에 값을 추가 후 재배포
                                </p>
                            </div>
                        )}

                        <form
                            onSubmit={handleAdminSubmit}
                            className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                        >
                            <p className="text-sm font-semibold text-(--color-foreground)">
                                관리자 로그인
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
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={loading || !setupReady}
                                className="w-full rounded-2xl bg-(--color-accent) py-3 text-sm font-bold text-(--color-on-accent) transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? "로그인 중..." : "로그인"}
                            </button>
                        </form>

                        {e2eEnabled && (
                            <form
                                onSubmit={handleE2ESubmit}
                                className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                            >
                                <p className="text-sm font-semibold text-(--color-foreground)">
                                    테스트 로그인
                                </p>
                                <input
                                    id="e2e-email"
                                    type="email"
                                    value={e2eEmail}
                                    onChange={(e) =>
                                        setE2eEmail(e.target.value)
                                    }
                                    placeholder="e2e@example.com"
                                    className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                />
                                <input
                                    id="e2e-password"
                                    type="password"
                                    value={e2ePassword}
                                    onChange={(e) =>
                                        setE2ePassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) py-3 text-sm font-bold text-(--color-foreground) transition-all hover:-translate-y-0.5 hover:border-(--color-accent) disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    테스트 계정으로 로그인
                                </button>
                            </form>
                        )}

                        <p className="text-xs text-(--color-muted)">
                            signup은 비활성화 상태
                        </p>
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
