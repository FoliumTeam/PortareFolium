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
import {
    normalizeResumeBasicsPresentationConfig,
    resolveResumeBasicsPresentation,
    RESUME_BASICS_PRESENTATION_CONFIG_KEY,
} from "@/lib/resume-basics-presentation";

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
    let resumeBasicsPresentationConfig =
        normalizeResumeBasicsPresentationConfig(undefined);

    if (serverClient) {
        const [
            layoutRes,
            sectionLayoutRes,
            basicsPresentationRes,
            resumeRes,
            aboutRes,
        ] = await Promise.all([
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
                .from("site_config")
                .select("value")
                .eq("key", RESUME_BASICS_PRESENTATION_CONFIG_KEY)
                .single(),
            serverClient
                .from("resume_data")
                .select("data")
                .eq("lang", "ko")
                .single(),
            serverClient.from("about_data").select("data").limit(1).single(),
        ]);

        if (layoutRes.data?.value) {
            resumeLayout = coerceTheme(layoutRes.data.value);
        }

        if (sectionLayoutRes.data?.value) {
            sectionLayout = normalizeLayout(
                sectionLayoutRes.data.value as ResumeSectionLayout
            );
        }
        resumeBasicsPresentationConfig =
            normalizeResumeBasicsPresentationConfig(
                basicsPresentationRes.data?.value
            );

        if (resumeRes.data?.data) {
            resumeDataRaw = resumeRes.data.data as unknown as Resume;
        }
        if (aboutRes.data?.data) {
            aboutData = aboutRes.data.data as AboutData;
        }
    }

    const rawCC = resumeDataRaw.coreCompetencies;
    const fallbackIntroduction =
        aboutData.description || aboutData.descriptionSub
            ? {
                  description: aboutData.description ?? "",
                  descriptionSub: aboutData.descriptionSub ?? "",
              }
            : undefined;
    const normalizedResumeData: Resume = {
        ...resumeDataRaw,
        coreCompetencies: Array.isArray(rawCC) ? { entries: rawCC } : rawCC,
    };
    const filteredResumeData = createJobFieldResumeView(
        normalizedResumeData,
        jobField,
        aboutData.introductions?.[jobField],
        fallbackIntroduction
    );
    const coreCompetencies = filteredResumeData.coreCompetencies?.entries ?? [];
    const portfolioBasePath = `/${jobField}/portfolio`;
    const basicsPresentation = resolveResumeBasicsPresentation(
        resumeBasicsPresentationConfig,
        jobField
    );

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
                    basicsPresentation={basicsPresentation}
                />
            )}
            {resumeLayout === "modern" && (
                <ResumeModern
                    resume={resumeData}
                    coreCompetencies={coreCompetencies}
                    sectionLayout={sectionLayout}
                    activeJobField={jobField}
                    portfolioBasePath={portfolioBasePath}
                    basicsPresentation={basicsPresentation}
                />
            )}
        </PdfExportButton>
    );
}
