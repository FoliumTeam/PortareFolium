import type { AboutData } from "@/types/about";
import type { ApplicationProfileOverrides } from "@/types/application-profile";
import type { PortfolioRawRow } from "@/types/portfolio";
import type { Resume, ResumeBasicsVisibilityKey } from "@/types/resume";

export type PdfLang = "ko" | "ja";
export type PdfVariant = "C" | "F";

// 항목 세부 숨김 키 — 사이트에는 없는 PDF 전용 설정
export const PDF_DETAIL_KEYS = [
    "educationGpa",
    "educationCourses",
    "educationArea",
    "skillLevel",
    "workHighlights",
    "projectTech",
    "projectLinks",
    "projectTeam",
    // PDF-F 職務経歴書의 自己PR(핵심 역량) 블록
    "shokumuSelfPr",
] as const;
export type PdfDetailKey = (typeof PDF_DETAIL_KEYS)[number];

// 프리셋 저장 형태: 사이트 기본값에서 바꾼 값만 저장. 모르는 키는 보존
export type ResumePdfOptions = {
    version: 1;
    sections: Record<string, boolean>;
    sectionOrder?: string[];
    basics: Partial<Record<ResumeBasicsVisibilityKey, boolean>>;
    projects: {
        // 포함할 slug 순서. 없으면 사이트 기본 집합
        order?: string[];
        hiddenSubsections: Record<string, string[]>;
        compactPersonal: boolean;
    };
    details: Partial<Record<PdfDetailKey, boolean>> & {
        // 핵심 역량 제외: 항목 pdfId, 없으면 제목
        excludedCore?: string[];
    };
    [key: string]: unknown;
};

// 생성 입력 묶음 — DB 행 또는 지원 프로필 사본에서 만든 값
export type ResumePdfSource = {
    kind: "job_field" | "application_profile";
    lang: PdfLang;
    jobField: string;
    resume: Resume;
    about: AboutData;
    // lang 행 (공개분만)
    portfolio: PortfolioRawRow[];
    // ko 원본 행: 번역 행에 구조 값(기간·종류·링크 등) 보충
    portfolioBase: PortfolioRawRow[];
    jobFields: { id: string; headerTitle?: string }[];
    sectionLayout: unknown;
    basicsPresentation: unknown;
    profileOverrides?: ApplicationProfileOverrides;
};

export type PdfWarningCode =
    | "missing-introduction"
    | "unsupported-section"
    | "unknown-project-type"
    | "unknown-country"
    | "phone-trunk-prefix"
    | "missing-project";

export type PdfWarning = { code: PdfWarningCode; detail?: string };

export type PdfEffectiveOptions = {
    sectionOrder: string[];
    sections: Set<string>;
    basics: Record<ResumeBasicsVisibilityKey, boolean>;
    details: Record<PdfDetailKey, boolean>;
    excludedCore: Set<string>;
    projects: ResumePdfOptions["projects"];
};

export type PdfProject = {
    slug: string;
    name: string;
    start: string;
    end?: string;
    // 종류를 모르면 unknown → "프로젝트" 묶음 + 경고 (D12)
    type: "work" | "personal" | "unknown";
    description: string;
    sections: { title: string; content: string }[];
    tech: string;
    role: string;
    team?: string | number;
    thumb?: string;
    links: string[];
    company?: string;
    ai: boolean;
    planned: boolean;
};

export type PdfRole = {
    position: string;
    employmentType: string;
    start: string;
    end?: string;
    summary: string;
    highlights: string[];
    // 직전 역할과 고용형태가 다름 (登用/전환)
    converted: boolean;
};

export type PdfWorkGroup = {
    name: string;
    location: string;
    start: string;
    end?: string;
    months: number;
    // 최신 역할 먼저
    roles: PdfRole[];
};

export type PdfEducationStatus = "graduated" | "enrolled" | "expected";

export type ResumePdfModel = {
    lang: PdfLang;
    asOf: string;
    sections: string[];
    // PDF-F 職務経歴書 自己PR 블록 표시
    shokumuSelfPr: boolean;
    basics: {
        name: string;
        headline: string;
        image?: string;
        email?: string;
        phone?: string;
        url?: string;
        address?: string;
        birthDate?: string;
        age?: number;
        military?: { status: string; start?: string; end?: string };
        profiles: { network: string; url: string }[];
    };
    intro: { description: string; descriptionSub: string };
    aiRemarks: { slug: string; name: string; text: string }[];
    core: { title: string; description: string; ai?: true }[];
    work: PdfWorkGroup[];
    totalMonths: number;
    projects: {
        work: PdfProject[];
        ai: PdfProject[];
        personal: PdfProject[];
        other: PdfProject[];
    };
    skills: { name: string; items: { name: string; level?: string }[] }[];
    education: {
        institution: string;
        area?: string;
        studyType?: string;
        location?: string;
        start: string;
        end?: string;
        status: PdfEducationStatus;
        gpa?: string;
        courses: string[];
    }[];
    training: {
        title: string;
        organizer: string;
        start: string;
        end: string;
    }[];
    certificates: { name: string; issuer?: string; date?: string }[];
    awards: { title: string; awarder?: string; date?: string }[];
    languages: { language: string; fluency: string }[];
    warnings: PdfWarning[];
};
