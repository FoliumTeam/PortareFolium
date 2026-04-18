/**
 * 직무 분야 필터링 유틸리티
 *
 * jobField 필드가 없거나 비어 있는 항목은 제외.
 * 문자열이면 일치 여부, 배열이면 포함 여부로 판단.
 */
export function filterByJobField<T extends { jobField?: string | string[] }>(
    items: T[] = [],
    jobField: string
): T[] {
    return items.filter((item) => {
        const jf = item.jobField;
        if (jf == null || (Array.isArray(jf) && jf.length === 0)) return false;
        if (Array.isArray(jf)) return jf.includes(jobField);
        return jf === jobField;
    });
}

/**
 * 단일 항목의 jobField가 필터와 일치하는지 확인.
 * ResumePanel 등 리스트 렌더링 필터에서 사용.
 */
export function matchesJobField(
    jobField: string | string[] | undefined,
    filter: string
): boolean {
    if (!jobField) return false;
    return Array.isArray(jobField)
        ? jobField.includes(filter)
        : jobField === filter;
}

// 저장된 job field 문자열 정규화
export function normalizeJobFieldValue(
    value: string | null | undefined
): string {
    if (!value) return "";
    try {
        const parsed = JSON.parse(value) as unknown;
        return typeof parsed === "string" ? parsed : value;
    } catch {
        return value;
    }
}

// 저장된 job field 목록 정규화
export function normalizeJobFieldList(
    value: string | string[] | null | undefined
): string[] {
    if (!value) return [];
    return (Array.isArray(value) ? value : [value])
        .map((item) => normalizeJobFieldValue(item))
        .filter(Boolean);
}

// 신규 생성 기본 job field 목록 생성
export function getInitialJobFieldSelection(
    activeJobField: string | null | undefined
): string[] {
    const normalized = normalizeJobFieldValue(activeJobField);
    return normalized ? [normalized] : [];
}
