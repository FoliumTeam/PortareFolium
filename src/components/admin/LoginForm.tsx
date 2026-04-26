"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import type { getAdminCredentialSetup } from "@/lib/admin-credentials";
import { getSafeAdminReturnUrl } from "@/lib/admin-return-url";

const ENV_DESCRIPTIONS: Record<string, { purpose: string; setup: string }> = {
    AUTH_ADMIN_EMAIL: {
        purpose: "관리자 로그인에 사용할 이메일",
        setup: "Vercel 또는 .env.local에 실제 관리자 이메일 1개 입력",
    },
    AUTH_ADMIN_PASSWORD_HASH: {
        purpose: "관리자 비밀번호를 평문 대신 저장하는 scrypt hash",
        setup: "아래 예시 명령으로 hash 생성 후 그대로 env에 입력",
    },
    AUTH_SECRET: {
        purpose: "로그인 세션과 쿠키 암호화에 쓰는 secret",
        setup: "충분히 긴 랜덤 문자열을 생성해 env에 입력",
    },
};

const COMMANDS = {
    AUTH_ADMIN_PASSWORD_HASH:
        "node -e \"const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('YOUR_PASSWORD', salt, 64).toString('hex'); console.log('scrypt$' + salt + '$' + hash)\"",
    AUTH_SECRET:
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
} as const;

export default function LoginForm({
    siteName = "",
    returnUrl,
    setupState,
    showDetailedSetupGuide = true,
}: {
    siteName?: string;
    returnUrl?: string;
    setupState: ReturnType<typeof getAdminCredentialSetup>;
    showDetailedSetupGuide?: boolean;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
    const { data: session, status } = useSession();
    const setupReady = setupState.missingEnvKeys.length === 0;
    const safeReturnUrl = getSafeAdminReturnUrl(returnUrl);

    // 이미 로그인된 유저 → 랜딩 페이지로 리다이렉트
    useEffect(() => {
        if (status !== "authenticated" || !session?.user?.isAdmin) return;
        window.location.href = safeReturnUrl;
    }, [safeReturnUrl, session, status]);

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
            callbackUrl: safeReturnUrl,
        });
        if (result?.error) {
            setError("관리자 계정 로그인에 실패했습니다.");
            setLoading(false);
            return;
        }
        window.location.href = safeReturnUrl;
    };

    // 명령 clipboard 복사
    const handleCopyCommand = async (key: keyof typeof COMMANDS) => {
        try {
            await navigator.clipboard.writeText(COMMANDS[key]);
            setCopiedCommand(key);
        } catch {
            setError("명령 복사에 실패했습니다.");
        }
    };

    return (
        <div className="tablet:items-center tablet:py-12 relative flex min-h-screen items-start justify-center bg-(--color-surface) px-4 py-8">
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
                                <ul className="space-y-2 text-xs">
                                    {setupState.missingEnvKeys.map((key) => (
                                        <li
                                            key={key}
                                            className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-800 dark:bg-black/10"
                                        >
                                            <p className="font-mono font-semibold">
                                                {key}
                                            </p>
                                            <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                                                용도:{" "}
                                                {ENV_DESCRIPTIONS[key]
                                                    ?.purpose ??
                                                    "관리자 로그인에 필요한 환경변수"}
                                            </p>
                                            <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                                                설정:{" "}
                                                {ENV_DESCRIPTIONS[key]?.setup ??
                                                    "환경변수에 값을 추가"}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                {showDetailedSetupGuide && (
                                    <>
                                        <div className="space-y-1 text-xs">
                                            <p className="font-semibold">
                                                `AUTH_ADMIN_PASSWORD_HASH` 생성
                                                명령
                                            </p>
                                            <div className="space-y-2">
                                                <code className="block overflow-x-auto rounded-lg bg-black/80 px-3 py-2 text-[11px] text-white">
                                                    {
                                                        COMMANDS.AUTH_ADMIN_PASSWORD_HASH
                                                    }
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleCopyCommand(
                                                            "AUTH_ADMIN_PASSWORD_HASH"
                                                        )
                                                    }
                                                    disabled={
                                                        copiedCommand ===
                                                        "AUTH_ADMIN_PASSWORD_HASH"
                                                    }
                                                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-(--color-accent) px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-100"
                                                >
                                                    {copiedCommand ===
                                                    "AUTH_ADMIN_PASSWORD_HASH" ? (
                                                        <>
                                                            <svg
                                                                className="h-3.5 w-3.5"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                            >
                                                                <path
                                                                    d="M20 6L9 17l-5-5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                            복사됨
                                                        </>
                                                    ) : (
                                                        "복사"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <p className="font-semibold">
                                                `AUTH_SECRET` 생성 명령
                                            </p>
                                            <div className="space-y-2">
                                                <code className="block overflow-x-auto rounded-lg bg-black/80 px-3 py-2 text-[11px] text-white">
                                                    {COMMANDS.AUTH_SECRET}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleCopyCommand(
                                                            "AUTH_SECRET"
                                                        )
                                                    }
                                                    disabled={
                                                        copiedCommand ===
                                                        "AUTH_SECRET"
                                                    }
                                                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-(--color-accent) px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-100"
                                                >
                                                    {copiedCommand ===
                                                    "AUTH_SECRET" ? (
                                                        <>
                                                            <svg
                                                                className="h-3.5 w-3.5"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                            >
                                                                <path
                                                                    d="M20 6L9 17l-5-5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                            복사됨
                                                        </>
                                                    ) : (
                                                        "복사"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <p className="text-xs">
                                    Vercel 사용 시 Project Settings →
                                    Environment Variables에 값을 추가 후 재배포
                                </p>
                                <p className="text-xs">
                                    로컬 개발 시 프로젝트 루트의 `.env.local`
                                    파일에 같은 값을 추가
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
                            {/* 스크린리더용 숨김 레이블 */}
                            <label htmlFor="admin-email" className="sr-only">
                                이메일
                            </label>
                            <input
                                id="admin-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                autoComplete="email"
                                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                            />
                            <label htmlFor="admin-password" className="sr-only">
                                비밀번호
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
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
