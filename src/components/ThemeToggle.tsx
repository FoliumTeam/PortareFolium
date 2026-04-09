"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

// 테마 레이블
const themeLabels: Record<Theme, string> = {
    light: "라이트",
    dark: "다크",
    system: "시스템",
};

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
            setTheme(savedTheme);
        }
    }, []);

    // dark/light 클래스 적용
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        const systemDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        if (theme === "dark" || (theme === "system" && systemDark)) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
        window.dispatchEvent(new CustomEvent("themechange"));
    }, [theme, mounted]);

    // 시스템 테마 변경 감지
    useEffect(() => {
        if (!mounted || theme !== "system") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (media.matches) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            window.dispatchEvent(new CustomEvent("themechange"));
        };

        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, [theme, mounted]);

    const handleThemeSelect = (t: Theme) => {
        setTheme(t);
        setIsOpen(false);
    };

    if (!mounted) {
        return (
            <div className="h-10 w-10 animate-pulse rounded-md bg-(--color-muted)/20" />
        );
    }

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="rounded-md p-2 text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                aria-label="테마 선택"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {theme === "light" && (
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
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                )}
                {theme === "dark" && (
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
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                    </svg>
                )}
                {theme === "system" && (
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
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div
                    className="absolute top-full right-0 z-35 min-w-[140px] pt-1"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="rounded-md border border-(--color-border) bg-(--color-surface) py-1 shadow-lg">
                        {(["light", "dark", "system"] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                role="menuitem"
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                    theme === t
                                        ? "bg-(--color-accent)/10 text-(--color-accent)"
                                        : "text-(--color-foreground) hover:bg-(--color-muted)/10"
                                }`}
                                onClick={() => handleThemeSelect(t)}
                            >
                                {t === "light" && (
                                    <svg
                                        className="h-4 w-4 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                                        />
                                    </svg>
                                )}
                                {t === "dark" && (
                                    <svg
                                        className="h-4 w-4 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                        />
                                    </svg>
                                )}
                                {t === "system" && (
                                    <svg
                                        className="h-4 w-4 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                )}
                                {themeLabels[t]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
