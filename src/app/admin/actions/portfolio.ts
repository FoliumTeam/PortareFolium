"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import { revalidatePortfolioItem } from "@/app/admin/actions/revalidate";

const PORTFOLIO_SELECT_FIELDS =
    "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, meta_title, meta_description, og_image";

type PortfolioRow = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail: string | null;
    content: string;
    data: Record<string, unknown>;
    featured: boolean;
    order_idx: number;
    published: boolean;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type JobFieldItem = { id: string; name: string; emoji: string };

type PortfolioPayload = {
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail: string | null;
    content: string;
    featured: boolean;
    order_idx: number;
    published: boolean;
    job_field: string[] | null;
    data: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

// PortfolioPanel 초기 데이터 조회
export async function getPortfolioPanelBootstrap() {
    await requireAdminSession();
    if (!serverClient) {
        return {
            items: [] as PortfolioRow[],
            stateCounts: {} as Record<string, number>,
            jobFields: [] as JobFieldItem[],
            activeJobField: "",
        };
    }

    const [
        { data: itemsData, error: itemsError },
        { data: stateData, error: stateError },
        { data: jobFieldsRow, error: jobFieldsError },
        { data: activeJobFieldRow, error: activeJobFieldError },
    ] = await Promise.all([
        serverClient
            .from("portfolio_items")
            .select(PORTFOLIO_SELECT_FIELDS)
            .order("order_idx"),
        serverClient
            .from("editor_states")
            .select("entity_slug")
            .eq("entity_type", "portfolio")
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
    ]);

    // 쿼리 오류 로깅 (UI 렌더링은 계속 진행)
    if (itemsError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${itemsError.message}`
        );
    if (stateError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${stateError.message}`
        );
    if (jobFieldsError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${jobFieldsError.message}`
        );
    if (activeJobFieldError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${activeJobFieldError.message}`
        );

    const stateCounts: Record<string, number> = {};
    for (const row of stateData ?? []) {
        stateCounts[row.entity_slug] = (stateCounts[row.entity_slug] ?? 0) + 1;
    }

    return {
        items: (itemsData as PortfolioRow[]) ?? [],
        stateCounts,
        jobFields: (jobFieldsRow?.value as JobFieldItem[]) ?? [],
        activeJobField:
            typeof activeJobFieldRow?.value === "string"
                ? activeJobFieldRow.value
                : "",
    };
}

// 포트폴리오 생성/수정
export async function savePortfolioItem(
    payload: PortfolioPayload,
    editTargetId?: string | null
): Promise<
    { success: true; item: PortfolioRow } | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    if (editTargetId) {
        const { error } = await serverClient
            .from("portfolio_items")
            .update(payload)
            .eq("id", editTargetId);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await serverClient
            .from("portfolio_items")
            .insert(payload);
        if (error) return { success: false, error: error.message };
    }

    const { data, error } = await serverClient
        .from("portfolio_items")
        .select(PORTFOLIO_SELECT_FIELDS)
        .eq("slug", payload.slug)
        .single();

    if (error || !data) {
        return {
            success: false,
            error: error?.message ?? "저장 후 항목 조회 실패",
        };
    }

    await revalidatePortfolioItem(payload.slug);
    return { success: true, item: data as PortfolioRow };
}

// 포트폴리오 삭제
export async function deletePortfolioItemById(
    id: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data: target } = await serverClient
        .from("portfolio_items")
        .select("slug")
        .eq("id", id)
        .single();

    const { error } = await serverClient
        .from("portfolio_items")
        .delete()
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    if (target?.slug) await revalidatePortfolioItem(target.slug);
    return { success: true };
}

// 포트폴리오 Published 토글
export async function setPortfolioPublished(
    id: string,
    slug: string,
    published: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("portfolio_items")
        .update({ published })
        .eq("id", id);
    if (error) return { success: false, error: error.message };

    await revalidatePortfolioItem(slug);
    return { success: true };
}

// Featured 토글
export async function setPortfolioFeatured(
    id: string,
    slug: string,
    featured: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("portfolio_items")
        .update({ featured })
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    await revalidatePortfolioItem(slug);
    return { success: true };
}

// Featured 순서 저장
export async function reorderFeaturedPortfolioItems(
    updates: { id: string; order_idx: number }[]
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const ids = updates.map((u) => u.id);

    // 슬러그 일괄 조회
    const { data: slugRows } = await serverClient
        .from("portfolio_items")
        .select("id, slug")
        .in("id", ids);
    const slugById = Object.fromEntries(
        (slugRows ?? []).map((r) => [r.id, r.slug])
    );

    // 업데이트 병렬 실행
    const results = await Promise.all(
        updates.map(({ id, order_idx }) =>
            serverClient!
                .from("portfolio_items")
                .update({ order_idx })
                .eq("id", id)
        )
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) return { success: false, error: firstError.message };

    // revalidate 병렬 실행
    const slugs = ids.map((id) => slugById[id]).filter(Boolean);
    await Promise.all(slugs.map((slug) => revalidatePortfolioItem(slug)));
    return { success: true };
}

// 배치 Published 변경
export async function batchSetPortfolioPublished(
    ids: string[],
    publish: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (ids.length === 0) return { success: true };

    const { error } = await serverClient
        .from("portfolio_items")
        .update({ published: publish })
        .in("id", ids);
    if (error) return { success: false, error: error.message };

    const { data } = await serverClient
        .from("portfolio_items")
        .select("slug")
        .in("id", ids);
    for (const row of data ?? []) {
        await revalidatePortfolioItem(row.slug);
    }
    return { success: true };
}

// 배치 직무 분야 변경
export async function batchSetPortfolioJobField(
    updates: { id: string; data: Record<string, unknown> }[]
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const ids = updates.map((u) => u.id);

    // 업데이트 병렬 실행
    const results = await Promise.all(
        updates.map(({ id, data }) =>
            serverClient!.from("portfolio_items").update({ data }).eq("id", id)
        )
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) return { success: false, error: firstError.message };

    // 슬러그 일괄 조회 후 revalidate 병렬 실행
    const { data: slugRows } = await serverClient
        .from("portfolio_items")
        .select("slug")
        .in("id", ids);
    await Promise.all(
        (slugRows ?? []).map((r) => revalidatePortfolioItem(r.slug))
    );
    return { success: true };
}
