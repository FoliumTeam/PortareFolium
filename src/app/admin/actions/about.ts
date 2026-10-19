"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import {
    revalidateAbout,
    revalidateResume,
} from "@/app/admin/actions/revalidate";
import { serverClient } from "@/lib/supabase";
import type { AboutData } from "@/types/about";
import type { ResumeBasics } from "@/types/resume";

type SaveAboutInput = {
    aboutData: AboutData;
    aboutRowId: string | null;
};

type SaveAboutResult =
    | { success: true; aboutRowId: string | null }
    | { success: false; error: string };

type SaveAboutIntroductionInput = {
    aboutData: AboutData;
    aboutRowId: string | null;
};

type AboutBootstrap = {
    aboutRowId: string | null;
    aboutData: AboutData | null;
    resumeBasics: ResumeBasics;
    jobFields: { id: string; name: string; emoji: string }[];
};

// AboutPanel 초기 데이터 조회
async function getAboutBootstrapInLocale(): Promise<AboutBootstrap> {
    await requireAdminSession();
    if (!serverClient) {
        return {
            aboutRowId: null,
            aboutData: null,
            resumeBasics: {},
            jobFields: [],
        };
    }

    const [
        { data: aboutRow, error: aboutError },
        { data: resumeRow, error: resumeError },
        { data: configs, error: configsError },
    ] = await Promise.all([
        serverClient.from("about_data").select("id, data").limit(1).single(),
        serverClient
            .from("resume_data")
            .select("id, data")
            .eq("lang", "ko")
            .single(),
        serverClient
            .from("site_config")
            .select("key, value")
            .eq("key", "job_fields"),
    ]);

    // 쿼리 오류 로깅 (UI 렌더링은 계속 진행)
    if (aboutError)
        console.error(`[about.ts::getAboutBootstrap] ${aboutError.message}`);
    if (resumeError)
        console.error(`[about.ts::getAboutBootstrap] ${resumeError.message}`);
    if (configsError)
        console.error(`[about.ts::getAboutBootstrap] ${configsError.message}`);

    let jobFields: { id: string; name: string; emoji: string }[] = [];
    for (const cfg of configs ?? []) {
        let value = cfg.value;
        if (typeof value === "string" && value.startsWith('"')) {
            try {
                value = JSON.parse(value);
            } catch {
                // noop
            }
        }
        if (cfg.key === "job_fields" && Array.isArray(value)) {
            jobFields = value as { id: string; name: string; emoji: string }[];
        }
    }

    return {
        aboutRowId: aboutRow?.id ?? null,
        aboutData: (aboutRow?.data as AboutData | undefined) ?? null,
        resumeBasics:
            (resumeRow?.data as { basics?: ResumeBasics } | undefined)
                ?.basics ?? {},
        jobFields,
    };
}

// About 콘텐츠 저장
async function saveAboutPanelInLocale(
    input: SaveAboutInput
): Promise<SaveAboutResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { aboutData, aboutRowId } = input;

    try {
        const legacyData = aboutData as AboutData & Record<string, unknown>;
        const {
            name: _name,
            profileImage: _profileImage,
            contacts: _contacts,
            ...content
        } = legacyData;

        let nextAboutRowId = aboutRowId;
        if (aboutRowId) {
            const { error } = await serverClient
                .from("about_data")
                .update({ data: content })
                .eq("id", aboutRowId);
            if (error) return { success: false, error: error.message };
        } else {
            const { data, error } = await serverClient
                .from("about_data")
                .insert({ data: content })
                .select("id")
                .single();
            if (error) return { success: false, error: error.message };
            nextAboutRowId = data?.id ?? null;
        }

        await revalidateAbout();
        await revalidateResume();

        return { success: true, aboutRowId: nextAboutRowId };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "저장 실패",
        };
    }
}

// Resume 공유 소개 저장
async function saveAboutIntroductionsInLocale(
    input: SaveAboutIntroductionInput
): Promise<SaveAboutResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    try {
        if (input.aboutRowId) {
            const { error } = await serverClient
                .from("about_data")
                .update({ data: input.aboutData })
                .eq("id", input.aboutRowId);
            if (error) return { success: false, error: error.message };
        } else {
            const { data, error } = await serverClient
                .from("about_data")
                .insert({ data: input.aboutData })
                .select("id")
                .single();
            if (error) return { success: false, error: error.message };
            await revalidateAbout();
            await revalidateResume();
            return { success: true, aboutRowId: data?.id ?? null };
        }

        await revalidateAbout();
        await revalidateResume();
        return { success: true, aboutRowId: input.aboutRowId };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "저장 실패",
        };
    }
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getAboutBootstrap(
    ...args: [
        ...Parameters<typeof getAboutBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getAboutBootstrapInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getAboutBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getAboutBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveAboutPanel(
    ...args: [...Parameters<typeof saveAboutPanelInLocale>, ContentLocaleScope?]
): Promise<Awaited<ReturnType<typeof saveAboutPanelInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveAboutPanelInLocale>;
    return withContentLocale(locale, () => saveAboutPanelInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveAboutIntroductions(
    ...args: [
        ...Parameters<typeof saveAboutIntroductionsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof saveAboutIntroductionsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveAboutIntroductionsInLocale>;
    return withContentLocale(locale, () =>
        saveAboutIntroductionsInLocale(...values)
    );
}
