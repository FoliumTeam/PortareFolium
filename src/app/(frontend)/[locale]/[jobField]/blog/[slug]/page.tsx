import { setRequestLocale, withContentLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BlogPostContent from "@/app/(frontend)/blog/[slug]/blog-post-content";
import { resolvePublicRouteTarget } from "@/lib/public-route";
import { getBlogPostMetadata } from "@/lib/content-metadata";
import { getPublicPostRouteParams } from "@/lib/public-route-params";

type PageProps = {
    params: Promise<{ locale: string; jobField: string; slug: string }>;
};

export async function generateStaticParams({
    params,
}: {
    params: { locale: string };
}) {
    return withContentLocale(normalizeLocale(params.locale), async () => {
        return getPublicPostRouteParams();
    });
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    setRequestLocale((await params).locale);

    const { jobField, slug } = await params;
    const target = await resolvePublicRouteTarget(jobField);
    if (target?.kind === "job-field") return getBlogPostMetadata(slug);
    const post = target?.profile.public_snapshot?.posts.find(
        (entry) => entry.slug === slug
    );
    return post
        ? {
              title: post.meta_title || post.title,
              robots: { index: false, follow: false },
          }
        : {};
}

export default async function JobFieldBlogPostPage({ params }: PageProps) {
    setRequestLocale((await params).locale);

    const { jobField: routeKey, slug } = await params;
    const target = await resolvePublicRouteTarget(routeKey);
    if (!target) notFound();
    if (target.kind === "job-field") {
        return <BlogPostContent slug={slug} jobField={target.jobField.id} />;
    }
    const profile = target.profile;
    const post = profile.public_snapshot?.posts.find(
        (entry) => entry.slug === slug
    );
    if (!profile.public_snapshot || !post)
        redirect(`/${profile.public_token}/blog`);
    return (
        <BlogPostContent
            slug={slug}
            blogBasePath={`/${profile.public_token}/blog`}
            postOverride={post}
        />
    );
}
