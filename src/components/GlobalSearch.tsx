"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchPublicContent } from "@/app/admin/actions/public-data";

interface SearchResult {
    slug: string;
    title: string;
    type: "post" | "portfolio";
}

export default function GlobalSearch({ jobField }: { jobField: string }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 닫기
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // ESC 닫기
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    // debounce 검색
    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            setResults([]);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            const items = await searchPublicContent(q, jobField);
            setResults(items as SearchResult[]);
            setLoading(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [query, jobField]);

    const handleOpen = useCallback(() => {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    const posts = results.filter((r) => r.type === "post");
    const portfolios = results.filter((r) => r.type === "portfolio");

    return (
        <div ref={containerRef} className="relative">
            {/* 검색 아이콘 버튼 */}
            {!open && (
                <button
                    type="button"
                    onClick={handleOpen}
                    className="rounded-md p-2 text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                    aria-label="Search"
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
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </button>
            )}

            {/* 검색 input + dropdown */}
            {open && (
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-48 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) placeholder:text-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            setQuery("");
                            setResults([]);
                        }}
                        className="rounded-md p-1.5 text-(--color-muted) hover:text-(--color-foreground)"
                        aria-label="Close search"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {/* 결과 dropdown */}
            {open && query.trim() && (
                <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xl border border-(--color-border) bg-(--color-surface) p-2 shadow-lg">
                    {loading ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-(--color-muted)">
                            <svg
                                className="h-4 w-4 animate-spin"
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
                            Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-(--color-muted)">
                            No results found.
                        </p>
                    ) : (
                        <>
                            {posts.length > 0 && (
                                <div>
                                    <p className="px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                                        Posts
                                    </p>
                                    {posts.map((r) => (
                                        <a
                                            key={r.slug}
                                            href={`/blog/${r.slug}`}
                                            className="block rounded-lg px-3 py-2 text-sm text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)"
                                            onClick={() => setOpen(false)}
                                        >
                                            {r.title}
                                        </a>
                                    ))}
                                </div>
                            )}
                            {portfolios.length > 0 && (
                                <div
                                    className={
                                        posts.length > 0
                                            ? "mt-2 border-t border-(--color-border) pt-2"
                                            : ""
                                    }
                                >
                                    <p className="px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                                        Portfolio
                                    </p>
                                    {portfolios.map((r) => (
                                        <a
                                            key={r.slug}
                                            href={`/portfolio/${r.slug}`}
                                            className="block rounded-lg px-3 py-2 text-sm text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)"
                                            onClick={() => setOpen(false)}
                                        >
                                            {r.title}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
