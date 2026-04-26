type JobFieldValue = string | string[] | null | undefined;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJobFieldArray(value: JobFieldValue): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string" && value.length > 0) return [value];
    return [];
}

/**
 * resume JSON 내부의 모든 jobField 값을 shape 보존 방식으로 변환한다.
 */
function mapResumeJobFields(
    value: unknown,
    mapper: (value: JobFieldValue) => JobFieldValue
): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => mapResumeJobFields(item, mapper));
    }

    if (!isRecord(value)) return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
            key,
            key === "jobField"
                ? mapper(child as JobFieldValue)
                : mapResumeJobFields(child, mapper),
        ])
    );
}

/**
 * resume JSON에서 삭제 대상 job field id만 제거한다.
 */
export function removeResumeJobField<T extends JsonRecord>(
    resumeData: T,
    targetId: string
): T {
    return mapResumeJobFields(resumeData, (value) => {
        const next = toJobFieldArray(value).filter((item) => item !== targetId);
        if (Array.isArray(value)) return next.length > 0 ? next : undefined;
        if (value === targetId) return undefined;
        return value;
    }) as T;
}

/**
 * parent job field가 붙은 resume 항목에 신규 job field id를 상속 추가한다.
 */
export function inheritResumeJobField<T extends JsonRecord>(
    resumeData: T,
    parentId: string,
    newId: string
): T {
    return mapResumeJobFields(resumeData, (value) => {
        const current = toJobFieldArray(value);
        if (!current.includes(parentId)) return value;
        return Array.from(new Set([...current, newId]));
    }) as T;
}
