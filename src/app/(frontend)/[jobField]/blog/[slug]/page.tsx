import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostContent } from "../../../blog/[slug]/page";
import { sanitizePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string; slug: string }>;
};

export const metadata: Metadata = {
    title: "Blog",
    description: "직무별 기술 블로그 포스트",
};

export default async function JobFieldBlogPostPage({ params }: PageProps) {
    const { jobField: rawJobField, slug } = await params;
    const jobField = sanitizePublicJobField(rawJobField);
    if (jobField !== "web" && jobField !== "game") notFound();
    return (
        <BlogPostContent
            slug={slug}
            jobField={jobField}
            blogBasePath={`/${jobField}/blog`}
        />
    );
}
