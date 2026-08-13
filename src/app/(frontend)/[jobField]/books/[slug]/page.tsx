import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookDetailContent from "../../../books/[slug]/book-detail-content";
import { resolvePublicJobField } from "@/lib/public-job-field";
import { getSeoMetadata } from "@/lib/seo-metadata";
import { getPublicBookRouteParams } from "@/lib/public-route-params";

type PageProps = {
    params: Promise<{ jobField: string; slug: string }>;
};

export async function generateStaticParams() {
    return getPublicBookRouteParams();
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const jobField = await resolvePublicJobField((await params).jobField);
    return getSeoMetadata(jobField?.id);
}

export default async function JobFieldBookDetailPage({ params }: PageProps) {
    const { jobField: rawJobField, slug } = await params;
    const jobField = await resolvePublicJobField(rawJobField);
    if (!jobField) notFound();
    return <BookDetailContent slug={slug} jobField={jobField.id} />;
}
