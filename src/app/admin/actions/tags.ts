"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

type TagPayload = { slug: string; name: string; color: string | null };
type TagItem = TagPayload & { count: number };
type Category = { name: string; count: number };
type TagCountRow = { tag_slug: string; count: number };
type CategoryCountRow = { category: string; count: number };
type TaxonomyPost = {
    id: string;
    slug: string;
    title: string;
    pub_date: string;
    published: boolean;
    updated_at: string;
};
type PostTagPreviewRow = {
    posts: TaxonomyPost | TaxonomyPost[] | null;
};

const TAXONOMY_POST_SELECT_FIELDS =
    "id, slug, title, pub_date, published, updated_at";
const TAXONOMY_POST_PREVIEW_LIMIT = 20;

// tags / categories 초기 데이터 조회
export async function getTagsPanelBootstrap(): Promise<{
    tags: TagItem[];
    categories: Category[];
}> {
    await requireAdminSession();
    if (!serverClient) return { tags: [], categories: [] };

    const [tagsRes, tagCountsRes, categoryCountsRes] = await Promise.all([
        serverClient.from("tags").select("slug, name, color").order("name"),
        serverClient.from("post_tag_counts").select("tag_slug, count"),
        serverClient.from("post_category_counts").select("category, count"),
    ]);

    const tagCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    if (tagCountsRes.error || categoryCountsRes.error) {
        const { data: postsData } = await serverClient
            .from("posts")
            .select("category, tags");

        for (const row of postsData ?? []) {
            if (row.category?.trim()) {
                categoryCounts.set(
                    row.category.trim(),
                    (categoryCounts.get(row.category.trim()) ?? 0) + 1
                );
            }
            const uniqueTags = new Set<string>();
            for (const tag of row.tags ?? []) {
                if (typeof tag !== "string") continue;
                const trimmedTag = tag.trim();
                if (!trimmedTag) continue;
                uniqueTags.add(trimmedTag);
            }
            for (const tag of uniqueTags) {
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
    } else {
        for (const row of (tagCountsRes.data as TagCountRow[] | null) ?? []) {
            tagCounts.set(row.tag_slug, row.count);
        }
        for (const row of (categoryCountsRes.data as
            | CategoryCountRow[]
            | null) ?? []) {
            if (!row.category.trim()) continue;
            categoryCounts.set(row.category, row.count);
        }
    }

    return {
        tags: ((tagsRes.data as TagPayload[] | null) ?? []).map((tag) => ({
            ...tag,
            count: tagCounts.get(tag.slug.trim()) ?? 0,
        })) satisfies TagItem[],
        categories: [...categoryCounts.entries()].map(([name, count]) => ({
            name,
            count,
        })),
    };
}

// 태그 생성/수정
export async function saveTagItem(
    payload: TagPayload,
    editSlug: string | "new" | null
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    if (editSlug === "new") {
        const { error } = await serverClient.from("tags").insert(payload);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await serverClient
            .from("tags")
            .update(payload)
            .eq("slug", editSlug);
        if (error) return { success: false, error: error.message };
    }
    return { success: true };
}

// 태그 삭제
export async function deleteTagItem(
    slug: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient.from("tags").delete().eq("slug", slug);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 카테고리 이름 변경
export async function renamePostCategory(
    oldName: string,
    newName: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("posts")
        .update({ category: newName.trim() })
        .eq("category", oldName);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 카테고리 삭제
export async function deletePostCategory(
    name: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("posts")
        .update({ category: null })
        .eq("category", name);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 태그를 사용하는 포스트 lazy 조회
export async function listPostsByTagSlug(
    slug: string
): Promise<{ success: boolean; posts?: TaxonomyPost[]; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data, error } = await serverClient
        .from("post_tags")
        .select(`posts!inner(${TAXONOMY_POST_SELECT_FIELDS})`)
        .eq("tag_slug", slug)
        .order("pub_date", { ascending: false })
        .limit(TAXONOMY_POST_PREVIEW_LIMIT);

    if (error) {
        const fallback = await serverClient
            .from("posts")
            .select(TAXONOMY_POST_SELECT_FIELDS)
            .contains("tags", [slug])
            .order("pub_date", { ascending: false })
            .limit(TAXONOMY_POST_PREVIEW_LIMIT);

        if (fallback.error) {
            return { success: false, error: fallback.error.message };
        }
        return {
            success: true,
            posts: (fallback.data as TaxonomyPost[] | null) ?? [],
        };
    }

    const posts = ((data as PostTagPreviewRow[] | null) ?? []).flatMap(
        (row) => {
            if (!row.posts) return [];
            return Array.isArray(row.posts) ? row.posts : [row.posts];
        }
    );
    return { success: true, posts };
}

// 카테고리를 사용하는 포스트 lazy 조회
export async function listPostsByCategoryName(
    name: string
): Promise<{ success: boolean; posts?: TaxonomyPost[]; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data, error } = await serverClient
        .from("posts")
        .select(TAXONOMY_POST_SELECT_FIELDS)
        .eq("category", name)
        .order("pub_date", { ascending: false })
        .limit(TAXONOMY_POST_PREVIEW_LIMIT);

    if (error) return { success: false, error: error.message };
    return { success: true, posts: (data as TaxonomyPost[] | null) ?? [] };
}
