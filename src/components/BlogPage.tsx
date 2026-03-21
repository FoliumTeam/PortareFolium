"use client";

/**
 * Blog 목록 페이지: 좌측 카테고리/태그 필터, 포스트 카드 (썸네일 오른쪽, 텍스트 왼쪽)
 * 모바일에서 사이드바는 햄버거로 토글.
 * URL 쿼리 ?category=...&tag=... 로 필터 공유 가능.
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";

/** 태그 색상으로 사용해도 안전한 CSS 값인지 검사 (hex 3/6/8자리, rgb, rgba만 허용) */
function isSafeCssColor(value: string): boolean {
    const t = value.trim();
    if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return true;
    if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(t)) return true;
    if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(t))
        return true;
    return false;
}

/** 배경색의 상대 휘도에 따라 대비되는 글자색 반환 (white or black) */
function getContrastTextColor(bgColor: string): "#ffffff" | "#111111" {
    const rgb = parseCssColorToRgb(bgColor);
    if (!rgb) return "#111111";
    const { r, g, b } = rgb;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#111111" : "#ffffff";
}

function parseCssColorToRgb(
    value: string
): { r: number; g: number; b: number } | null {
    const t = value.trim();
    const hex3 = /^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/.exec(t);
    if (hex3)
        return {
            r: parseInt(hex3[1] + hex3[1], 16),
            g: parseInt(hex3[2] + hex3[2], 16),
            b: parseInt(hex3[3] + hex3[3], 16),
        };
    const hex6 = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/.exec(t);
    if (hex6)
        return {
            r: parseInt(hex6[1], 16),
            g: parseInt(hex6[2], 16),
            b: parseInt(hex6[3], 16),
        };
    const hex8 = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/.exec(t);
    if (hex8)
        return {
            r: parseInt(hex8[1], 16),
            g: parseInt(hex8[2], 16),
            b: parseInt(hex8[3], 16),
        };
    const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(t);
    if (rgbMatch)
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
        };
    const rgbaMatch =
        /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/.exec(t);
    if (rgbaMatch)
        return {
            r: parseInt(rgbaMatch[1], 10),
            g: parseInt(rgbaMatch[2], 10),
            b: parseInt(rgbaMatch[3], 10),
        };
    return null;
}

export interface PostItem {
    slug: string;
    title: string;
    displayDescription: string;
    pubDateFormatted: string;
    pubDateIso: string;
    category: string | null;
    /** 태그 slug 배열 (필터링용) */
    tags: string[];
    /** 태그 표시용 (이름 + Admin에서 설정한 색상) */
    tagsDisplay: { name: string; color?: string }[];
    thumbnailUrl: string | null;
}

export interface FilterMeta {
    name: string;
    count: number;
    /** 태그 필터용: slug(선택 시 필터에 사용), 없으면 name으로 필터 */
    slug?: string;
}

interface Props {
    posts: PostItem[];
    categories: FilterMeta[];
    tags: FilterMeta[];
    /** dev 모드에서만 true, Admin 포스트 작성 버튼 표시 */
    showWritePost?: boolean;
}

const ALL_CATEGORY = "all";

function readFiltersFromSearch(
    search: string,
    categoryNames: string[],
    tagSlugs: string[]
): { category: string; tag: string | null } {
    const params = new URLSearchParams(search);
    const cat = params.get("category");
    const tag = params.get("tag");
    const category =
        !cat || cat === "all" || !categoryNames.includes(cat)
            ? ALL_CATEGORY
            : cat;
    const tagValue = !tag || !tagSlugs.includes(tag) ? null : tag;
    return { category, tag: tagValue };
}

export default function BlogPage({
    posts,
    categories,
    tags,
    showWritePost = false,
}: Props) {
    const categoryNames = useMemo(
        () => categories.map((c) => c.name),
        [categories]
    );
    const tagSlugs = useMemo(() => tags.map((t) => t.slug ?? t.name), [tags]);

    const [selectedCategory, setSelectedCategory] =
        useState<string>(ALL_CATEGORY);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const hasSyncedFromUrl = useRef(false);

    useEffect(() => {
        const { category, tag } = readFiltersFromSearch(
            window.location.search,
            categoryNames,
            tagSlugs
        );
        setSelectedCategory(category);
        setSelectedTag(tag);
        hasSyncedFromUrl.current = true;
    }, [categoryNames, tagSlugs]);

    const updateUrl = useCallback((category: string, tag: string | null) => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams();
        if (category && category !== ALL_CATEGORY) {
            params.set("category", category);
        }
        if (tag) {
            params.set("tag", tag);
        }
        const query = params.toString();
        const url = query ? `/blog?${query}` : "/blog";
        window.history.replaceState({ category, tag }, "", url);
    }, []);

    useEffect(() => {
        if (!hasSyncedFromUrl.current) return;
        updateUrl(selectedCategory, selectedTag);
    }, [selectedCategory, selectedTag, updateUrl]);

    useEffect(() => {
        const onPopState = () => {
            const { category, tag } = readFiltersFromSearch(
                window.location.search,
                categoryNames,
                tagSlugs
            );
            setSelectedCategory(category);
            setSelectedTag(tag);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [categoryNames, tagSlugs]);

    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            const matchCategory =
                selectedCategory === ALL_CATEGORY ||
                post.category === selectedCategory;
            const matchTag =
                selectedTag == null ||
                (post.tags &&
                    selectedTag != null &&
                    post.tags.includes(selectedTag));
            return matchCategory && matchTag;
        });
    }, [posts, selectedCategory, selectedTag]);

    return (
        <div className="tablet:flex-row flex flex-col gap-8">
            {/* Hamburger + title + Write post: mobile top row */}
            <div className="tablet:hidden flex flex-wrap items-center gap-4">
                <button
                    type="button"
                    onClick={() => setSidebarOpen((o) => !o)}
                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-2.5 text-(--color-foreground) transition-colors hover:border-(--color-accent)"
                    aria-label="Toggle filters"
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
                <h1 className="flex-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                    Blog
                </h1>
                {showWritePost && (
                    <a
                        href="/keystatic"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-full bg-(--color-accent) px-4 py-2 text-sm font-medium text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        Write post
                    </a>
                )}
            </div>

            {/* Sidebar: categories + tags */}
            <aside
                className={`tablet:sticky tablet:top-20 tablet:w-52 tablet:block tablet:self-start flex w-full shrink-0 flex-col gap-6 ${sidebarOpen ? "block" : "hidden"}`}
            >
                <div className="space-y-2">
                    <h2 className="text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                        Categories
                    </h2>
                    <ul className="space-y-0.5">
                        <li>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCategory(ALL_CATEGORY);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                    selectedCategory === ALL_CATEGORY
                                        ? "bg-(--color-accent) text-(--color-on-accent)"
                                        : "text-(--color-foreground) hover:bg-(--color-surface-subtle)"
                                }`}
                            >
                                All ({posts.length})
                            </button>
                        </li>
                        {categories.map(({ name, count }) => (
                            <li key={name}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(name);
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                        selectedCategory === name
                                            ? "bg-(--color-accent) text-(--color-on-accent)"
                                            : "text-(--color-foreground) hover:bg-(--color-surface-subtle)"
                                    }`}
                                >
                                    {name} ({count})
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {tags.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                            Tags
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(({ slug, name, count }) => {
                                const value = slug ?? name;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTag(
                                                selectedTag === value
                                                    ? null
                                                    : value
                                            );
                                            setSidebarOpen(false);
                                        }}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                            selectedTag === value
                                                ? "bg-(--color-accent) text-(--color-on-accent)"
                                                : "border border-(--color-border) text-(--color-foreground) hover:border-(--color-accent) hover:text-(--color-accent)"
                                        }`}
                                    >
                                        {name} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </aside>

            {/* Main: post list */}
            <div className="min-w-0 flex-1">
                <div className="tablet:flex tablet:items-end tablet:justify-between tablet:gap-4 mb-8 hidden">
                    <h1 className="text-3xl font-black tracking-tight text-(--color-foreground)">
                        Blog
                    </h1>
                    {showWritePost && (
                        <a
                            href="/admin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full bg-(--color-accent) px-4 py-2 text-sm font-medium text-(--color-on-accent) transition-opacity hover:opacity-90"
                        >
                            Write post
                        </a>
                    )}
                </div>
                {filteredPosts.length === 0 ? (
                    <p className="text-(--color-muted)">
                        No posts match the current filters.
                    </p>
                ) : (
                    <ul className="space-y-4">
                        {filteredPosts.map((post) => (
                            <li key={post.slug}>
                                <a
                                    href={`/blog/${post.slug}`}
                                    className="card-lift group tablet:flex-row flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                                >
                                    <div className="tablet:order-1 order-2 min-w-0 flex-1">
                                        {post.category && (
                                            <p className="mb-1.5 text-xs font-semibold tracking-wider text-(--color-accent) uppercase">
                                                {post.category}
                                            </p>
                                        )}
                                        <h2 className="mb-1.5 text-base leading-snug font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                            {post.title}
                                        </h2>
                                        <p className="mb-3 line-clamp-2 text-sm text-(--color-muted)">
                                            {post.displayDescription}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {post.tagsDisplay &&
                                                post.tagsDisplay.length > 0 &&
                                                post.tagsDisplay.map((tag) => {
                                                    const safeColor =
                                                        tag.color &&
                                                        isSafeCssColor(
                                                            tag.color
                                                        )
                                                            ? tag.color
                                                            : undefined;
                                                    const bgColor = safeColor
                                                        ? /^#[0-9A-Fa-f]{6}$/.test(
                                                              safeColor
                                                          )
                                                            ? safeColor
                                                            : /^#[0-9A-Fa-f]{8}$/.test(
                                                                    safeColor
                                                                )
                                                              ? `#${safeColor.slice(1, 7)}`
                                                              : safeColor
                                                        : undefined;
                                                    const textColor = bgColor
                                                        ? getContrastTextColor(
                                                              bgColor
                                                          )
                                                        : "#ffffff";
                                                    return (
                                                        <span
                                                            key={tag.name}
                                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${!bgColor ? "bg-(--color-accent) text-(--color-on-accent)" : ""}`}
                                                            style={
                                                                bgColor
                                                                    ? {
                                                                          backgroundColor:
                                                                              bgColor,
                                                                          color: textColor,
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    );
                                                })}
                                            <time
                                                className="ml-auto text-xs text-(--color-muted)"
                                                dateTime={post.pubDateIso}
                                            >
                                                {post.pubDateFormatted}
                                            </time>
                                        </div>
                                    </div>
                                    {post.thumbnailUrl && (
                                        <div className="tablet:w-36 tablet:h-24 tablet:order-2 tablet:shrink-0 order-1 aspect-video w-full overflow-hidden rounded-xl bg-(--color-surface)">
                                            <img
                                                src={post.thumbnailUrl}
                                                alt=""
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                                            />
                                        </div>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
