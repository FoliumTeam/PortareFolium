import { notFound } from "next/navigation";
import BookDetailContent from "../../../books/[slug]/book-detail-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string; slug: string }>;
};

export default async function JobFieldBookDetailPage({ params }: PageProps) {
    const { jobField: rawJobField, slug } = await params;
    const jobField = await resolvePublicJobField(rawJobField);
    if (!jobField) notFound();
    return <BookDetailContent slug={slug} jobField={jobField.id} />;
}
