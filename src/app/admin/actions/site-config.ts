"use server";

import {
    revalidateHome,
    revalidateLayout,
    revalidateResume,
} from "@/app/admin/actions/revalidate";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    inheritResumeJobField,
    removeResumeJobField,
} from "@/lib/resume-job-field";
import { normalizeThemeMode, type ThemeMode } from "@/lib/theme-mode";
import { toSlug } from "@/lib/slug";
import {
    isPublicJobFieldId,
    normalizePublicJobFields,
} from "@/lib/public-job-field";

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
    headerTitle?: string;
};

type JobFieldValue = string | string[] | null | undefined;

type SaveSiteConfigInput = {
    headerName: string;
    colorScheme: string;
    plainMode: boolean;
    themeMode: ThemeMode;
    seoConfig: {
        defaultTitle: string;
        defaultDescription: string;
        defaultOgImage: string;
        jobFields: Record<
            string,
            {
                title: string;
                description: string;
                ogImage: string;
            }
        >;
    };
    githubUrl: string;
};

type SiteConfigActionResult =
    | { success: true }
    | { success: false; error: string };

type SiteJobFieldActionResult =
    | {
          success: true;
          jobFields: JobFieldItem[];
      }
    | { success: false; error: string };

type PostJobFieldRow = {
    id: string;
    job_field: JobFieldValue;
};

type PortfolioJobFieldRow = {
    id: string;
    job_field: JobFieldValue;
    data: Record<string, unknown> | null;
};

type ResumeEntry = {
    jobField?: JobFieldValue;
    [key: string]: unknown;
};

type ResumeData = {
    [key: string]: unknown;
};

function toStringArray(value: JobFieldValue): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string");
    }

    if (typeof value === "string" && value.length > 0) {
        return [value];
    }

    return [];
}

function addInheritedField(
    value: JobFieldValue,
    parentId: string,
    newId: string
) {
    if (Array.isArray(value)) {
        if (!value.includes(parentId)) return value;
        return Array.from(new Set([...value, newId]));
    }

    if (value === parentId) {
        return [value, newId];
    }

    return value;
}

function removeFlexibleField(value: JobFieldValue, targetId: string) {
    if (Array.isArray(value)) {
        const next = value.filter((item) => item !== targetId);
        return next.length > 0 ? next : undefined;
    }

    if (value === targetId) {
        return undefined;
    }

    return value;
}

async function getJobFieldConfig() {
    if (!serverClient) {
        return {
            jobFields: [] as JobFieldItem[],
        };
    }

    const { data: jobFieldsRow } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "job_fields")
        .single();

    return {
        jobFields: normalizePublicJobFields(jobFieldsRow?.value),
    };
}

// SiteConfigPanel 초기 데이터 조회
export async function getSiteConfigBootstrap(): Promise<{
    rows: { key: string; value: unknown }[];
}> {
    await requireAdminSession();
    if (!serverClient) return { rows: [] };

    const { data } = await serverClient
        .from("site_config")
        .select("key, value")
        .in("key", [
            "color_scheme",
            "plain_mode",
            "theme_mode",
            "job_fields",
            "header_name",
            "site_name",
            "seo_config",
            "github_url",
        ]);

    return {
        rows: (data as { key: string; value: unknown }[] | null) ?? [],
    };
}

async function saveJobFieldConfig(jobFields: JobFieldItem[]) {
    if (!serverClient) return { error: "serverClient 없음" };

    const { error } = await serverClient
        .from("site_config")
        .upsert([{ key: "job_fields", value: jobFields }], {
            onConflict: "key",
        });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

async function applyJobFieldInheritance(parentId: string, newId: string) {
    if (!serverClient) return { error: "serverClient 없음" };

    const { data: posts } = await serverClient
        .from("posts")
        .select("id, job_field");
    const postsToUpdate = ((posts as PostJobFieldRow[] | null) ?? []).filter(
        (post) => toStringArray(post.job_field).includes(parentId)
    );

    for (const post of postsToUpdate) {
        const next = Array.from(
            new Set([...toStringArray(post.job_field), newId])
        );
        const { error } = await serverClient
            .from("posts")
            .update({ job_field: next })
            .eq("id", post.id);

        if (error) return { error: error.message };
    }

    const { data: portfolioItems } = await serverClient
        .from("portfolio_items")
        .select("id, data");
    const portfolioToUpdate = (
        (portfolioItems as
            | { id: string; data: Record<string, unknown> | null }[]
            | null) ?? []
    ).filter((item) => {
        const jobField = item.data?.jobField;
        return toStringArray(
            Array.isArray(jobField) || typeof jobField === "string"
                ? jobField
                : undefined
        ).includes(parentId);
    });

    for (const item of portfolioToUpdate) {
        const nextJobField = addInheritedField(
            item.data?.jobField as JobFieldValue,
            parentId,
            newId
        );
        const { error } = await serverClient
            .from("portfolio_items")
            .update({
                data: {
                    ...(item.data ?? {}),
                    jobField: nextJobField,
                },
            })
            .eq("id", item.id);

        if (error) return { error: error.message };
    }

    const { data: resumeRow } = await serverClient
        .from("resume_data")
        .select("id, data")
        .eq("lang", "ko")
        .single();

    if (resumeRow?.data) {
        const resumeData = resumeRow.data as ResumeData;
        const { error } = await serverClient
            .from("resume_data")
            .update({
                data: inheritResumeJobField(resumeData, parentId, newId),
            })
            .eq("id", resumeRow.id);

        if (error) return { error: error.message };
    }

    return { error: null };
}

async function deleteJobFieldCascade(targetId: string) {
    if (!serverClient) return { error: "serverClient 없음" };

    const { data: posts } = await serverClient
        .from("posts")
        .select("id, job_field");
    const postsToUpdate = ((posts as PostJobFieldRow[] | null) ?? []).filter(
        (post) => toStringArray(post.job_field).includes(targetId)
    );

    for (const post of postsToUpdate) {
        const next = toStringArray(post.job_field).filter(
            (item) => item !== targetId
        );
        const { error } = await serverClient
            .from("posts")
            .update({ job_field: next.length > 0 ? next : null })
            .eq("id", post.id);

        if (error) return { error: error.message };
    }

    const { data: portfolioItems } = await serverClient
        .from("portfolio_items")
        .select("id, job_field, data");
    const portfolioToUpdate = (
        (portfolioItems as PortfolioJobFieldRow[] | null) ?? []
    ).filter((item) => {
        const columnMatch = toStringArray(item.job_field).includes(targetId);
        const jsonValue = item.data?.jobField;
        const jsonMatch = toStringArray(
            Array.isArray(jsonValue) || typeof jsonValue === "string"
                ? jsonValue
                : undefined
        ).includes(targetId);

        return columnMatch || jsonMatch;
    });

    for (const item of portfolioToUpdate) {
        const nextColumn = toStringArray(item.job_field).filter(
            (fieldId) => fieldId !== targetId
        );
        const nextJobField = removeFlexibleField(
            item.data?.jobField as JobFieldValue,
            targetId
        );
        const nextData = { ...(item.data ?? {}) };

        if (typeof nextJobField === "undefined") {
            delete nextData.jobField;
        } else {
            nextData.jobField = nextJobField;
        }

        const { error } = await serverClient
            .from("portfolio_items")
            .update({
                job_field: nextColumn.length > 0 ? nextColumn : null,
                data: nextData,
            })
            .eq("id", item.id);

        if (error) return { error: error.message };
    }

    const { data: resumeRow } = await serverClient
        .from("resume_data")
        .select("id, data")
        .eq("lang", "ko")
        .single();

    if (resumeRow?.data) {
        const resumeData = resumeRow.data as ResumeData;
        const { error } = await serverClient
            .from("resume_data")
            .update({
                data: removeResumeJobField(resumeData, targetId),
            })
            .eq("id", resumeRow.id);

        if (error) return { error: error.message };
    }

    return { error: null };
}

export async function saveSiteConfig(
    input: SaveSiteConfigInput
): Promise<SiteConfigActionResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    try {
        const headerName = input.headerName.trim();
        if (!headerName) {
            return { success: false, error: "헤더 이름 필요" };
        }
        const rows: { key: string; value: unknown }[] = [
            { key: "header_name", value: JSON.stringify(headerName) },
            { key: "color_scheme", value: JSON.stringify(input.colorScheme) },
            {
                key: "theme_mode",
                value: JSON.stringify(normalizeThemeMode(input.themeMode)),
            },
            {
                key: "site_name",
                value: JSON.stringify(input.seoConfig.defaultTitle),
            },
            {
                key: "seo_config",
                value: {
                    default_description: input.seoConfig.defaultDescription,
                    default_og_image: input.seoConfig.defaultOgImage,
                    job_fields: Object.fromEntries(
                        Object.entries(input.seoConfig.jobFields).map(
                            ([id, seo]) => [
                                id,
                                {
                                    title: seo.title.trim(),
                                    description: seo.description.trim(),
                                    og_image: seo.ogImage.trim(),
                                },
                            ]
                        )
                    ),
                },
            },
        ];

        rows.push(
            { key: "plain_mode", value: input.plainMode },
            {
                key: "github_url",
                value: JSON.stringify(input.githubUrl.trim()),
            }
        );

        const { error } = await serverClient
            .from("site_config")
            .upsert(rows, { onConflict: "key" });

        if (error) return { success: false, error: error.message };

        await revalidateHome();
        await revalidateResume();
        await revalidateLayout();

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "설정 저장 실패",
        };
    }
}

export async function addSiteJobField(input: {
    name: string;
    emoji: string;
    headerTitle: string;
    inheritFrom: string;
}): Promise<SiteJobFieldActionResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    try {
        const trimmedName = input.name.trim();
        const headerTitle = input.headerTitle.trim();
        if (!trimmedName) {
            return { success: false, error: "직무 분야 이름 필요" };
        }
        if (!headerTitle) {
            return { success: false, error: "헤더 직무 제목 필요" };
        }

        const newId = toSlug(trimmedName).slice(0, 64);
        if (!isPublicJobFieldId(newId)) {
            return {
                success: false,
                error: "공개 URL에 사용할 수 없는 직무 분야 이름입니다",
            };
        }
        const { jobFields } = await getJobFieldConfig();

        if (jobFields.some((field) => field.id === newId)) {
            return {
                success: false,
                error: `"${newId}" ID가 이미 존재합니다`,
            };
        }

        const nextJobFields = [
            ...jobFields,
            {
                id: newId,
                name: trimmedName,
                emoji: input.emoji || "✨",
                headerTitle: headerTitle.slice(0, 80),
            },
        ];

        const saveResult = await saveJobFieldConfig(nextJobFields);
        if (saveResult.error) {
            return { success: false, error: saveResult.error };
        }

        if (input.inheritFrom) {
            const inheritResult = await applyJobFieldInheritance(
                input.inheritFrom,
                newId
            );
            if (inheritResult.error) {
                return { success: false, error: inheritResult.error };
            }
        }

        await revalidateHome();
        await revalidateResume();
        await revalidateLayout();

        return {
            success: true,
            jobFields: nextJobFields,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "직무 분야 추가 실패",
        };
    }
}

export async function deleteSiteJobField(
    targetId: string
): Promise<SiteJobFieldActionResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    try {
        const { jobFields } = await getJobFieldConfig();
        if (!jobFields.some((field) => field.id === targetId)) {
            return {
                success: false,
                error: "삭제할 직무 분야를 찾지 못했습니다",
            };
        }

        const cascadeResult = await deleteJobFieldCascade(targetId);
        if (cascadeResult.error) {
            return { success: false, error: cascadeResult.error };
        }

        const nextJobFields = jobFields.filter(
            (field) => field.id !== targetId
        );
        const saveResult = await saveJobFieldConfig(nextJobFields);
        if (saveResult.error) {
            return { success: false, error: saveResult.error };
        }

        await revalidateHome();
        await revalidateResume();
        await revalidateLayout();

        return {
            success: true,
            jobFields: nextJobFields,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "직무 분야 삭제 실패",
        };
    }
}

export async function updateSiteJobField(input: {
    id: string;
    name: string;
    emoji: string;
    headerTitle: string;
}): Promise<SiteJobFieldActionResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    try {
        const name = input.name.trim();
        const headerTitle = input.headerTitle.trim();
        if (!name) return { success: false, error: "직무 분야 이름 필요" };
        if (!headerTitle)
            return { success: false, error: "헤더 직무 제목 필요" };
        const { jobFields } = await getJobFieldConfig();
        if (!jobFields.some((field) => field.id === input.id)) {
            return {
                success: false,
                error: "수정할 직무 분야를 찾지 못했습니다",
            };
        }
        const nextJobFields = jobFields.map((field) =>
            field.id === input.id
                ? {
                      ...field,
                      name,
                      emoji: input.emoji || "✨",
                      headerTitle: headerTitle.slice(0, 80),
                  }
                : field
        );
        const saveResult = await saveJobFieldConfig(nextJobFields);
        if (saveResult.error)
            return { success: false, error: saveResult.error };
        await revalidateHome();
        await revalidateResume();
        await revalidateLayout();
        return { success: true, jobFields: nextJobFields };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "직무 분야 수정 실패",
        };
    }
}
