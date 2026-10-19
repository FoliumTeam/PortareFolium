"use client";
import { LocalizedElement, LocalizedText } from "@/components/LocalizedText";

import { Search } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminHeaderProps {
    timeLeft: number;
    onLogout: () => void;
    onCommandOpen?: () => void;
    onMenuOpen?: () => void;
    sidebarVisible?: boolean;
    onToggleSidebar?: () => void;
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
    sidebarVisible,
    onToggleSidebar,
}: AdminHeaderProps) {
    return (
        <header className="tablet:px-6 flex h-14 items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-3">
            <div className="tablet:gap-4 flex items-center gap-2">
                {onMenuOpen && (
                    <LocalizedElement
                        as="button"
                        translatedProps={["aria-label"]}
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
                    </LocalizedElement>
                )}
                {/* 데스크톱 사이드바 토글 */}
                {onToggleSidebar && (
                    <LocalizedElement
                        as="button"
                        messageProps={{
                            "aria-label": sidebarVisible
                                ? { text: "사이드바 숨기기" }
                                : { text: "사이드바 보이기" },
                        }}
                        onClick={onToggleSidebar}
                        className="tablet:block hidden rounded-md bg-(--color-surface-subtle) p-1.5 text-(--color-muted) transition-colors hover:bg-(--color-border) hover:text-(--color-foreground)"
                        aria-label={
                            sidebarVisible
                                ? "사이드바 숨기기"
                                : "사이드바 보이기"
                        }
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {sidebarVisible ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                />
                            )}
                        </svg>
                    </LocalizedElement>
                )}
                <div className="flex items-center gap-2">
                    <span
                        className="h-2 w-2 rounded-full bg-(--color-accent) ring-2 ring-(--color-accent)/25"
                        aria-hidden="true"
                    />
                    <span className="text-base font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                        <LocalizedText text={"Admin 대시보드"} />
                    </span>
                </div>
            </div>
            <div className="tablet:gap-3 flex items-center gap-2">
                {/* 세션 타이머 pill */}
                <span
                    className={[
                        "rounded-md px-2 py-0.5 font-mono text-xs tabular-nums",
                        timeLeft <= 5 * 60 * 1000
                            ? "bg-red-500/10 text-red-500"
                            : "bg-(--color-surface-subtle) text-(--color-muted)",
                    ].join(" ")}
                >
                    {formatRemaining(timeLeft)}
                </span>
                {onCommandOpen && (
                    <button
                        onClick={onCommandOpen}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        <Search className="h-4 w-4" />
                        <kbd className="tablet:inline-flex hidden rounded border border-(--color-border) px-1.5 py-0.5 font-mono text-[10px]">
                            <LocalizedText text={"⌘K"} />
                        </kbd>
                    </button>
                )}
                <ThemeToggle />
                {/* 로그아웃 버튼 */}
                <button
                    onClick={onLogout}
                    className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs font-semibold text-(--color-muted) transition-colors hover:border-red-400/60 hover:bg-red-500/8 hover:text-red-500"
                >
                    <LocalizedText text={"로그아웃"} />
                </button>
            </div>
        </header>
    );
}
