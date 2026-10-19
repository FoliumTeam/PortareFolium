import { setRequestLocale } from "@/lib/content-locale";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PortfolioDetailContent from "@/app/(frontend)/portfolio/[slug]/portfolio-detail-content";
import { resolvePublicRouteTarget } from "@/lib/public-route";
import { getPortfolioItemMetadata } from "@/lib/content-metadata";
import { getLocalizedDetailRouteParams } from "@/lib/public-route-params";

type PageProps = {
    params: Promise<{ locale: string; jobField: string; slug: string }>;
};

export async function generateStaticParams() {
    return getLocalizedDetailRouteParams("portfolio");
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    setRequestLocale((await params).locale);

    const { jobField, slug } = await params;
    const target = await resolvePublicRouteTarget(jobField);
    if (target?.kind === "job-field") return getPortfolioItemMetadata(slug);
    const item = target?.profile.public_snapshot?.portfolio.find(
        (entry) => entry.slug === slug
    );
    return item
        ? {
              title: item.meta_title || item.title,
              robots: { index: false, follow: false },
          }
        : {};
}

export default async function JobFieldPortfolioDetailPage({
    params,
}: PageProps) {
    setRequestLocale((await params).locale);

    const { jobField: routeKey, slug } = await params;
    const target = await resolvePublicRouteTarget(routeKey);
    if (!target) notFound();
    if (target.kind === "job-field") {
        return (
            <PortfolioDetailContent slug={slug} jobField={target.jobField.id} />
        );
    }
    const profile = target.profile;
    const item = profile.public_snapshot?.portfolio.find(
        (entry) => entry.slug === slug
    );
    if (!profile.public_snapshot || !item)
        redirect(`/${profile.public_token}/portfolio`);
    return (
        <PortfolioDetailContent
            slug={slug}
            portfolioBasePath={`/${profile.public_token}/portfolio`}
            itemOverride={item}
        />
    );
}
