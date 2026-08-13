import { dedupeJobFieldsById } from "@/lib/job-field";
import { getSiteConfig } from "@/lib/queries";

const PUBLIC_JOB_FIELD_PATTERN = /^[a-z0-9_-]{1,64}$/i;
const RESERVED_PUBLIC_JOB_FIELD_IDS = new Set([
    "about",
    "admin",
    "api",
    "blog",
    "books",
    "portfolio",
    "resume",
]);

export type PublicJobField = {
    id: string;
    name: string;
    emoji: string;
    headerTitle?: string;
};

// 공개 검색 jobField 정규화
export function sanitizePublicJobField(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (!PUBLIC_JOB_FIELD_PATTERN.test(trimmed)) return null;
    return trimmed;
}

export function isPublicJobFieldId(value: string): boolean {
    const id = sanitizePublicJobField(value);
    return id === value && !RESERVED_PUBLIC_JOB_FIELD_IDS.has(value);
}

function parseSiteConfigValue(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function isPublicJobField(value: unknown): value is PublicJobField {
    if (!value || typeof value !== "object") return false;
    const field = value as Partial<PublicJobField>;
    return (
        typeof field.id === "string" &&
        isPublicJobFieldId(field.id) &&
        typeof field.name === "string" &&
        field.name.trim().length > 0 &&
        typeof field.emoji === "string"
    );
}

// site_config.job_fields 원시 값을 공개 URL용 안전한 목록으로 변환
export function normalizePublicJobFields(value: unknown): PublicJobField[] {
    const parsed = parseSiteConfigValue(value);
    if (!Array.isArray(parsed)) return [];
    return dedupeJobFieldsById(parsed.filter(isPublicJobField)).map(
        (field) => ({
            ...field,
            name: field.name.trim(),
            headerTitle:
                typeof field.headerTitle === "string" &&
                field.headerTitle.trim()
                    ? field.headerTitle.trim().slice(0, 80)
                    : field.name.trim(),
        })
    );
}

export function findPublicJobField(
    jobFields: readonly PublicJobField[],
    value: string
): PublicJobField | null {
    const id = sanitizePublicJobField(value);
    if (!id) return null;
    return jobFields.find((field) => field.id === id) ?? null;
}

export async function getPublicJobFields(): Promise<PublicJobField[]> {
    const configRows = await getSiteConfig();
    const jobFieldsRow = configRows.find((row) => row.key === "job_fields");
    return normalizePublicJobFields(jobFieldsRow?.value);
}

export async function resolvePublicJobField(
    value: string
): Promise<PublicJobField | null> {
    return findPublicJobField(await getPublicJobFields(), value);
}
