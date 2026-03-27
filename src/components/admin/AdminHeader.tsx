"use client";

import { Search } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminHeaderProps {
    timeLeft: number;
    onLogout: () => void;
    onCommandOpen?: () => void;
    onMenuOpen?: () => void;
}

// 남은 시간을 MM:SS 형식으로 변환
function formatRemaining(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// 어드민 헤더 (사이트 링크, 타이머, 테마 토글, 로그아웃)
export default function AdminHeader({
    timeLeft,
    onLogout,
    onCommandOpen,
    onMenuOpen,
}: AdminHeaderProps) {
    return (
        <header className="tablet:px-6 flex h-14 items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-3">
            <div className="tablet:gap-4 flex items-center gap-2">
                {onMenuOpen && (
                    <button
                        onClick={onMenuOpen}
                        className="tablet:hidden rounded-md p-1.5 text-(--color-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                        aria-label="메뉴 열기"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <span
                        className="h-2.5 w-2.5 rounded-full bg-(--color-accent)"
                        aria-hidden="true"
                    />
                    <span className="text-base font-black tracking-tight text-(--color-foreground)">
                        Admin 대시보드
                    </span>
                </div>
            </div>
            <div className="tablet:gap-3 flex items-center gap-2">
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
                {onCommandOpen && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onCommandOpen}
                                    className="rounded-md p-1.5 text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>⌘K</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
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
