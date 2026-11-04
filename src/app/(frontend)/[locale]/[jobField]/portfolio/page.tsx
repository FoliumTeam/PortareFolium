import { setRequestLocale } from "@/lib/content-locale";
import { serverT } from "@/lib/server-i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioPageContent from "@/app/(frontend)/portfolio/portfolio-content";
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
    if (!target) return {};
    if (target.kind === "job-field") {
        return getSeoMetadata(target.jobField.id, {
            title: serverT("Portfolio"),
        });
    }
    if (!target.profile.public_snapshot) return {};
    return {
        title: serverT("Portfolio"),
        robots: { index: false, follow: false },
    };
}

export default async function JobFieldPortfolioPage({ params }: PageProps) {
    setRequestLocale((await params).locale);

    const target = await resolvePublicRouteTarget((await params).jobField);
    if (!target) notFound();
    if (target.kind === "job-field") {
        return <PortfolioPageContent jobField={target.jobField.id} />;
    }
    const profile = target.profile;
    if (!profile.public_snapshot) notFound();
    return (
        <PortfolioPageContent
            jobField={profile.public_snapshot.jobField}
            projectsOverride={profile.public_snapshot.portfolio}
            portfolioBasePath={`/${profile.public_token}/portfolio`}
        />
    );
}
