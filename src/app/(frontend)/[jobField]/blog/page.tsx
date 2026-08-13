import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogListContent from "../../blog/blog-list-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export const metadata: Metadata = {
    title: "Blog",
    description: "직무별 기술 블로그",
};

export default async function JobFieldBlogPage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <BlogListContent jobFieldOverride={jobField.id} />;
}
