import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioPageContent from "../../portfolio/portfolio-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export const metadata: Metadata = {
    title: "Portfolio",
    description: "직무별 포트폴리오",
};

export default async function JobFieldPortfolioPage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <PortfolioPageContent jobField={jobField.id} />;
}
