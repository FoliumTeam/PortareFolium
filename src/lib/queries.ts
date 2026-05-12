import { cache } from "react";
import { serverClient } from "@/lib/supabase";
import { readPostContentById } from "@/lib/post-content-chunks";

// request 단위 포스트 조회 캐싱 (generateMetadata + page 컴포넌트 중복 DB 호출 제거)
export const getPost = cache(async (slug: string) => {
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
});

// request 단위 포트폴리오 아이템 조회 캐싱
export const getPortfolioItem = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .single();
    return data;
});

// 전체 site_config 조회 캐싱 (root layout, frontend layout, 페이지 간 중복 제거)
export const getSiteConfig = cache(async () => {
    if (!serverClient) return [] as { key: string; value: unknown }[];
    const { data } = await serverClient
        .from("site_config")
        .select("key, value");
    return (data ?? []) as { key: string; value: unknown }[];
});

// generateMetadata 전용 — content 제외 경량 쿼리
export const getPostMeta = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("posts")
        .select(
            "title, meta_title, meta_description, og_image, description, category, slug"
        )
        .eq("slug", slug)
        .single();
    return data;
});

// generateMetadata 전용 — content 제외 경량 쿼리
export const getPortfolioItemMeta = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("portfolio_items")
        .select(
            "title, meta_title, meta_description, og_image, thumbnail, description, slug"
        )
        .eq("slug", slug)
        .single();
    return data;
});

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
export const getBookMeta = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("books")
        .select(
            "title, meta_title, meta_description, og_image, cover_url, description, slug"
        )
        .eq("slug", slug)
        .single();
    return data;
});

export const getBook = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("books")
        .select("*")
        .eq("slug", slug)
        .single();
    return data;
});

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
export const getTags = cache(async () => {
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
});
