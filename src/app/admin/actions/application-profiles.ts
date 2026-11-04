"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { revalidateLocalizedPath as revalidatePath } from "@/lib/localized-revalidate";
import { requireAdminSession } from "@/lib/server-admin";
import {
    createApplicationProfileToken,
    createApplicationSourceSnapshot,
    getApplicationProfileForAdmin,
    getApplicationProfileStatus,
    materializeApplicationProfile,
} from "@/lib/application-profile";
import { normalizePublicJobFields } from "@/lib/public-job-field";
import { serverClient } from "@/lib/supabase";
import { issueToken } from "@/lib/agent-token";
import {
    EMPTY_APPLICATION_PROFILE_OVERRIDES,
    type ApplicationProfile,
    type ApplicationProfileOverrides,
    type ApplicationProfileStatus,
} from "@/types/application-profile";

type ApplicationProfileResult =
    | { success: true; profile: ApplicationProfile }
    | { success: false; error: string };

type ApplicationProfileInput = {
    id?: string;
    expectedVersion?: number;
    name: string;
    parentJobField: string;
    jobDescription: string;
    overrides: ApplicationProfileOverrides;
};

function getProfileUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    return baseUrl ? `${baseUrl}/${token}` : `/${token}`;
}

function revalidateApplicationProfile(profile: ApplicationProfile): void {
    const prefix = `/${profile.public_token}`;
    revalidatePath(prefix);
    revalidatePath(`${prefix}/about`);
    revalidatePath(`${prefix}/resume`);
    revalidatePath(`${prefix}/portfolio`);
    revalidatePath(`${prefix}/blog`);
    const snapshot =
        profile.public_snapshot ?? materializeApplicationProfile(profile);
    for (const item of snapshot.portfolio) {
        revalidatePath(`${prefix}/portfolio/${item.slug}`);
    }
    for (const post of snapshot.posts) {
        revalidatePath(`${prefix}/blog/${post.slug}`);
    }
}

async function listProfiles(): Promise<ApplicationProfile[]> {
    if (!serverClient) return [];
    const { data } = await serverClient
        .from("application_profiles")
        .select("*")
        .order("updated_at", { ascending: false });
    return (data ?? []) as ApplicationProfile[];
}

// 지원 프로필 패널 초기 데이터 조회
async function getApplicationProfilesBootstrapInLocale(): Promise<{
    profiles: (ApplicationProfile & {
        needsUpdate: boolean;
        publicUrl: string;
    })[];
    jobFields: {
        id: string;
        name: string;
        emoji: string;
        headerTitle?: string;
    }[];
}> {
    await requireAdminSession();
    if (!serverClient) return { profiles: [], jobFields: [] };
    const [{ data: jobFieldsRow }, profiles] = await Promise.all([
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_fields")
            .maybeSingle(),
        listProfiles(),
    ]);
    const statuses = await Promise.all(
        profiles.map(async (profile) => {
            try {
                return await getApplicationProfileStatus(profile);
            } catch {
                return {
                    sourceHash: profile.base_snapshot.sourceHash,
                    needsUpdate: false,
                };
            }
        })
    );
    return {
        profiles: profiles.map((profile, index) => ({
            ...profile,
            needsUpdate: statuses[index].needsUpdate,
            publicUrl: getProfileUrl(profile.public_token),
        })),
        jobFields: normalizePublicJobFields(jobFieldsRow?.value),
    };
}

// 새 JD 지원 프로필 생성
async function createApplicationProfileInLocale(
    input: Omit<ApplicationProfileInput, "id" | "expectedVersion">
): Promise<ApplicationProfileResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    const name = input.name.trim();
    if (!name || name.length > 120) {
        return { success: false, error: "이름은 1자 이상 120자 이하 필요" };
    }
    try {
        const baseSnapshot = await createApplicationSourceSnapshot(
            input.parentJobField
        );
        const { data, error } = await serverClient
            .from("application_profiles")
            .insert({
                name,
                public_token: createApplicationProfileToken(),
                parent_job_field: input.parentJobField,
                job_description: input.jobDescription.trim(),
                base_snapshot: baseSnapshot,
                overrides: {
                    ...EMPTY_APPLICATION_PROFILE_OVERRIDES,
                    ...input.overrides,
                },
            })
            .select("*")
            .single();
        if (error || !data)
            return { success: false, error: error?.message ?? "생성 실패" };
        return { success: true, profile: data as ApplicationProfile };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "생성 실패",
        };
    }
}

// JD별 수정사항 저장
async function saveApplicationProfileInLocale(
    input: ApplicationProfileInput
): Promise<ApplicationProfileResult> {
    await requireAdminSession();
    if (!serverClient || !input.id || input.expectedVersion == null) {
        return { success: false, error: "저장 대상 또는 버전 없음" };
    }
    const name = input.name.trim();
    if (!name || name.length > 120)
        return { success: false, error: "이름은 1자 이상 120자 이하 필요" };
    const { data, error } = await serverClient
        .from("application_profiles")
        .update({
            name,
            job_description: input.jobDescription.trim(),
            overrides: {
                ...EMPTY_APPLICATION_PROFILE_OVERRIDES,
                ...input.overrides,
            },
            version: input.expectedVersion + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("version", input.expectedVersion)
        .select("*")
        .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data)
        return {
            success: false,
            error: "다른 편집 내용 존재. 새로고침 후 다시 저장 필요",
        };
    return { success: true, profile: data as ApplicationProfile };
}

// 최신 부모 직군 기준본 반영
async function updateApplicationProfileFromParentInLocale(
    id: string,
    expectedVersion: number
): Promise<ApplicationProfileResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    const profile = await getApplicationProfileForAdmin(id);
    if (!profile) return { success: false, error: "지원 프로필 없음" };
    const baseSnapshot = await createApplicationSourceSnapshot(
        profile.parent_job_field
    );
    const nextPublicSnapshot = materializeApplicationProfile({
        ...profile,
        base_snapshot: baseSnapshot,
    });
    const { data, error } = await serverClient
        .from("application_profiles")
        .update({
            base_snapshot: baseSnapshot,
            public_snapshot:
                profile.status === "published"
                    ? nextPublicSnapshot
                    : profile.public_snapshot,
            version: expectedVersion + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data)
        return {
            success: false,
            error: "다른 편집 내용 존재. 새로고침 후 다시 시도 필요",
        };
    const next = data as ApplicationProfile;
    if (next.status === "published") revalidateApplicationProfile(next);
    return { success: true, profile: next };
}

// 공개본 확정 또는 재생성
async function publishApplicationProfileInLocale(
    id: string,
    expectedVersion: number
): Promise<ApplicationProfileResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    const profile = await getApplicationProfileForAdmin(id);
    if (!profile) return { success: false, error: "지원 프로필 없음" };
    const publicSnapshot = materializeApplicationProfile(profile);
    const { data, error } = await serverClient
        .from("application_profiles")
        .update({
            status: "published" as ApplicationProfileStatus,
            public_snapshot: publicSnapshot,
            published_at: new Date().toISOString(),
            version: expectedVersion + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data)
        return {
            success: false,
            error: "다른 편집 내용 존재. 새로고침 후 다시 시도 필요",
        };
    const next = data as ApplicationProfile;
    revalidateApplicationProfile(next);
    return { success: true, profile: next };
}

// 공개 링크 폐기
async function revokeApplicationProfileInLocale(
    id: string,
    expectedVersion: number
): Promise<ApplicationProfileResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    const { data, error } = await serverClient
        .from("application_profiles")
        .update({
            status: "revoked" as ApplicationProfileStatus,
            version: expectedVersion + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data)
        return {
            success: false,
            error: "다른 편집 내용 존재. 새로고침 후 다시 시도 필요",
        };
    const next = data as ApplicationProfile;
    revalidateApplicationProfile(next);
    return { success: true, profile: next };
}

// 특정 지원 프로필 초안 전용 MCP 토큰 발급
async function issueApplicationProfileDraftTokenInLocale(
    id: string,
    durationMin = 60
): Promise<
    { success: true; token: string } | { success: false; error: string }
> {
    await requireAdminSession();
    const profile = await getApplicationProfileForAdmin(id);
    if (!profile) return { success: false, error: "지원 프로필 없음" };
    const token = await issueToken(
        `지원 프로필 초안: ${profile.name}`,
        durationMin,
        {
            applicationProfileIds: [id],
            actions: ["application:read", "application:draft"],
        }
    );
    return token
        ? { success: true, token }
        : { success: false, error: "토큰 발급 실패" };
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getApplicationProfilesBootstrap(
    ...args: [
        ...Parameters<typeof getApplicationProfilesBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<
    Awaited<ReturnType<typeof getApplicationProfilesBootstrapInLocale>>
> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getApplicationProfilesBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getApplicationProfilesBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function createApplicationProfile(
    ...args: [
        ...Parameters<typeof createApplicationProfileInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof createApplicationProfileInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof createApplicationProfileInLocale>;
    return withContentLocale(locale, () =>
        createApplicationProfileInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveApplicationProfile(
    ...args: [
        ...Parameters<typeof saveApplicationProfileInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof saveApplicationProfileInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveApplicationProfileInLocale>;
    return withContentLocale(locale, () =>
        saveApplicationProfileInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function updateApplicationProfileFromParent(
    ...args: [
        ...Parameters<typeof updateApplicationProfileFromParentInLocale>,
        ContentLocaleScope?,
    ]
): Promise<
    Awaited<ReturnType<typeof updateApplicationProfileFromParentInLocale>>
> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof updateApplicationProfileFromParentInLocale>;
    return withContentLocale(locale, () =>
        updateApplicationProfileFromParentInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function publishApplicationProfile(
    ...args: [
        ...Parameters<typeof publishApplicationProfileInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof publishApplicationProfileInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof publishApplicationProfileInLocale>;
    return withContentLocale(locale, () =>
        publishApplicationProfileInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function revokeApplicationProfile(
    ...args: [
        ...Parameters<typeof revokeApplicationProfileInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof revokeApplicationProfileInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof revokeApplicationProfileInLocale>;
    return withContentLocale(locale, () =>
        revokeApplicationProfileInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function issueApplicationProfileDraftToken(
    ...args: [
        ...Parameters<typeof issueApplicationProfileDraftTokenInLocale>,
        ContentLocaleScope?,
    ]
): Promise<
    Awaited<ReturnType<typeof issueApplicationProfileDraftTokenInLocale>>
> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof issueApplicationProfileDraftTokenInLocale>;
    return withContentLocale(locale, () =>
        issueApplicationProfileDraftTokenInLocale(...values)
    );
}
