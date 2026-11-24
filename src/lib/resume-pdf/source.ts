import type { AboutData } from "@/types/about";
import type {
    ApplicationProfileOverrides,
    ApplicationProfileSnapshot,
} from "@/types/application-profile";
import type { PortfolioRawRow } from "@/types/portfolio";
import type { Resume } from "@/types/resume";
import type { PdfLang, ResumePdfSource } from "@/types/resume-pdf";

export type ConfigRow = { key: string; value: unknown };

const parseJson = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
};

const configValue = (rows: ConfigRow[], key: string): unknown =>
    parseJson(rows.find((row) => row.key === key)?.value);

const readJobFields = (rows: ConfigRow[]): ResumePdfSource["jobFields"] => {
    const value = configValue(rows, "job_fields");
    if (!Array.isArray(value)) return [];
    return value
        .filter(
            (f): f is { id: string; headerTitle?: unknown } =>
                Boolean(f) && typeof (f as { id?: unknown }).id === "string"
        )
        .map((f) => ({
            id: f.id,
            ...(typeof f.headerTitle === "string"
                ? { headerTitle: f.headerTitle }
                : {}),
        }));
};

// 미공개 행 제외 (N6). 빠진 행은 빈 값으로 허용 (N1)
const publishedOnly = (rows: PortfolioRawRow[] | null | undefined) =>
    (rows ?? []).filter((row) => row.published === true);

// 직무 경로: 공개 행 + 언어별 행 + site_config (언어 병합된 행 목록)
export const buildJobFieldSource = (input: {
    lang: PdfLang;
    jobField: string;
    resume: Resume | null | undefined;
    about: AboutData | null | undefined;
    portfolio: PortfolioRawRow[] | null | undefined;
    portfolioBase?: PortfolioRawRow[] | null;
    config: ConfigRow[];
}): ResumePdfSource => ({
    kind: "job_field",
    lang: input.lang,
    jobField: input.jobField,
    resume: input.resume ?? {},
    about: input.about ?? {},
    portfolio: publishedOnly(input.portfolio),
    portfolioBase: publishedOnly(input.portfolioBase ?? input.portfolio),
    jobFields: readJobFields(input.config),
    sectionLayout: configValue(input.config, "resume_section_layout"),
    basicsPresentation: configValue(input.config, "resume_basics_presentation"),
});

// 지원 프로필: 얼려 둔 사본이 내용. 표시 기본값은 직무 경로의 현재 사이트 설정
export const buildProfileSource = (input: {
    lang: PdfLang;
    snapshot: ApplicationProfileSnapshot;
    baseSnapshot?: ApplicationProfileSnapshot | null;
    overrides: ApplicationProfileOverrides;
    config: ConfigRow[];
}): ResumePdfSource => ({
    ...buildJobFieldSource({
        lang: input.lang,
        jobField: input.snapshot.jobField,
        resume: input.snapshot.resume,
        about: input.snapshot.about,
        portfolio: input.snapshot.portfolio,
        portfolioBase: input.baseSnapshot?.portfolio,
        config: input.config,
    }),
    kind: "application_profile",
    profileOverrides: input.overrides,
});
