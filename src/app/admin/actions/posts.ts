"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import { revalidatePost } from "@/app/admin/actions/revalidate";

const POST_SELECT_FIELDS =
    "id, slug, title, description, pub_date, category, tags, job_field, thumbnail, content, published, updated_at, meta_title, meta_description, og_image";
const POST_BOOTSTRAP_SELECT_FIELDS =
    "id, slug, title, description, pub_date, category, tags, job_field, thumbnail, published, updated_at, meta_title, meta_description, og_image";

type AdminPostRow = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
    job_field: string[] | string | null;
    thumbnail: string | null;
    content: string;
    published: boolean;
    updated_at: string;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type JobFieldItem = { id: string; name: string; emoji: string };
type CategoryCountRow = { category: string; count: number };

type PostPayload = {
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
    job_field: string[] | null;
    thumbnail: string | null;
    content: string;
    published: boolean;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type PostsPanelBootstrap = {
    posts: AdminPostRow[];
    stateCounts: Record<string, number>;
    jobFields: JobFieldItem[];
    activeJobField: string;
    postTocStyles: Record<string, string>;
    categories: string[];
};

// PostsPanel 초기 데이터 조회
export async function getPostsPanelBootstrap(): Promise<PostsPanelBootstrap> {
    await requireAdminSession();
    if (!serverClient) {
        return {
            posts: [],
            stateCounts: {},
            jobFields: [],
            activeJobField: "",
            postTocStyles: {},
            categories: [],
        };
    }

    const [
        { data: postsData, error: postsError },
        { data: stateData, error: stateError },
        { data: jobFieldsRow, error: jobFieldsError },
        { data: activeJobFieldRow, error: activeJobFieldError },
        { data: tocStylesRow, error: tocStylesError },
        { data: categoryRows, error: categoriesError },
    ] = await Promise.all([
        serverClient
            .from("posts")
            .select(POST_BOOTSTRAP_SELECT_FIELDS)
            .order("pub_date", { ascending: false }),
        serverClient
            .from("editor_states")
            .select("entity_slug")
            .eq("entity_type", "post")
            .neq("label", "Initial"),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_fields")
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_field")
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "post_toc_styles")
            .single(),
        serverClient.from("post_category_counts").select("category, count"),
    ]);

    // 쿼리 오류 로깅 (UI 렌더링은 계속 진행)
    if (postsError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${postsError.message}`
        );
    if (stateError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${stateError.message}`
        );
    if (jobFieldsError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${jobFieldsError.message}`
        );
    if (activeJobFieldError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${activeJobFieldError.message}`
        );
    if (tocStylesError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${tocStylesError.message}`
        );
    if (categoriesError)
        console.error(
            `[posts.ts::getPostsPanelBootstrap] ${categoriesError.message}`
        );

    const stateCounts: Record<string, number> = {};
    for (const row of stateData ?? []) {
        stateCounts[row.entity_slug] = (stateCounts[row.entity_slug] ?? 0) + 1;
    }

    const posts = (
        (postsData as Omit<AdminPostRow, "content">[] | null) ?? []
    ).map((post) => ({ ...post, content: "" })) as AdminPostRow[];
    const categories = [
        ...new Set([
            ...((categoryRows as CategoryCountRow[] | null) ?? [])
                .map((row) => row.category?.trim())
                .filter((category): category is string => !!category),
            ...posts
                .map((post) => post.category?.trim())
                .filter((category): category is string => !!category),
        ]),
    ].sort((a, b) => a.localeCompare(b));

    return {
        posts,
        stateCounts,
        jobFields: (jobFieldsRow?.value as JobFieldItem[]) ?? [],
        activeJobField:
            typeof activeJobFieldRow?.value === "string"
                ? activeJobFieldRow.value
                : "",
        postTocStyles:
            tocStylesRow?.value && typeof tocStylesRow.value === "object"
                ? (tocStylesRow.value as Record<string, string>)
                : {},
        categories,
    };
}

// 포스트 목차 스타일 저장
export async function savePostTocStyle(
    slug: string,
    style: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "post_toc_styles")
        .single();

    const next = {
        ...((data?.value as Record<string, string> | null) ?? {}),
        [slug]: style,
    };

    const { error } = await serverClient
        .from("site_config")
        .upsert({ key: "post_toc_styles", value: next }, { onConflict: "key" });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 포스트 생성/수정
export async function savePost(
    payload: PostPayload,
    editTargetId?: string | null
): Promise<
    { success: true; post: AdminPostRow } | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    if (editTargetId) {
        const { error } = await serverClient
            .from("posts")
            .update(payload)
            .eq("id", editTargetId);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await serverClient.from("posts").insert(payload);
        if (error) return { success: false, error: error.message };
    }

    const { data, error } = await serverClient
        .from("posts")
        .select(POST_SELECT_FIELDS)
        .eq("slug", payload.slug)
        .single();

    if (error || !data) {
        return {
            success: false,
            error: error?.message ?? "저장 후 포스트 조회 실패",
        };
    }

    await revalidatePost(payload.slug);
    return { success: true, post: data as AdminPostRow };
}

// 포스트 삭제
export async function deletePostById(
    id: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data: target } = await serverClient
        .from("posts")
        .select("slug")
        .eq("id", id)
        .single();

    const { error } = await serverClient.from("posts").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    if (target?.slug) await revalidatePost(target.slug);
    return { success: true };
}

// 포스트 Published 토글
export async function setPostPublished(
    id: string,
    slug: string,
    published: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("posts")
        .update({ published })
        .eq("id", id);
    if (error) return { success: false, error: error.message };

    await revalidatePost(slug);
    return { success: true };
}

// 포스트 batch Published 변경
export async function batchSetPostPublished(
    ids: string[],
    publish: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (ids.length === 0) return { success: true };

    const { error } = await serverClient
        .from("posts")
        .update({ published: publish })
        .in("id", ids);
    if (error) return { success: false, error: error.message };

    const { data } = await serverClient
        .from("posts")
        .select("slug")
        .in("id", ids);
    await Promise.all((data ?? []).map((row) => revalidatePost(row.slug)));
    return { success: true };
}

// 포스트 batch 직무 분야 변경
export async function batchSetPostJobField(
    ids: string[],
    jobField: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (ids.length === 0) return { success: true };

    const { error } = await serverClient
        .from("posts")
        .update({ job_field: [jobField] })
        .in("id", ids);
    if (error) return { success: false, error: error.message };

    const { data } = await serverClient
        .from("posts")
        .select("slug")
        .in("id", ids);
    await Promise.all((data ?? []).map((row) => revalidatePost(row.slug)));
    return { success: true };
}
