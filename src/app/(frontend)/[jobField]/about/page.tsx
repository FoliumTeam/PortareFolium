import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutPageContent from "../../about/about-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export const metadata: Metadata = {
    title: "About me",
    description: "직무별 개발자 소개",
};

export default async function JobFieldAboutPage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <AboutPageContent jobField={jobField.id} />;
}
