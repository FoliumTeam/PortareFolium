import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import type { Resume } from "@/types/resume";
import ResumeClassic from "@/components/resume/ResumeClassic";
import ResumeModern from "@/components/resume/ResumeModern";
import PdfExportButton from "@/components/PdfExportButton";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import type { AboutData } from "@/types/about";
import {
    DEFAULT_RESUME_LAYOUT,
    normalizeLayout,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";

export const metadata: Metadata = {
    title: "Resume",
    description: "이력서",
};

function sortByDateDesc<T extends { startDate?: string }>(items: T[]): T[] {
    return [...items].sort((a, b) =>
        (b.startDate ?? "").localeCompare(a.startDate ?? "")
    );
}

// 레거시 theme 값 정규화
function coerceTheme(raw: unknown): "classic" | "modern" {
    if (raw === "classic") return "classic";
    return "modern";
}

type ResumePageContentProps = {
    jobField: string;
};

export default async function ResumePageContent({
    jobField,
}: ResumePageContentProps) {
    let resumeLayout: "classic" | "modern" = "modern";
    let resumeDataRaw: Resume = {} as Resume;
    let aboutData: AboutData = {};
    let sectionLayout: ResumeSectionLayout = DEFAULT_RESUME_LAYOUT;

    if (serverClient) {
        const [layoutRes, sectionLayoutRes, resumeRes, aboutRes] =
            await Promise.all([
                serverClient
                    .from("site_config")
                    .select("value")
                    .eq("key", "resume_layout")
                    .single(),
                serverClient
                    .from("site_config")
                    .select("value")
                    .eq("key", "resume_section_layout")
                    .single(),
                serverClient
                    .from("resume_data")
                    .select("data")
                    .eq("lang", "ko")
                    .single(),
                serverClient
                    .from("about_data")
                    .select("data")
                    .limit(1)
                    .single(),
            ]);

        if (layoutRes.data?.value) {
            resumeLayout = coerceTheme(layoutRes.data.value);
        }

        if (sectionLayoutRes.data?.value) {
            sectionLayout = normalizeLayout(
                sectionLayoutRes.data.value as ResumeSectionLayout
            );
        }

        if (resumeRes.data?.data) {
            resumeDataRaw = resumeRes.data.data as unknown as Resume;
        }
        if (aboutRes.data?.data) {
            aboutData = aboutRes.data.data as AboutData;
        }
    }

    const rawCC = resumeDataRaw.coreCompetencies;
    const normalizedResumeData: Resume = {
        ...resumeDataRaw,
        coreCompetencies: Array.isArray(rawCC) ? { entries: rawCC } : rawCC,
    };
    const filteredResumeData = createJobFieldResumeView(
        normalizedResumeData,
        jobField,
        aboutData.introductions?.[jobField]
    );
    const coreCompetencies = filteredResumeData.coreCompetencies?.entries ?? [];
    const portfolioBasePath = `/${jobField}/portfolio`;

    const resumeData: Resume = {
        ...filteredResumeData,
        work: filteredResumeData.work
            ? {
                  ...filteredResumeData.work,
                  entries: sortByDateDesc(filteredResumeData.work.entries),
              }
            : undefined,
        projects: filteredResumeData.projects
            ? {
                  ...filteredResumeData.projects,
                  entries: sortByDateDesc(filteredResumeData.projects.entries),
              }
            : undefined,
    };

    return (
        <PdfExportButton fileName="resume">
            {resumeLayout === "classic" && (
                <ResumeClassic
                    resume={resumeData}
                    coreCompetencies={coreCompetencies}
                    sectionLayout={sectionLayout}
                    portfolioBasePath={portfolioBasePath}
                    activeJobField={jobField}
                />
            )}
            {resumeLayout === "modern" && (
                <ResumeModern
                    resume={resumeData}
                    coreCompetencies={coreCompetencies}
                    sectionLayout={sectionLayout}
                    activeJobField={jobField}
                    portfolioBasePath={portfolioBasePath}
                />
            )}
        </PdfExportButton>
    );
}
