import type { Resume } from "@/types/resume";

// Resume 섹션 layout 정의 — 순서 + 비활성화 섹션 집합
export type ResumeSectionLayout = {
    order: string[];
    disabled: string[];
};

// 기본 활성 섹션 순서
const DEFAULT_ENABLED: string[] = [
    "coreCompetencies",
    "work",
    "projects",
    "education",
    "skills",
];

// 기본 비활성 섹션 목록
const DEFAULT_DISABLED: string[] = [
    "careerPhases",
    "volunteer",
    "awards",
    "certificates",
    "publications",
    "languages",
    "interests",
    "references",
];

// 제어 가능한 전체 섹션 키 (basics 제외, 항상 상단 고정)
export const ALL_RESUME_SECTION_KEYS: string[] = [
    ...DEFAULT_ENABLED,
    ...DEFAULT_DISABLED,
];

export const DEFAULT_RESUME_LAYOUT: ResumeSectionLayout = {
    order: ALL_RESUME_SECTION_KEYS,
    disabled: DEFAULT_DISABLED,
};

// layout 정규화 — 누락 키를 뒤에 append, 알 수 없는 키는 제거
export function normalizeLayout(
    layout: ResumeSectionLayout | null | undefined
): ResumeSectionLayout {
    if (!layout) return DEFAULT_RESUME_LAYOUT;
    const known = new Set(ALL_RESUME_SECTION_KEYS);
    const seen = new Set<string>();
    const order: string[] = [];
    for (const k of layout.order ?? []) {
        if (known.has(k) && !seen.has(k)) {
            order.push(k);
            seen.add(k);
        }
    }
    for (const k of ALL_RESUME_SECTION_KEYS) {
        if (!seen.has(k)) order.push(k);
    }
    const disabled = (layout.disabled ?? []).filter((k) => known.has(k));
    return { order, disabled };
}

// 실제 render할 섹션 키 배열 반환 — order 순서, disabled 제외, entries 존재 여부 체크
export function resolveSectionOrder(
    resume: Resume,
    layout: ResumeSectionLayout | null | undefined
): string[] {
    const normalized = normalizeLayout(layout);
    const disabledSet = new Set(normalized.disabled);
    return normalized.order.filter((key) => {
        if (disabledSet.has(key)) return false;
        if (key === "coreCompetencies") {
            return (resume.coreCompetencies ?? []).length > 0;
        }
        const sec = (resume as unknown as Record<string, unknown>)[key];
        if (!sec || typeof sec !== "object") return false;
        const entries = (sec as { entries?: unknown[] }).entries;
        return Array.isArray(entries) && entries.length > 0;
    });
}
