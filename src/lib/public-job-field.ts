const PUBLIC_JOB_FIELD_PATTERN = /^[a-z0-9_-]{1,64}$/i;

// 공개 검색 jobField 정규화
export function sanitizePublicJobField(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (!PUBLIC_JOB_FIELD_PATTERN.test(trimmed)) return null;
    return trimmed;
}
