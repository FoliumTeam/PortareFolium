import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import type { Locale } from "@/lib/i18n";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { serverClient } from "@/lib/supabase";
import { readPostContentById } from "@/lib/post-content-chunks";
import type { ResumeBasics } from "@/types/resume";

export const PUBLIC_CONTENT_CACHE_TAG = "public-content";

const PUBLIC_CONTENT_CACHE_OPTIONS = {
    revalidate: 3600,
    tags: [PUBLIC_CONTENT_CACHE_TAG],
};

// 언어를 명시적 캐시 인수에 포함한 요청 간 저장
const localizedCache = <Args extends unknown[], Result>(
    action: (...args: Args) => Promise<Result>,
    keys: string[],
    options: typeof PUBLIC_CONTENT_CACHE_OPTIONS
) => {
    const cached = unstable_cache(
        (locale: Locale, ...args: Args) =>
            withContentLocale(locale, () => action(...args)),
        keys,
        options
    );
    return (...args: Args) => cached(getContentLocale(), ...args);
};

// request 단위 포스트 조회 캐싱 (generateMetadata + page 컴포넌트 중복 DB 호출 제거)
const getCachedPost = localizedCache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("posts")
            .select("*")
            .eq("slug", slug)
            .eq("published", true)
            .single();
        if (!data) return data;
        const { content } = await readPostContentById(
            data.id as string,
            typeof data.content === "string" ? data.content : ""
        );
        return { ...data, content };
    },
    ["post"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPost = cache(getCachedPost);

const getPortfolioItemUncached = async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();
    return data;
};

// 배포 환경의 공개 포트폴리오 아이템 조회 캐싱
const getCachedPortfolioItem = localizedCache(
    getPortfolioItemUncached,
    ["portfolio-item"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPortfolioItem = cache(
    process.env.NODE_ENV === "development"
        ? getPortfolioItemUncached
        : getCachedPortfolioItem
);

// 전체 site_config 조회 캐싱 (root layout, frontend layout, 페이지 간 중복 제거)
const getCachedSiteConfig = localizedCache(
    async () => {
        if (!serverClient) return [] as { key: string; value: unknown }[];
        const { data } = await serverClient
            .from("site_config")
            .select("key, value");
        const rows = (data ?? []) as { key: string; value: unknown }[];
        const locale = getContentLocale();
        if (locale === "ko") return rows;
        const { data: translated } = await serverClient
            .from("site_config_i18n")
            .select("key, value")
            .eq("lang", locale);
        const overrides = new Map<string, unknown>(
            (translated ?? []).map((row) => [String(row.key), row.value])
        );
        const textKeys = new Set([
            "site_name",
            "header_name",
            "seo_config",
            "navigation_config",
            "footer_config",
        ]);
        return rows
            .map((row) => {
                if (overrides.has(row.key))
                    return { ...row, value: overrides.get(row.key) };
                if (textKeys.has(row.key))
                    return {
                        ...row,
                        value: row.key === "site_name" ? "PortareFolium" : "",
                    };
                if (row.key === "job_fields" && Array.isArray(row.value))
                    return {
                        ...row,
                        value: row.value.map(
                            (field: Record<string, unknown>) => ({
                                ...field,
                                name: String(field.id),
                                headerTitle: String(field.id),
                            })
                        ),
                    };
                return row;
            })
            .concat(
                (translated ?? []).filter(
                    (row) => !rows.some((source) => source.key === row.key)
                )
            );
    },
    ["site-config"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getSiteConfig = cache(getCachedSiteConfig);

const getCachedResumeBasics = localizedCache(
    async (): Promise<ResumeBasics> => {
        if (!serverClient) return {};
        const { data } = await serverClient
            .from("resume_data")
            .select("data")
            .eq("lang", "ko")
            .single();
        const basics = (data?.data as { basics?: ResumeBasics } | undefined)
            ?.basics;
        return basics ?? {};
    },
    ["resume-basics"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPublicResumeBasics = cache(getCachedResumeBasics);

// generateMetadata 전용 — content 제외 경량 쿼리
const getCachedPostMeta = localizedCache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("posts")
            .select(
                "title, meta_title, meta_description, og_image, thumbnail, description, category, slug"
            )
            .eq("slug", slug)
            .eq("published", true)
            .single();
        return data;
    },
    ["post-meta"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPostMeta = cache(getCachedPostMeta);

// generateMetadata 전용 — content 제외 경량 쿼리
const getCachedPortfolioItemMeta = localizedCache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("portfolio_items")
            .select(
                "title, meta_title, meta_description, og_image, thumbnail, description"
            )
            .eq("slug", slug)
            .eq("published", true)
            .single();
        return data;
    },
    ["portfolio-item-meta"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPortfolioItemMeta = cache(getCachedPortfolioItemMeta);

// 빌드 타임 generateStaticParams 전용 (cache 불필요)
export async function getAllPostSlugs() {
    if (!serverClient) return [];
    const { data } = await serverClient
        .from("posts")
        .select("slug")
        .eq("published", true);
    return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function getAllPortfolioSlugs() {
    if (!serverClient) return [];
    const { data } = await serverClient
        .from("portfolio_items")
        .select("slug")
        .eq("published", true);
    return (data ?? []).map((p) => ({ slug: p.slug }));
}

// generateMetadata 전용 — content 제외 경량 쿼리
const getCachedBookMeta = localizedCache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("books")
            .select(
                "title, meta_title, meta_description, og_image, cover_url, description, slug"
            )
            .eq("slug", slug)
            .eq("published", true)
            .single();
        return data;
    },
    ["book-meta"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getBookMeta = cache(getCachedBookMeta);

const getCachedBook = localizedCache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("books")
            .select("*")
            .eq("slug", slug)
            .eq("published", true)
            .single();
        return data;
    },
    ["book"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getBook = cache(getCachedBook);

// 빌드 타임 generateStaticParams 전용 (cache 불필요)
export async function getAllBookSlugs() {
    if (!serverClient) return [];
    const { data } = await serverClient
        .from("books")
        .select("slug")
        .eq("published", true);
    return (data ?? []).map((p) => ({ slug: p.slug }));
}

// tags 전체 조회 캐싱
const getCachedTags = localizedCache(
    async () => {
        if (!serverClient)
            return [] as { slug: string; name: string; color: string | null }[];
        const { data } = await serverClient
            .from("tags")
            .select("slug, name, color");
        return (data ?? []) as {
            slug: string;
            name: string;
            color: string | null;
        }[];
    },
    ["tags"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getTags = cache(getCachedTags);
