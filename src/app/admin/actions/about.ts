"use server";

import { requireAdminSession } from "@/lib/server-admin";
import {
    revalidateHome,
    revalidateResume,
} from "@/app/admin/actions/revalidate";
import { serverClient } from "@/lib/supabase";
import type { AboutData } from "@/types/about";

type SaveAboutInput = {
    aboutData: AboutData;
    aboutRowId: string | null;
    profileImage: string;
    resumeRowId: string | null;
    resumeFullData: Record<string, unknown> | null;
    githubUrl: string;
};

type SaveAboutResult =
    | { success: true; aboutRowId: string | null }
    | { success: false; error: string };

type AboutBootstrap = {
    aboutRowId: string | null;
    aboutData: AboutData | null;
    resumeRowId: string | null;
    resumeData: Record<string, unknown> | null;
    jobFields: { id: string; name: string; emoji: string }[];
    githubUrl: string;
};

// AboutPanel 초기 데이터 조회
export async function getAboutBootstrap(): Promise<AboutBootstrap> {
    await requireAdminSession();
    if (!serverClient) {
        return {
            aboutRowId: null,
            aboutData: null,
            resumeRowId: null,
            resumeData: null,
            jobFields: [],
            githubUrl: "",
        };
    }

    const [{ data: aboutRow }, { data: resumeRow }, { data: configs }] =
        await Promise.all([
            serverClient
                .from("about_data")
                .select("id, data")
                .limit(1)
                .single(),
            serverClient
                .from("resume_data")
                .select("id, data")
                .eq("lang", "ko")
                .single(),
            serverClient
                .from("site_config")
                .select("key, value")
                .in("key", ["job_fields", "github_url"]),
        ]);

    let githubUrl = "";
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
        if (cfg.key === "github_url" && typeof value === "string") {
            githubUrl = value;
        }
    }

    return {
        aboutRowId: aboutRow?.id ?? null,
        aboutData: (aboutRow?.data as AboutData | undefined) ?? null,
        resumeRowId: resumeRow?.id ?? null,
        resumeData:
            (resumeRow?.data as Record<string, unknown> | undefined) ?? null,
        jobFields,
        githubUrl,
    };
}

// About / resume basics.image / github_url 저장
export async function saveAboutPanel(
    input: SaveAboutInput
): Promise<SaveAboutResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const {
        aboutData,
        aboutRowId,
        profileImage,
        resumeRowId,
        resumeFullData,
        githubUrl,
    } = input;

    try {
        if (resumeRowId && resumeFullData) {
            const basics =
                resumeFullData.basics &&
                typeof resumeFullData.basics === "object" &&
                !Array.isArray(resumeFullData.basics)
                    ? (resumeFullData.basics as Record<string, unknown>)
                    : {};

            const mergedResume = {
                ...resumeFullData,
                basics: {
                    ...basics,
                    image: profileImage.trim() || undefined,
                },
            };

            const { error } = await serverClient
                .from("resume_data")
                .update({ data: mergedResume })
                .eq("id", resumeRowId);
            if (error) return { success: false, error: error.message };
        }

        let nextAboutRowId = aboutRowId;
        if (aboutRowId) {
            const { error } = await serverClient
                .from("about_data")
                .update({ data: aboutData })
                .eq("id", aboutRowId);
            if (error) return { success: false, error: error.message };
        } else {
            const { data, error } = await serverClient
                .from("about_data")
                .insert({ data: aboutData })
                .select("id")
                .single();
            if (error) return { success: false, error: error.message };
            nextAboutRowId = data?.id ?? null;
        }

        const { error: githubError } = await serverClient
            .from("site_config")
            .upsert(
                [
                    {
                        key: "github_url",
                        value: JSON.stringify(githubUrl.trim()),
                    },
                ],
                { onConflict: "key" }
            );
        if (githubError) {
            return { success: false, error: githubError.message };
        }

        await revalidateHome();
        await revalidateResume();

        return { success: true, aboutRowId: nextAboutRowId };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "저장 실패",
        };
    }
}
