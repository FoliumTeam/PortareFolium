"use server";

import { serverClient } from "@/lib/supabase";
import { sanitizePublicJobField } from "@/lib/public-job-field";

// 공개 태그 목록 조회
export async function listPublicTags(): Promise<
    { slug: string; name: string; color: string | null }[]
> {
    if (!serverClient) return [];

    const { data } = await serverClient
        .from("tags")
        .select("slug, name, color")
        .order("slug");

    return (
        (data as
            | { slug: string; name: string; color: string | null }[]
            | null) ?? []
    );
}

// 공개 검색 결과 조회
export async function searchPublicContent(
    query: string,
    jobField: string
): Promise<{ slug: string; title: string; type: "post" | "portfolio" }[]> {
    if (!serverClient || !query.trim()) return [];

    const q = query.trim().toLowerCase();
    const safeJobField = sanitizePublicJobField(jobField);
    if (safeJobField === null) return [];

    const postQuery = serverClient
        .from("posts")
        .select("slug, title")
        .eq("published", true)
        .ilike("title", `%${q}%`)
        .order("pub_date", { ascending: false })
        .limit(5);

    if (safeJobField) {
        postQuery.or(`job_field.eq.${safeJobField},job_field.is.null`);
    }

    const portfolioQuery = serverClient
        .from("portfolio_items")
        .select("slug, title")
        .eq("published", true)
        .ilike("title", `%${q}%`)
        .order("order_idx", { ascending: true })
        .limit(5);

    if (safeJobField) {
        portfolioQuery.or(`job_field.eq.${safeJobField},job_field.is.null`);
    }

    const [postsRes, portfolioRes] = await Promise.all([
        postQuery,
        portfolioQuery,
    ]);

    const items: { slug: string; title: string; type: "post" | "portfolio" }[] =
        [];

    if (postsRes.data) {
        items.push(
            ...postsRes.data.map((item) => ({ ...item, type: "post" as const }))
        );
    }

    if (portfolioRes.data) {
        items.push(
            ...portfolioRes.data.map((item) => ({
                ...item,
                type: "portfolio" as const,
            }))
        );
    }

    return items;
}

// 관리자 프로필 이미지 조회
export async function getAdminProfileImage(): Promise<string> {
    if (!serverClient) return "";

    const { data } = await serverClient
        .from("resume_data")
        .select("data")
        .eq("lang", "ko")
        .single();

    const basics = (data?.data as Record<string, unknown> | undefined)
        ?.basics as { image?: string } | undefined;

    return basics?.image ?? "";
}

// 공개 패널용 migrations db version 조회
export async function getPublicDbSchemaVersion(): Promise<string | null> {
    if (!serverClient) return null;

    const { data } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "db_schema_version")
        .single();

    return (data?.value as string | null | undefined) ?? null;
}
