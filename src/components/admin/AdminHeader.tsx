"use client";

import ThemeToggle from "@/components/ThemeToggle";

interface AdminHeaderProps {
    timeLeft: number;
    onLogout: () => void;
}

// 남은 시간을 MM:SS 형식으로 변환
function formatRemaining(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// 어드민 헤더 (사이트 링크, 타이머, 테마 토글, 로그아웃)
export default function AdminHeader({ timeLeft, onLogout }: AdminHeaderProps) {
    return (
        <header className="flex h-14 items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-6">
            <div className="flex items-center gap-4">
                <a
                    href="/"
                    className="flex items-center gap-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
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
                    사이트
                </a>
                <span
                    className="h-4 w-px bg-(--color-border)"
                    aria-hidden="true"
                />
                <div className="flex items-center gap-2">
                    <span
                        className="h-2 w-2 rounded-full bg-(--color-accent)"
                        aria-hidden="true"
                    />
                    <span className="text-sm font-black tracking-tight text-(--color-foreground)">
                        Admin
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span
                    className={[
                        "font-mono text-xs tabular-nums",
                        timeLeft <= 5 * 60 * 1000
                            ? "text-red-500"
                            : "text-(--color-muted)",
                    ].join(" ")}
                >
                    {formatRemaining(timeLeft)}
                </span>
                <ThemeToggle />
                <button
                    onClick={onLogout}
                    className="rounded-full border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:border-red-400 hover:text-red-500"
                >
                    로그아웃
                </button>
            </div>
        </header>
    );
}
