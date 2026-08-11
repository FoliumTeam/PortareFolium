import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumePageContent } from "../../resume/page";
import { sanitizePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export const metadata: Metadata = {
    title: "Resume",
    description: "직무별 이력서",
};

export default async function JobFieldResumePage({ params }: PageProps) {
    const jobField = sanitizePublicJobField((await params).jobField);
    if (jobField !== "web" && jobField !== "game") notFound();
    return <ResumePageContent jobFieldOverride={jobField} />;
}
