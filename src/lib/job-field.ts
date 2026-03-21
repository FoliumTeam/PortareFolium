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
