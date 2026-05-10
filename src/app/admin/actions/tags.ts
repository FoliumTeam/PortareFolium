"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

type TagItem = { slug: string; name: string; color: string | null };
type Category = { name: string; count: number };
type TaxonomyPost = {
    id: string;
    slug: string;
    title: string;
    pub_date: string;
    published: boolean;
    updated_at: string;
};

const TAXONOMY_POST_SELECT_FIELDS =
    "id, slug, title, pub_date, published, updated_at";

// tags / categories 초기 데이터 조회
export async function getTagsPanelBootstrap(): Promise<{
    tags: TagItem[];
    categories: Category[];
}> {
    await requireAdminSession();
    if (!serverClient) return { tags: [], categories: [] };

    const [{ data: tagsData }, { data: categoriesData }] = await Promise.all([
        serverClient.from("tags").select("slug, name, color").order("name"),
        serverClient
            .from("posts")
            .select("category")
            .not("category", "is", null),
    ]);

    const counts = new Map<string, number>();
    for (const row of categoriesData ?? []) {
        if (row.category?.trim()) {
            counts.set(
                row.category.trim(),
                (counts.get(row.category.trim()) ?? 0) + 1
            );
        }
    }

    return {
        tags: (tagsData as TagItem[] | null) ?? [],
        categories: [...counts.entries()].map(([name, count]) => ({
            name,
            count,
        })),
    };
}

// 태그 생성/수정
export async function saveTagItem(
    payload: TagItem,
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
        .from("posts")
        .select(TAXONOMY_POST_SELECT_FIELDS)
        .contains("tags", [slug])
        .order("pub_date", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, posts: (data as TaxonomyPost[] | null) ?? [] };
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
        .order("pub_date", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, posts: (data as TaxonomyPost[] | null) ?? [] };
}
