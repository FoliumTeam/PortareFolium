import {
    normalizeResumeBasicsPresentationConfig,
    resolveResumeBasicsPresentation,
} from "@/lib/resume-basics-presentation";
import { normalizeLayout, type ResumeSectionLayout } from "@/lib/resume-layout";
import {
    PDF_DETAIL_KEYS,
    type PdfDetailKey,
    type PdfEffectiveOptions,
    type ResumePdfOptions,
    type ResumePdfSource,
} from "@/types/resume-pdf";
import { RESUME_BASICS_VISIBILITY_KEYS } from "@/types/resume";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const boolRecord = <K extends string>(
    value: unknown,
    keys?: readonly K[]
): Partial<Record<K, boolean>> =>
    isRecord(value)
        ? (Object.fromEntries(
              Object.entries(value).filter(
                  ([k, v]) =>
                      typeof v === "boolean" &&
                      (!keys || (keys as readonly string[]).includes(k))
              )
          ) as Partial<Record<K, boolean>>)
        : {};

const stringList = (value: unknown): string[] | undefined =>
    Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : undefined;

const parseJson = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
};

const omit = (value: Record<string, unknown>, keys: readonly string[]) =>
    Object.fromEntries(
        Object.entries(value).filter(([k]) => !keys.includes(k))
    );

// 저장값 정규화: 형식이 틀린 값은 버리고, 모르는 키는 보존
export const normalizePdfOptions = (raw: unknown): ResumePdfOptions => {
    const input = isRecord(raw) ? raw : {};
    const projectsRaw = isRecord(input.projects) ? input.projects : {};
    const detailsRaw = isRecord(input.details) ? input.details : {};
    const projects = omit(projectsRaw, ["order"]);
    const details = omit(detailsRaw, [...PDF_DETAIL_KEYS, "excludedCore"]);
    const hidden = isRecord(projects.hiddenSubsections)
        ? projects.hiddenSubsections
        : {};
    const order = stringList(projectsRaw.order);
    const sectionOrder = stringList(input.sectionOrder);
    const excludedCore = stringList(detailsRaw.excludedCore);
    return {
        ...omit(input, ["sectionOrder"]),
        version: 1,
        sections: boolRecord(input.sections) as Record<string, boolean>,
        ...(sectionOrder ? { sectionOrder } : {}),
        basics: boolRecord(input.basics, RESUME_BASICS_VISIBILITY_KEYS),
        projects: {
            ...projects,
            ...(order ? { order } : {}),
            hiddenSubsections: Object.fromEntries(
                Object.entries(hidden)
                    .map(([slug, titles]) => [slug, stringList(titles) ?? []])
                    .filter(([, titles]) => titles.length)
            ),
            compactPersonal: projects.compactPersonal === true,
        },
        details: {
            ...details,
            ...boolRecord(detailsRaw, PDF_DETAIL_KEYS),
            ...(excludedCore ? { excludedCore } : {}),
        },
    };
};

// 유효 설정 = 사이트 설정 + PDF 덮어쓰기. 사이트 설정에는 쓰지 않음
export const resolveEffectiveOptions = (
    source: ResumePdfSource,
    options: ResumePdfOptions
): PdfEffectiveOptions => {
    const layout = normalizeLayout(
        parseJson(source.sectionLayout) as ResumeSectionLayout | undefined
    );
    const disabled = new Set(layout.disabled);
    const order = options.sectionOrder?.length
        ? normalizeLayout({ order: options.sectionOrder, disabled: [] }).order
        : layout.order;
    const sections = new Set(
        order.filter((key) => options.sections[key] ?? !disabled.has(key))
    );
    const presentation = resolveResumeBasicsPresentation(
        normalizeResumeBasicsPresentationConfig(
            parseJson(source.basicsPresentation)
        ),
        source.jobField
    );
    const details = Object.fromEntries(
        PDF_DETAIL_KEYS.map((key) => [key, options.details[key] ?? true])
    ) as Record<PdfDetailKey, boolean>;
    return {
        sectionOrder: order,
        sections,
        basics: { ...presentation.visibility, ...options.basics },
        details,
        excludedCore: new Set(options.details.excludedCore ?? []),
        projects: options.projects,
    };
};
