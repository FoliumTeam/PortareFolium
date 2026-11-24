"use server";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import type { PdfLang, PdfVariant, ResumePdfOptions } from "@/types/resume-pdf";

export type ResumePdfPreset = {
    id: string;
    name: string;
    source_kind: "job_field" | "application_profile";
    job_field: string;
    application_profile_id: string | null;
    lang: PdfLang;
    variant: PdfVariant;
    options: ResumePdfOptions;
    created_at: string;
    updated_at: string;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type ResumePdfPresetInput = {
    id?: string;
    name: string;
    sourceKind: ResumePdfPreset["source_kind"];
    jobField: string;
    applicationProfileId?: string | null;
    lang: PdfLang;
    variant: PdfVariant;
    options: unknown;
};

const TABLE = "resume_pdf_presets";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 저장 크기 상한: 설정만 담으므로 64KB면 충분
const MAX_OPTIONS_BYTES = 64 * 1024;

const cleanName = (name: unknown): string | null => {
    const value = typeof name === "string" ? name.trim() : "";
    return value.length >= 1 && value.length <= 120 ? value : null;
};

const fromRow = (row: Record<string, unknown>): ResumePdfPreset => ({
    ...(row as ResumePdfPreset),
    options: normalizePdfOptions(row.options),
});

// 입력 검사 → 저장 행. 틀리면 오류 문구
const toRow = (
    input: ResumePdfPresetInput
): { row: Record<string, unknown> } | { error: string } => {
    const name = cleanName(input.name);
    if (!name) return { error: "프리셋 이름은 1–120자" };
    if (!["job_field", "application_profile"].includes(input.sourceKind))
        return { error: "잘못된 생성 경로" };
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(input.jobField ?? ""))
        return { error: "잘못된 직무 분야" };
    const profileId =
        input.sourceKind === "application_profile"
            ? input.applicationProfileId
            : null;
    if (
        input.sourceKind === "application_profile" &&
        !UUID.test(profileId ?? "")
    )
        return { error: "잘못된 지원 프로필" };
    if (!["ko", "ja"].includes(input.lang)) return { error: "잘못된 언어" };
    if (!["C", "F"].includes(input.variant)) return { error: "잘못된 변형" };
    const options = normalizePdfOptions(input.options);
    if (JSON.stringify(options).length > MAX_OPTIONS_BYTES)
        return { error: "설정이 너무 큼" };
    return {
        row: {
            name,
            source_kind: input.sourceKind,
            job_field: input.jobField,
            application_profile_id: profileId ?? null,
            lang: input.lang,
            variant: input.variant,
            options,
        },
    };
};

// 생성 경로별 프리셋 목록 (최근 수정 순)
export async function listResumePdfPresets(source: {
    sourceKind: ResumePdfPreset["source_kind"];
    jobField: string;
    applicationProfileId?: string | null;
}): Promise<Result<ResumePdfPreset[]>> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "DB 연결 없음" };
    let query = serverClient
        .from(TABLE)
        .select("*")
        .eq("source_kind", source.sourceKind)
        .eq("job_field", source.jobField);
    if (source.sourceKind === "application_profile") {
        if (!UUID.test(source.applicationProfileId ?? ""))
            return { success: false, error: "잘못된 지원 프로필" };
        query = query.eq(
            "application_profile_id",
            source.applicationProfileId!
        );
    }
    const { data, error } = await query.order("updated_at", {
        ascending: false,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map(fromRow) };
}

// 저장: id가 있으면 갱신, 없으면 생성
export async function saveResumePdfPreset(
    input: ResumePdfPresetInput
): Promise<Result<ResumePdfPreset>> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "DB 연결 없음" };
    const parsed = toRow(input);
    if ("error" in parsed) return { success: false, error: parsed.error };
    if (input.id !== undefined && !UUID.test(input.id))
        return { success: false, error: "잘못된 프리셋" };
    const query = input.id
        ? serverClient.from(TABLE).update(parsed.row).eq("id", input.id)
        : serverClient.from(TABLE).insert(parsed.row);
    const { data, error } = await query.select("*").single();
    if (error || !data)
        return { success: false, error: error?.message ?? "저장 실패" };
    return { success: true, data: fromRow(data as Record<string, unknown>) };
}

export async function renameResumePdfPreset(
    id: string,
    name: string
): Promise<Result<ResumePdfPreset>> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "DB 연결 없음" };
    const clean = cleanName(name);
    if (!UUID.test(id) || !clean)
        return { success: false, error: "잘못된 입력" };
    const { data, error } = await serverClient
        .from(TABLE)
        .update({ name: clean })
        .eq("id", id)
        .select("*")
        .single();
    if (error || !data)
        return { success: false, error: error?.message ?? "이름 변경 실패" };
    return { success: true, data: fromRow(data as Record<string, unknown>) };
}

export async function deleteResumePdfPreset(id: string): Promise<Result<null>> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "DB 연결 없음" };
    if (!UUID.test(id)) return { success: false, error: "잘못된 프리셋" };
    const { error } = await serverClient.from(TABLE).delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
}
