import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApplicationProfileHome from "@/components/ApplicationProfileHome";
import HomePageContent from "@/app/(frontend)/home-content";
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
    if (target.kind === "job-field") return getSeoMetadata(target.jobField.id);
    const profile = target.profile;
    if (!profile.public_snapshot) return {};
    return {
        title: profile.public_snapshot.resume.basics?.label || "Portfolio",
        robots: { index: false, follow: false },
    };
}

export default async function JobFieldHomePage({ params }: PageProps) {
    setRequestLocale((await params).locale);

    const target = await resolvePublicRouteTarget((await params).jobField);
    if (!target) notFound();
    if (target.kind === "job-field") {
        return <HomePageContent jobField={target.jobField.id} />;
    }
    const profile = target.profile;
    if (!profile.public_snapshot) notFound();
    return (
        <ApplicationProfileHome
            token={profile.public_token}
            snapshot={profile.public_snapshot}
        />
    );
}
