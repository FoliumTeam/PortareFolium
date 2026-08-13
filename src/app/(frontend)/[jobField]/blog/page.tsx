import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogListContent from "../../blog/blog-list-content";
import { resolvePublicJobField } from "@/lib/public-job-field";
import { getSeoMetadata } from "@/lib/seo-metadata";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const jobField = await resolvePublicJobField((await params).jobField);
    return getSeoMetadata(jobField?.id);
}

export default async function JobFieldBlogPage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <BlogListContent jobFieldOverride={jobField.id} />;
}
