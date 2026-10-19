"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import {
    revalidateHome,
    revalidateResume,
} from "@/app/admin/actions/revalidate";
import { serverClient } from "@/lib/supabase";
import type { Resume, ResumeBasicsPresentationConfig } from "@/types/resume";
import {
    normalizeResumeBasicsPresentationConfig,
    RESUME_BASICS_PRESENTATION_CONFIG_KEY,
} from "@/lib/resume-basics-presentation";
import {
    DEFAULT_RESUME_LAYOUT,
    normalizeLayout,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";

type SaveResumeInput = {
    resumeData: Resume;
    rowId: string | null;
    resumeLayout: "classic" | "modern";
    resumeSectionLayout: ResumeSectionLayout;
};

type SaveResumeResult =
    | { success: true; rowId: string | null }
    | { success: false; error: string };

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
    headerTitle?: string;
};

// ResumePanel 초기 데이터 조회
async function getResumeBootstrapInLocale(): Promise<{
    rowId: string | null;
    resumeData: Resume | null;
    resumeLayout: "classic" | "modern";
    resumeSectionLayout: ResumeSectionLayout;
    resumeBasicsPresentation: ResumeBasicsPresentationConfig;
    jobFields: JobFieldItem[];
    activeJobField: string;
}> {
    await requireAdminSession();
    if (!serverClient) {
        return {
            rowId: null,
            resumeData: null,
            resumeLayout: "modern",
            resumeSectionLayout: DEFAULT_RESUME_LAYOUT,
            resumeBasicsPresentation:
                normalizeResumeBasicsPresentationConfig(undefined),
            jobFields: [],
            activeJobField: "",
        };
    }

    const [
        { data: row },
        { data: layoutRow },
        { data: sectionLayoutRow },
        { data: basicsPresentationRow },
        { data: jfRow },
    ] = await Promise.all([
        serverClient
            .from("resume_data")
            .select("id, data")
            .eq("lang", "ko")
            .limit(1)
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "resume_layout")
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "resume_section_layout")
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", RESUME_BASICS_PRESENTATION_CONFIG_KEY)
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_fields")
            .single(),
    ]);

    return {
        rowId: row?.id ?? null,
        resumeData: (row?.data as Resume | undefined) ?? null,
        resumeLayout: layoutRow?.value === "classic" ? "classic" : "modern",
        resumeSectionLayout: normalizeLayout(
            (sectionLayoutRow?.value as ResumeSectionLayout | undefined) ??
                DEFAULT_RESUME_LAYOUT
        ),
        resumeBasicsPresentation: normalizeResumeBasicsPresentationConfig(
            basicsPresentationRow?.value
        ),
        jobFields: (jfRow?.value as JobFieldItem[] | undefined) ?? [],
        activeJobField: "",
    };
}

async function saveResumeBasicsPresentationInLocale(
    presentation: ResumeBasicsPresentationConfig
): Promise<{ success: true } | { success: false; error: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const normalized = normalizeResumeBasicsPresentationConfig(presentation);
    const { error } = await serverClient.from("site_config").upsert({
        key: RESUME_BASICS_PRESENTATION_CONFIG_KEY,
        value: normalized as unknown as object,
    });
    if (error) return { success: false, error: error.message };

    await revalidateResume();
    await revalidateHome();
    return { success: true };
}

// resume_data + layout 설정 저장
async function saveResumePanelInLocale(
    input: SaveResumeInput
): Promise<SaveResumeResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { resumeData, rowId, resumeLayout, resumeSectionLayout } = input;

    try {
        let nextRowId = rowId;
        if (rowId) {
            const { data: saved, error } = await serverClient
                .from("resume_data")
                .update({ data: resumeData })
                .eq("id", rowId)
                .select("id")
                .maybeSingle();
            if (error) return { success: false, error: error.message };
            if (!saved)
                return {
                    success: false,
                    error: "선택 언어와 이력서 식별자 불일치",
                };
        } else {
            const { data, error } = await serverClient
                .from("resume_data")
                .insert({ lang: "ko", data: resumeData })
                .select("id")
                .single();
            if (error) return { success: false, error: error.message };
            nextRowId = data?.id ?? null;
        }

        const { error: layoutError } = await serverClient
            .from("site_config")
            .upsert({ key: "resume_layout", value: resumeLayout });
        if (layoutError) return { success: false, error: layoutError.message };

        const { error: sectionLayoutError } = await serverClient
            .from("site_config")
            .upsert({
                key: "resume_section_layout",
                value: resumeSectionLayout as unknown as object,
            });
        if (sectionLayoutError) {
            return { success: false, error: sectionLayoutError.message };
        }

        await revalidateResume();
        await revalidateHome();

        return { success: true, rowId: nextRowId };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "저장 실패",
        };
    }
}

// resume layout 단독 저장
async function saveResumeThemeInLocale(
    layout: "classic" | "modern"
): Promise<{ success: true } | { success: false; error: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("site_config")
        .upsert({ key: "resume_layout", value: layout });
    if (error) return { success: false, error: error.message };

    await revalidateResume();
    return { success: true };
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getResumeBootstrap(
    ...args: [
        ...Parameters<typeof getResumeBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getResumeBootstrapInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getResumeBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getResumeBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveResumeBasicsPresentation(
    ...args: [
        ...Parameters<typeof saveResumeBasicsPresentationInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof saveResumeBasicsPresentationInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveResumeBasicsPresentationInLocale>;
    return withContentLocale(locale, () =>
        saveResumeBasicsPresentationInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveResumePanel(
    ...args: [
        ...Parameters<typeof saveResumePanelInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof saveResumePanelInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveResumePanelInLocale>;
    return withContentLocale(locale, () => saveResumePanelInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveResumeTheme(
    ...args: [
        ...Parameters<typeof saveResumeThemeInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof saveResumeThemeInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveResumeThemeInLocale>;
    return withContentLocale(locale, () => saveResumeThemeInLocale(...values));
}
