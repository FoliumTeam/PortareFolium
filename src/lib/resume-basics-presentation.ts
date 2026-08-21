import {
    RESUME_BASICS_VISIBILITY_KEYS,
    type ResumeBasicsPresentation,
    type ResumeBasicsPresentationConfig,
    type ResumeBasicsVisibilityKey,
    type ResumeMilitary,
} from "@/types/resume";

const PRESENTATION_KEY = "resume_basics_presentation";

export const RESUME_BASICS_PRESENTATION_CONFIG_KEY = PRESENTATION_KEY;

const DEFAULT_VISIBILITY: Record<ResumeBasicsVisibilityKey, boolean> = {
    image: true,
    name: true,
    headline: true,
    summary: true,
    email: true,
    phone: true,
    url: true,
    location: true,
    profiles: true,
    birthDate: false,
    military: false,
};

export const DEFAULT_RESUME_BASICS_PRESENTATION: ResumeBasicsPresentation = {
    headerPreset: "split",
    personalDetailPreset: "detailed",
    visibility: DEFAULT_VISIBILITY,
};

export const DEFAULT_RESUME_BASICS_PRESENTATION_CONFIG: ResumeBasicsPresentationConfig =
    {
        shared: DEFAULT_RESUME_BASICS_PRESENTATION,
        jobFields: {},
    };

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clonePresentation(
    presentation: ResumeBasicsPresentation
): ResumeBasicsPresentation {
    return {
        ...presentation,
        visibility: { ...presentation.visibility },
    };
}

export function normalizeResumeBasicsPresentation(
    value: unknown
): ResumeBasicsPresentation {
    if (!isRecord(value))
        return clonePresentation(DEFAULT_RESUME_BASICS_PRESENTATION);

    const rawVisibility = isRecord(value.visibility) ? value.visibility : {};
    const visibility = RESUME_BASICS_VISIBILITY_KEYS.reduce(
        (next, key) => {
            next[key] =
                typeof rawVisibility[key] === "boolean"
                    ? rawVisibility[key]
                    : DEFAULT_VISIBILITY[key];
            return next;
        },
        {} as Record<ResumeBasicsVisibilityKey, boolean>
    );

    return {
        headerPreset:
            value.headerPreset === "profileCard" ||
            value.headerPreset === "compact"
                ? value.headerPreset
                : "split",
        personalDetailPreset:
            value.personalDetailPreset === "concise" ? "concise" : "detailed",
        visibility,
    };
}

export function normalizeResumeBasicsPresentationConfig(
    value: unknown
): ResumeBasicsPresentationConfig {
    if (!isRecord(value)) {
        return {
            shared: clonePresentation(DEFAULT_RESUME_BASICS_PRESENTATION),
            jobFields: {},
        };
    }

    const rawJobFields = isRecord(value.jobFields) ? value.jobFields : {};
    return {
        shared: normalizeResumeBasicsPresentation(value.shared),
        jobFields: Object.fromEntries(
            Object.entries(rawJobFields).map(([jobField, presentation]) => [
                jobField,
                normalizeResumeBasicsPresentation(presentation),
            ])
        ),
    };
}

export function resolveResumeBasicsPresentation(
    config: ResumeBasicsPresentationConfig,
    jobField?: string
): ResumeBasicsPresentation {
    const override = jobField ? config.jobFields?.[jobField] : undefined;
    return clonePresentation(override ?? config.shared);
}

export function createResumeBasicsPresentationOverride(
    config: ResumeBasicsPresentationConfig,
    jobField: string
): ResumeBasicsPresentationConfig {
    return {
        ...config,
        shared: clonePresentation(config.shared),
        jobFields: {
            ...config.jobFields,
            [jobField]: clonePresentation(config.shared),
        },
    };
}

export function removeResumeBasicsPresentationOverride(
    config: ResumeBasicsPresentationConfig,
    jobField: string
): ResumeBasicsPresentationConfig {
    const jobFields = { ...config.jobFields };
    delete jobFields[jobField];
    return {
        ...config,
        shared: clonePresentation(config.shared),
        jobFields,
    };
}

export function formatResumeBirthDate(
    value: string | undefined,
    preset: ResumeBasicsPresentation["personalDetailPreset"]
): string {
    if (!value) return "";
    const [year = "", month = "", day = ""] = value.split("-");
    if (!year) return "";
    if (preset === "concise") return `${year}년생`;
    if (!month || !day) return value;
    return `${year}.${month}.${day}`;
}

export function formatResumeMilitary(
    military: ResumeMilitary | undefined,
    preset: ResumeBasicsPresentation["personalDetailPreset"]
): string {
    if (!military?.status) return "";
    if (preset === "concise") return military.status;
    const period = [military.startDate, military.endDate]
        .filter(Boolean)
        .map((value) => value?.replace("-", "."))
        .join("–");
    return period ? `${military.status} · ${period}` : military.status;
}
