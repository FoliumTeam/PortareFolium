import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResumePageContent from "../../resume/resume-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export const metadata: Metadata = {
    title: "Resume",
    description: "직무별 이력서",
};

export default async function JobFieldResumePage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <ResumePageContent jobField={jobField.id} />;
}
