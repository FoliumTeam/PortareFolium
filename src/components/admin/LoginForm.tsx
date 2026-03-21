"use client";

/**
 * LoginForm
 *
 * Supabase Auth 이메일/패스워드 로그인 폼.
 * 로그인 성공 시 /admin 으로 리다이렉트한다.
 */
import { useState } from "react";
import { browserClient } from "@/lib/supabase";

export default function LoginForm({ siteName = "" }: { siteName?: string }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    /** 폼 제출 — Supabase signInWithPassword 호출 */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!browserClient) {
            setError("Supabase 설정이 없습니다. .env.local을 확인하세요.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error: authError } =
            await browserClient.auth.signInWithPassword({ email, password });

        if (authError) {
            setError("이메일 또는 패스워드가 올바르지 않습니다.");
            setLoading(false);
        } else {
            window.location.href = "/admin";
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-(--color-surface) px-4">
            {/* 배경 글로우 */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-accent) opacity-[0.08] blur-3xl"
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
                    <h1 className="text-3xl font-black tracking-tight text-(--color-foreground)">
                        Admin 로그인
                    </h1>
                    <p className="text-sm text-(--color-muted)">
                        관리자 계정으로 로그인하세요
                    </p>
                </div>

                {/* 로그인 카드 */}
                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-7">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-semibold text-(--color-foreground)"
                            >
                                이메일
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-semibold text-(--color-foreground)"
                            >
                                패스워드
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/30 focus:outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-(--color-accent) py-3 text-sm font-bold text-(--color-on-accent) transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "로그인 중..." : "로그인"}
                        </button>
                    </form>
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
