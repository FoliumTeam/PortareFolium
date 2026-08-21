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

// request 단위 포스트 조회 캐싱 (generateMetadata + page 컴포넌트 중복 DB 호출 제거)
const getCachedPost = unstable_cache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("posts")
            .select("*")
            .eq("slug", slug)
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
const getCachedPortfolioItem = unstable_cache(
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
const getCachedSiteConfig = unstable_cache(
    async () => {
        if (!serverClient) return [] as { key: string; value: unknown }[];
        const { data } = await serverClient
            .from("site_config")
            .select("key, value");
        return (data ?? []) as { key: string; value: unknown }[];
    },
    ["site-config"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getSiteConfig = cache(getCachedSiteConfig);

const getCachedResumeBasics = unstable_cache(
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
const getCachedPostMeta = unstable_cache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("posts")
            .select(
                "title, meta_title, meta_description, og_image, description, category, slug"
            )
            .eq("slug", slug)
            .single();
        return data;
    },
    ["post-meta"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getPostMeta = cache(getCachedPostMeta);

// generateMetadata 전용 — content 제외 경량 쿼리
const getCachedPortfolioItemMeta = unstable_cache(
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
const getCachedBookMeta = unstable_cache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("books")
            .select(
                "title, meta_title, meta_description, og_image, cover_url, description, slug"
            )
            .eq("slug", slug)
            .single();
        return data;
    },
    ["book-meta"],
    PUBLIC_CONTENT_CACHE_OPTIONS
);

export const getBookMeta = cache(getCachedBookMeta);

const getCachedBook = unstable_cache(
    async (slug: string) => {
        if (!serverClient) return null;
        const { data } = await serverClient
            .from("books")
            .select("*")
            .eq("slug", slug)
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
const getCachedTags = unstable_cache(
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
