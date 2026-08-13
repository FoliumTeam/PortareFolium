import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioDetailContent from "../../../portfolio/[slug]/portfolio-detail-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string; slug: string }>;
};

export const metadata: Metadata = {
    title: "Portfolio",
    description: "직무별 포트폴리오 사례 연구",
};

export default async function JobFieldPortfolioDetailPage({
    params,
}: PageProps) {
    const { jobField: rawJobField, slug } = await params;
    const jobField = await resolvePublicJobField(rawJobField);
    if (!jobField) notFound();
    return (
        <PortfolioDetailContent
            slug={slug}
            jobField={jobField.id}
            portfolioBasePath={`/${jobField.id}/portfolio`}
        />
    );
}
