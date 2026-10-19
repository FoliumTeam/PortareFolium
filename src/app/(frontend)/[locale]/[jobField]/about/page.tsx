import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutPageContent from "@/app/(frontend)/about/about-content";
import { resolvePublicRouteTarget } from "@/lib/public-route";
import { getSeoMetadata } from "@/lib/seo-metadata";

type PageProps = {
    params: Promise<{ locale: string; jobField: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    setRequestLocale((await params).locale);

    const target = await resolvePublicRouteTarget((await params).jobField);
    return target?.kind === "job-field"
        ? getSeoMetadata(target.jobField.id)
        : {};
}

export default async function JobFieldAboutPage({ params }: PageProps) {
    setRequestLocale((await params).locale);

    const target = await resolvePublicRouteTarget((await params).jobField);
    if (target?.kind !== "job-field") notFound();
    return <AboutPageContent jobField={target.jobField} />;
}
