"use client";

/**
 * TableOfContents
 *
 * 블로그/포트폴리오 상세 페이지용 목차.
 * 데스크톱에서만 오른쪽 고정, IntersectionObserver로 현재 섹션 하이라이트.
 */
import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/toc";

interface TableOfContentsProps {
    entries: TocEntry[];
    contentSelector?: string;
    className?: string;
}

// TOC 항목에서 문서 순서대로 slug id 목록 추출
function getHeadingIds(
    entries: { slug: string; children: { slug: string }[] }[]
): string[] {
    const ids: string[] = [];
    for (const e of entries) {
        ids.push(e.slug);
        for (const c of e.children) ids.push(c.slug);
    }
    return ids;
}

export default function TableOfContents({
    entries,
    contentSelector = ".post-content",
    className = "",
}: TableOfContentsProps) {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    useEffect(() => {
        const itemIds = getHeadingIds(entries);
        if (itemIds.length === 0) return;

        // krrpinfo 방식: 헤딩 요소만 직접 관찰, 뷰포트 상단 20%를 활성 영역으로 사용
        // rootMargin: 상단 64px(헤더) 제외, 하단 80% 제외 → 상단 20% 영역에서 교차하는 헤딩이 활성
        const observer = new IntersectionObserver(
            (obsEntries) => {
                const intersecting = obsEntries
                    .filter((e) => e.isIntersecting)
                    .map((e) => ({
                        id: (e.target as HTMLElement).id,
                        top: e.boundingClientRect.top,
                    }))
                    .filter((x) => x.id);
                if (intersecting.length === 0) return;
                // 뷰포트 상단에 가장 가까운(먼저 보이는) 헤딩을 활성으로
                const active = intersecting.reduce((a, b) =>
                    a.top <= b.top ? a : b
                );
                setActiveSection(`#${active.id}`);
            },
            { rootMargin: "-64px 0% -80% 0%", threshold: 0 }
        );

        for (const id of itemIds) {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [entries]);

    if (entries.length === 0) return null;

    return (
        <nav
            className={`desktop:block sticky top-24 hidden max-h-[calc(100vh-8rem)] w-52 shrink-0 self-start overflow-y-auto overscroll-contain ${className}`}
            aria-label="목차"
        >
            <p className="mb-4 text-xs font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                On this page
            </p>
            <ul className="space-y-0.5 text-sm">
                {entries.map((entry, i) => {
                    const isActive = activeSection === `#${entry.slug}`;
                    return (
                        <li key={i}>
                            <a
                                href={`#${entry.slug}`}
                                className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors duration-150 ${
                                    isActive
                                        ? "border-(--color-accent) font-semibold text-(--color-accent)"
                                        : "border-transparent text-(--color-muted) hover:border-(--color-border) hover:text-(--color-foreground)"
                                }`}
                                aria-current={isActive ? "location" : undefined}
                            >
                                {entry.text}
                            </a>
                            {entry.children.length > 0 && (
                                <ul className="space-y-0.5">
                                    {entry.children.map((child, j) => {
                                        const isChildActive =
                                            activeSection === `#${child.slug}`;
                                        return (
                                            <li key={j}>
                                                <a
                                                    href={`#${child.slug}`}
                                                    className={`-ml-px block border-l-2 py-1 pl-6 text-sm transition-colors duration-150 ${
                                                        isChildActive
                                                            ? "border-(--color-accent) font-semibold text-(--color-accent)"
                                                            : "border-transparent text-(--color-muted) hover:border-(--color-border) hover:text-(--color-foreground)"
                                                    }`}
                                                    aria-current={
                                                        isChildActive
                                                            ? "location"
                                                            : undefined
                                                    }
                                                >
                                                    {child.text}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
