import type { Metadata } from "next";
import { isAdminSession } from "@/lib/admin-auth";
import { getEffectiveAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import type { Resume } from "@/types/resume";
import ResumeClassic from "@/components/resume/ResumeClassic";
import ResumeModern from "@/components/resume/ResumeModern";
import PdfExportButton from "@/components/PdfExportButton";
import { filterByJobField } from "@/lib/job-field";
import {
    DEFAULT_RESUME_LAYOUT,
    normalizeLayout,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";

export const revalidate = false;
export const dynamic = "force-dynamic";

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

export default async function ResumePage() {
    const session = await getEffectiveAdminSession();
    const initialAuthed = isAdminSession(session);
    let jobField = process.env.NEXT_PUBLIC_JOB_FIELD ?? "game";
    let resumeLayout: "classic" | "modern" = "modern";
    let resumeDataRaw: Resume = {} as Resume;
    let sectionLayout: ResumeSectionLayout = DEFAULT_RESUME_LAYOUT;

    if (serverClient) {
        const [cfgRes, layoutRes, sectionLayoutRes, resumeRes] =
            await Promise.all([
                serverClient
                    .from("site_config")
                    .select("value")
                    .eq("key", "job_field")
                    .single(),
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
            ]);

        if (cfgRes.data?.value) {
            const raw = cfgRes.data.value;
            const parsed =
                typeof raw === "string" && raw.startsWith('"')
                    ? JSON.parse(raw)
                    : raw;
            if (parsed) jobField = parsed;
        }

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
    }

    // 하위 호환: 기존 배열 → 객체 wrapper 정규화
    const rawCC = resumeDataRaw.coreCompetencies;
    const coreCompetencies = Array.isArray(rawCC)
        ? rawCC
        : (rawCC?.entries ?? []);

    const resumeData: Resume = {
        ...resumeDataRaw,
        work: resumeDataRaw.work
            ? {
                  ...resumeDataRaw.work,
                  entries: sortByDateDesc(
                      filterByJobField(resumeDataRaw.work.entries, jobField) ??
                          []
                  ),
              }
            : undefined,
        projects: resumeDataRaw.projects
            ? {
                  ...resumeDataRaw.projects,
                  entries: sortByDateDesc(
                      filterByJobField(
                          resumeDataRaw.projects.entries,
                          jobField
                      ) ?? []
                  ),
              }
            : undefined,
    };

    return (
        <PdfExportButton fileName="resume" initialAuthed={initialAuthed}>
            {resumeLayout === "classic" && (
                <ResumeClassic
                    resume={resumeData}
                    coreCompetencies={coreCompetencies}
                    sectionLayout={sectionLayout}
                />
            )}
            {resumeLayout === "modern" && (
                <ResumeModern
                    resume={resumeData}
                    coreCompetencies={coreCompetencies}
                    sectionLayout={sectionLayout}
                    activeJobField={jobField}
                />
            )}
        </PdfExportButton>
    );
}
