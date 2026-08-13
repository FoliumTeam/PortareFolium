export type JobFieldSeoConfig = {
    title: string;
    description: string;
    ogImage: string;
};

export type SeoConfig = {
    defaultDescription: string;
    defaultOgImage: string;
    jobFields: Record<string, JobFieldSeoConfig>;
};

export type SiteConfigRow = {
    key: string;
    value: unknown;
};

const EMPTY_JOB_FIELD_SEO: JobFieldSeoConfig = {
    title: "",
    description: "",
    ogImage: "",
};

function parseSiteConfigValue(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function toString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

// site_config.seo_config 원시 값 정규화
export function normalizeSeoConfig(value: unknown): SeoConfig {
    const parsed = parseSiteConfigValue(value);
    const config =
        parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : {};
    const rawJobFields = config.job_fields;
    const jobFields: Record<string, JobFieldSeoConfig> = {};

    if (rawJobFields && typeof rawJobFields === "object") {
        for (const [id, rawValue] of Object.entries(rawJobFields)) {
            if (!rawValue || typeof rawValue !== "object") continue;
            const field = rawValue as Record<string, unknown>;
            jobFields[id] = {
                title: toString(field.title),
                description: toString(field.description),
                ogImage: toString(field.og_image),
            };
        }
    }

    return {
        defaultDescription: toString(config.default_description),
        defaultOgImage: toString(config.default_og_image),
        jobFields,
    };
}

// 공개 경로에 적용할 SEO 값 해석
export function resolveSeoConfig(
    rows: readonly SiteConfigRow[],
    jobField?: string
): JobFieldSeoConfig {
    const title = toString(
        parseSiteConfigValue(rows.find((row) => row.key === "site_name")?.value)
    );
    const seoConfig = normalizeSeoConfig(
        rows.find((row) => row.key === "seo_config")?.value
    );
    const jobFieldConfig = jobField ? seoConfig.jobFields[jobField] : undefined;

    return {
        title: jobFieldConfig?.title || title,
        description:
            jobFieldConfig?.description || seoConfig.defaultDescription,
        ogImage: jobFieldConfig?.ogImage || seoConfig.defaultOgImage,
    };
}

export function getJobFieldSeoConfig(
    seoConfig: SeoConfig,
    jobField: string,
    defaults: Pick<JobFieldSeoConfig, "title" | "description" | "ogImage">
): JobFieldSeoConfig {
    const field = seoConfig.jobFields[jobField];
    return {
        title: field?.title || defaults.title || EMPTY_JOB_FIELD_SEO.title,
        description:
            field?.description ||
            defaults.description ||
            EMPTY_JOB_FIELD_SEO.description,
        ogImage:
            field?.ogImage || defaults.ogImage || EMPTY_JOB_FIELD_SEO.ogImage,
    };
}
