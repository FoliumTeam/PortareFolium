import { notFound } from "next/navigation";
import HomePageContent from "../home-content";
import { resolvePublicJobField } from "@/lib/public-job-field";

type PageProps = {
    params: Promise<{ jobField: string }>;
};

export default async function JobFieldHomePage({ params }: PageProps) {
    const jobField = await resolvePublicJobField((await params).jobField);
    if (!jobField) notFound();
    return <HomePageContent jobField={jobField.id} />;
}
