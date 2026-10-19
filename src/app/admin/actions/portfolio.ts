"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    revalidatePortfolioIndex,
    revalidatePortfolioItem,
} from "@/app/admin/actions/revalidate";
import { getPortfolioJobFields } from "@/lib/portfolio";
import {
    PORTFOLIO_AI_SECTION_CONFIG_KEY,
    normalizePortfolioAiSectionConfig,
    type PortfolioAiSectionConfig,
} from "@/lib/portfolio-ai-section";
import { normalizeUniqueJobFieldList } from "@/lib/job-field";
import type { PortfolioRawRow } from "@/types/portfolio";

const PORTFOLIO_SELECT_FIELDS =
    "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, job_field, meta_title, meta_description, og_image";
const PORTFOLIO_BOOTSTRAP_SELECT_FIELDS =
    "id, slug, title, description, tags, thumbnail, data, featured, order_idx, published, job_field, meta_title, meta_description, og_image";

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
    job_field: string[] | string | null;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type JobFieldItem = { id: string; name: string; emoji: string };

const withoutReviewData = (
    data: Record<string, unknown>
): Record<string, unknown> => {
    const { review: _review, ...publicData } = data;
    return publicData;
};

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
    job_field: string[];
    data: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

const getFeaturedByJobField = (
    row: Pick<PortfolioRawRow, "job_field" | "data" | "featured">
): Record<string, boolean> => {
    const jobFields = getPortfolioJobFields({
        slug: "",
        title: "",
        job_field: row.job_field,
        data: row.data,
    });
    const stored = row.data?.featuredByJobField as
        | Record<string, unknown>
        | undefined;
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
        return Object.fromEntries(
            jobFields.map((jobField) => [jobField, row.featured === true])
        );
    }
    return Object.fromEntries(
        jobFields.map((jobField) => [jobField, stored[jobField] === true])
    );
};

const getFeaturedOrderByJobField = (
    row: Pick<PortfolioRawRow, "data" | "order_idx">
): Record<string, number> => {
    const stored = row.data?.featuredOrderByJobField as
        | Record<string, unknown>
        | undefined;
    return stored && typeof stored === "object" && !Array.isArray(stored)
        ? Object.fromEntries(
              Object.entries(stored).flatMap(([jobField, order]) =>
                  typeof order === "number" && Number.isFinite(order)
                      ? [[jobField, order]]
                      : []
              )
          )
        : {};
};

// PortfolioPanel 초기 데이터 조회
async function getPortfolioPanelBootstrapInLocale() {
    await requireAdminSession();
    if (!serverClient) {
        return {
            items: [] as PortfolioRow[],
            stateCounts: {} as Record<string, number>,
            jobFields: [] as JobFieldItem[],
            activeJobField: "",
            portfolioDesign: "cards" as const,
            aiSection: normalizePortfolioAiSectionConfig(undefined),
        };
    }

    const [
        { data: itemsData, error: itemsError },
        { data: stateData, error: stateError },
        { data: jobFieldsRow, error: jobFieldsError },
        { data: portfolioDesignRow, error: portfolioDesignError },
        { data: aiSectionRow, error: aiSectionError },
    ] = await Promise.all([
        serverClient
            .from("portfolio_items")
            .select(PORTFOLIO_BOOTSTRAP_SELECT_FIELDS)
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
            .eq("key", "portfolio_design")
            .maybeSingle(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", PORTFOLIO_AI_SECTION_CONFIG_KEY)
            .maybeSingle(),
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
    if (portfolioDesignError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${portfolioDesignError.message}`
        );
    if (aiSectionError)
        console.error(
            `[portfolio.ts::getPortfolioPanelBootstrap] ${aiSectionError.message}`
        );

    const stateCounts: Record<string, number> = {};
    for (const row of stateData ?? []) {
        stateCounts[row.entity_slug] = (stateCounts[row.entity_slug] ?? 0) + 1;
    }

    return {
        items:
            (itemsData as Omit<PortfolioRow, "content">[] | null)?.map(
                (item) => ({ ...item, content: "" })
            ) ?? [],
        stateCounts,
        jobFields: (jobFieldsRow?.value as JobFieldItem[]) ?? [],
        activeJobField: "",
        portfolioDesign:
            portfolioDesignRow?.value === "timeline"
                ? ("timeline" as const)
                : ("cards" as const),
        aiSection: normalizePortfolioAiSectionConfig(aiSectionRow?.value),
    };
}

async function getPortfolioItemContentInLocale(
    id: string
): Promise<
    { success: true; content: string } | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data, error } = await serverClient
        .from("portfolio_items")
        .select("content")
        .eq("id", id)
        .single();
    if (error) return { success: false, error: error.message };
    return { success: true, content: data?.content ?? "" };
}

// 포트폴리오 목록 디자인 저장
async function savePortfolioDesignInLocale(
    design: "timeline" | "cards"
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("site_config")
        .upsert({ key: "portfolio_design", value: design });
    if (error) return { success: false, error: error.message };

    await revalidatePortfolioIndex();
    return { success: true };
}

// AI 구역 공통 설정 저장
async function savePortfolioAiSectionInLocale(
    config: PortfolioAiSectionConfig
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const normalized = normalizePortfolioAiSectionConfig(config);
    const { data: projects } = normalized.projectSlugs.length
        ? await serverClient
              .from("portfolio_items")
              .select("id")
              .in("slug", normalized.projectSlugs)
              .eq("published", true)
        : { data: [] };
    if ((projects?.length ?? 0) !== normalized.projectSlugs.length) {
        return {
            success: false,
            error: "Published 상태의 AI 프로젝트를 선택하세요.",
        };
    }
    const { error } = await serverClient.from("site_config").upsert({
        key: PORTFOLIO_AI_SECTION_CONFIG_KEY,
        value: normalized as unknown as object,
    });
    if (error) return { success: false, error: error.message };

    await revalidatePortfolioIndex();
    return { success: true };
}

// 포트폴리오 생성/수정
async function savePortfolioItemInLocale(
    payload: PortfolioPayload,
    editTargetId?: string | null
): Promise<
    { success: true; item: PortfolioRow } | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const persistedPayload = {
        ...payload,
        published: payload.published,
        job_field: normalizeUniqueJobFieldList(payload.job_field),
        data: withoutReviewData(payload.data),
    };

    if (editTargetId) {
        const { error } = await serverClient
            .from("portfolio_items")
            .update(persistedPayload)
            .eq("id", editTargetId);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await serverClient
            .from("portfolio_items")
            .insert(persistedPayload);
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
async function deletePortfolioItemByIdInLocale(
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
async function setPortfolioPublishedInLocale(
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
async function setPortfolioFeaturedInLocale(
    id: string,
    slug: string,
    jobField: string,
    featured: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (!jobField) return { success: false, error: "직무 분야를 선택하세요." };

    const { data: target, error: targetError } = await serverClient
        .from("portfolio_items")
        .select("id, job_field, data, featured, order_idx")
        .eq("id", id)
        .single();
    if (targetError || !target) {
        return {
            success: false,
            error: targetError?.message ?? "Featured 대상을 찾을 수 없습니다.",
        };
    }

    const targetRow = target as PortfolioRawRow;
    const targetJobFields = getPortfolioJobFields(targetRow);
    if (!targetJobFields.includes(jobField)) {
        return {
            success: false,
            error: "이 항목에는 선택한 직무 분야가 없습니다.",
        };
    }

    if (featured) {
        const { data: featuredRows, error: featuredError } = await serverClient
            .from("portfolio_items")
            .select("id, job_field, data, featured")
            .eq("featured", true);
        if (featuredError) {
            return { success: false, error: featuredError.message };
        }
        const occupied = (featuredRows ?? []).filter(
            (candidate) =>
                candidate.id !== id &&
                getFeaturedByJobField(candidate as PortfolioRawRow)[jobField]
        ).length;
        if (occupied >= 5) {
            return {
                success: false,
                error: `${jobField} Featured 항목은 최대 5개까지 설정할 수 있습니다.`,
            };
        }
    }

    const nextFeaturedByJobField = {
        ...getFeaturedByJobField(targetRow),
        [jobField]: featured,
    };
    const nextFeaturedOrderByJobField = {
        ...getFeaturedOrderByJobField(targetRow),
        ...(featured &&
        getFeaturedOrderByJobField(targetRow)[jobField] === undefined
            ? {
                  [jobField]: targetRow.order_idx ?? 0,
              }
            : {}),
    };
    const nextData = {
        ...(targetRow.data ?? {}),
        featuredByJobField: nextFeaturedByJobField,
        featuredOrderByJobField: nextFeaturedOrderByJobField,
    };

    const { error } = await serverClient
        .from("portfolio_items")
        .update({
            featured: Object.values(nextFeaturedByJobField).some(Boolean),
            data: nextData,
        })
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    await revalidatePortfolioItem(slug);
    return { success: true };
}

// Featured 순서 저장
async function reorderFeaturedPortfolioItemsInLocale(
    updates: { id: string; order_idx: number }[],
    jobField: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (!jobField) return { success: false, error: "직무 분야를 선택하세요." };
    if (updates.length === 0) return { success: true };

    const ids = updates.map((u) => u.id);

    const { data: featuredRows, error: featuredError } = await serverClient
        .from("portfolio_items")
        .select("id, slug, featured, job_field, data, order_idx")
        .in("id", ids);
    if (featuredError) return { success: false, error: featuredError.message };
    if (
        (featuredRows ?? []).length !== ids.length ||
        (featuredRows ?? []).some(
            (row) => !getFeaturedByJobField(row as PortfolioRawRow)[jobField]
        )
    ) {
        return {
            success: false,
            error: "선택한 직무 분야의 Featured 항목만 정렬할 수 있습니다.",
        };
    }
    const slugById = Object.fromEntries(
        (featuredRows ?? []).map((row) => [row.id, row.slug])
    );

    // 업데이트 병렬 실행
    const results = await Promise.all(
        updates.map(({ id, order_idx }) => {
            const row = (featuredRows ?? []).find((entry) => entry.id === id);
            const nextData = {
                ...(row?.data ?? {}),
                featuredOrderByJobField: {
                    ...getFeaturedOrderByJobField(row as PortfolioRawRow),
                    [jobField]: order_idx,
                },
            };
            return serverClient!
                .from("portfolio_items")
                .update({ data: nextData })
                .eq("id", id);
        })
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) return { success: false, error: firstError.message };

    // revalidate 병렬 실행
    const slugs = ids.map((id) => slugById[id]).filter(Boolean);
    await Promise.all(slugs.map((slug) => revalidatePortfolioItem(slug)));
    return { success: true };
}

// 배치 Published 변경
async function batchSetPortfolioPublishedInLocale(
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
async function batchSetPortfolioJobFieldInLocale(
    updates: {
        id: string;
        job_field: string | null;
        data: Record<string, unknown>;
    }[]
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const ids = updates.map((u) => u.id);

    // 업데이트 병렬 실행
    const results = await Promise.all(
        updates.map(({ id, job_field, data }) =>
            serverClient!
                .from("portfolio_items")
                .update({ job_field: job_field ? [job_field] : [], data })
                .eq("id", id)
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

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getPortfolioPanelBootstrap(
    ...args: [
        ...Parameters<typeof getPortfolioPanelBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getPortfolioPanelBootstrapInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getPortfolioPanelBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getPortfolioPanelBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getPortfolioItemContent(
    ...args: [
        ...Parameters<typeof getPortfolioItemContentInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getPortfolioItemContentInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getPortfolioItemContentInLocale>;
    return withContentLocale(locale, () =>
        getPortfolioItemContentInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function savePortfolioDesign(
    ...args: [
        ...Parameters<typeof savePortfolioDesignInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof savePortfolioDesignInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof savePortfolioDesignInLocale>;
    return withContentLocale(locale, () =>
        savePortfolioDesignInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function savePortfolioAiSection(
    ...args: [
        ...Parameters<typeof savePortfolioAiSectionInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof savePortfolioAiSectionInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof savePortfolioAiSectionInLocale>;
    return withContentLocale(locale, () =>
        savePortfolioAiSectionInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function savePortfolioItem(
    ...args: [
        ...Parameters<typeof savePortfolioItemInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof savePortfolioItemInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof savePortfolioItemInLocale>;
    return withContentLocale(locale, () =>
        savePortfolioItemInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deletePortfolioItemById(
    ...args: [
        ...Parameters<typeof deletePortfolioItemByIdInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof deletePortfolioItemByIdInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deletePortfolioItemByIdInLocale>;
    return withContentLocale(locale, () =>
        deletePortfolioItemByIdInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function setPortfolioPublished(
    ...args: [
        ...Parameters<typeof setPortfolioPublishedInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof setPortfolioPublishedInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof setPortfolioPublishedInLocale>;
    return withContentLocale(locale, () =>
        setPortfolioPublishedInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function setPortfolioFeatured(
    ...args: [
        ...Parameters<typeof setPortfolioFeaturedInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof setPortfolioFeaturedInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof setPortfolioFeaturedInLocale>;
    return withContentLocale(locale, () =>
        setPortfolioFeaturedInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function reorderFeaturedPortfolioItems(
    ...args: [
        ...Parameters<typeof reorderFeaturedPortfolioItemsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof reorderFeaturedPortfolioItemsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof reorderFeaturedPortfolioItemsInLocale>;
    return withContentLocale(locale, () =>
        reorderFeaturedPortfolioItemsInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function batchSetPortfolioPublished(
    ...args: [
        ...Parameters<typeof batchSetPortfolioPublishedInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof batchSetPortfolioPublishedInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof batchSetPortfolioPublishedInLocale>;
    return withContentLocale(locale, () =>
        batchSetPortfolioPublishedInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function batchSetPortfolioJobField(
    ...args: [
        ...Parameters<typeof batchSetPortfolioJobFieldInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof batchSetPortfolioJobFieldInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof batchSetPortfolioJobFieldInLocale>;
    return withContentLocale(locale, () =>
        batchSetPortfolioJobFieldInLocale(...values)
    );
}
