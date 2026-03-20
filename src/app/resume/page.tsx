import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import type { Resume } from "@/types/resume";
import ResumeClassic from "@/components/resume/ResumeClassic";
import ResumeModern from "@/components/resume/ResumeModern";
import ResumeMinimal from "@/components/resume/ResumeMinimal";
import { filterByJobField } from "@/lib/job-field";

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

export default async function ResumePage() {
    let jobField = process.env.NEXT_PUBLIC_JOB_FIELD ?? "game";
    let resumeLayout: "classic" | "modern" | "minimal" = "modern";
    let resumeDataRaw: Resume = {} as Resume;

    if (serverClient) {
        const [cfgRes, layoutRes, resumeRes] = await Promise.all([
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
            resumeLayout = layoutRes.data.value as
                | "classic"
                | "modern"
                | "minimal";
        }

        if (resumeRes.data?.data) {
            resumeDataRaw = resumeRes.data.data as unknown as Resume;
        }
    }

    const resumeData: Resume = {
        ...resumeDataRaw,
        work: sortByDateDesc(
            filterByJobField(resumeDataRaw.work, jobField) ?? []
        ) as Resume["work"],
        projects: sortByDateDesc(
            filterByJobField(resumeDataRaw.projects, jobField) ?? []
        ) as Resume["projects"],
    };

    return (
        <>
            {resumeLayout === "classic" && (
                <ResumeClassic resume={resumeData} />
            )}
            {resumeLayout === "modern" && <ResumeModern resume={resumeData} />}
            {resumeLayout === "minimal" && (
                <ResumeMinimal resume={resumeData} />
            )}
        </>
    );
}
