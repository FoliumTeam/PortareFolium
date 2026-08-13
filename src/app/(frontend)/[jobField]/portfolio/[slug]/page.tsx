import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioDetailContent from "../../../portfolio/[slug]/portfolio-detail-content";
import { resolvePublicJobField } from "@/lib/public-job-field";
import { getSeoMetadata } from "@/lib/seo-metadata";
import { getPublicPortfolioRouteParams } from "@/lib/public-route-params";

type PageProps = {
    params: Promise<{ jobField: string; slug: string }>;
};

export async function generateStaticParams() {
    return getPublicPortfolioRouteParams();
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const jobField = await resolvePublicJobField((await params).jobField);
    return getSeoMetadata(jobField?.id);
}

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
