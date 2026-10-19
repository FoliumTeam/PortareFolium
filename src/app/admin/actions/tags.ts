"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

type TagPayload = { slug: string; name: string; color: string | null };
type TagItem = TagPayload & { count: number };
type CategoryPayload = { name: string };
type Category = CategoryPayload & { count: number };
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
async function getTagsPanelBootstrapInLocale(): Promise<{
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
async function saveTagItemInLocale(
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
async function deleteTagItemInLocale(
    slug: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient.from("tags").delete().eq("slug", slug);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 카테고리 생성
async function createPostCategoryInLocale(
    name: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const trimmed = name.trim();
    if (!trimmed)
        return { success: false, error: "카테고리 이름은 필수입니다." };

    const { error } = await serverClient
        .from("post_categories")
        .upsert({ name: trimmed } satisfies CategoryPayload, {
            onConflict: "name",
        });
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 카테고리 이름 변경
async function renamePostCategoryInLocale(
    oldName: string,
    newName: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const trimmed = newName.trim();
    if (!trimmed)
        return { success: false, error: "카테고리 이름은 필수입니다." };

    const { error: upsertError } = await serverClient
        .from("post_categories")
        .upsert({ name: trimmed } satisfies CategoryPayload, {
            onConflict: "name",
        });
    if (upsertError) return { success: false, error: upsertError.message };

    const { error: postsError } = await serverClient
        .from("posts")
        .update({ category: trimmed })
        .eq("category", oldName);
    if (postsError) return { success: false, error: postsError.message };

    if (oldName !== trimmed) {
        const { error: deleteError } = await serverClient
            .from("post_categories")
            .delete()
            .eq("name", oldName);
        if (deleteError) return { success: false, error: deleteError.message };
    }

    return { success: true };
}

// 카테고리 삭제
async function deletePostCategoryInLocale(
    name: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error: postsError } = await serverClient
        .from("posts")
        .update({ category: null })
        .eq("category", name);
    if (postsError) return { success: false, error: postsError.message };

    const { error: categoryError } = await serverClient
        .from("post_categories")
        .delete()
        .eq("name", name);
    if (categoryError) return { success: false, error: categoryError.message };

    return { success: true };
}

// 태그를 사용하는 포스트 lazy 조회
async function listPostsByTagSlugInLocale(
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
async function listPostsByCategoryNameInLocale(
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

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getTagsPanelBootstrap(
    ...args: [
        ...Parameters<typeof getTagsPanelBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getTagsPanelBootstrapInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getTagsPanelBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getTagsPanelBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveTagItem(
    ...args: [...Parameters<typeof saveTagItemInLocale>, ContentLocaleScope?]
): Promise<Awaited<ReturnType<typeof saveTagItemInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveTagItemInLocale>;
    return withContentLocale(locale, () => saveTagItemInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deleteTagItem(
    ...args: [...Parameters<typeof deleteTagItemInLocale>, ContentLocaleScope?]
): Promise<Awaited<ReturnType<typeof deleteTagItemInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deleteTagItemInLocale>;
    return withContentLocale(locale, () => deleteTagItemInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function createPostCategory(
    ...args: [
        ...Parameters<typeof createPostCategoryInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof createPostCategoryInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof createPostCategoryInLocale>;
    return withContentLocale(locale, () =>
        createPostCategoryInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function renamePostCategory(
    ...args: [
        ...Parameters<typeof renamePostCategoryInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof renamePostCategoryInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof renamePostCategoryInLocale>;
    return withContentLocale(locale, () =>
        renamePostCategoryInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deletePostCategory(
    ...args: [
        ...Parameters<typeof deletePostCategoryInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof deletePostCategoryInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deletePostCategoryInLocale>;
    return withContentLocale(locale, () =>
        deletePostCategoryInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function listPostsByTagSlug(
    ...args: [
        ...Parameters<typeof listPostsByTagSlugInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof listPostsByTagSlugInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof listPostsByTagSlugInLocale>;
    return withContentLocale(locale, () =>
        listPostsByTagSlugInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function listPostsByCategoryName(
    ...args: [
        ...Parameters<typeof listPostsByCategoryNameInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof listPostsByCategoryNameInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof listPostsByCategoryNameInLocale>;
    return withContentLocale(locale, () =>
        listPostsByCategoryNameInLocale(...values)
    );
}

// 화면 언어와 독립적인 관리자 입력 태그 목록
export async function listContentTags(scope?: ContentLocaleScope) {
    await requireAdminSession();
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    return withContentLocale(locale, async () => {
        if (!serverClient) return [];
        const { data, error } = await serverClient
            .from("tags")
            .select("slug, name, color")
            .order("name");
        if (error) throw new Error("태그 조회 실패");
        return (data ?? []) as {
            slug: string;
            name: string;
            color: string | null;
        }[];
    });
}
