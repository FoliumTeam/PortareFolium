import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase";
import { formatPubDateKST } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { extractTocFromHtml } from "@/lib/toc";
import TableOfContents from "@/components/TableOfContents";
import GithubToc from "@/components/GithubToc";
import MermaidRenderer from "@/components/MermaidRenderer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    if (!serverClient) return {};
    const { data: post } = await serverClient
        .from("posts")
        .select(
            "title, meta_title, meta_description, og_image, description, category"
        )
        .eq("slug", slug)
        .single();
    if (!post) return {};
    const category = post.category?.trim() ?? "";
    const title =
        post.meta_title ||
        (category ? `${category} | ${post.title}` : post.title);
    return {
        title,
        description: post.meta_description || post.description || undefined,
        openGraph: post.og_image ? { images: [post.og_image] } : undefined,
    };
}

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    if (!serverClient) redirect("/blog");

    const { data: post } = await serverClient
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!post) redirect("/blog");

    let slugToTagName = new Map<string, string>();
    let slugToTagColor = new Map<string, string>();
    const { data: tagsData } = await serverClient
        .from("tags")
        .select("slug, name, color");
    if (tagsData) {
        slugToTagName = new Map(tagsData.map((t) => [t.slug, t.name]));
        slugToTagColor = new Map(
            tagsData
                .filter((t) => t.color?.trim())
                .map((t) => [t.slug, t.color!.trim()])
        );
    }

    const contentHtml = await renderMarkdown(post.content ?? "");
    const tocEntries = extractTocFromHtml(contentHtml);

    type TocStyle = "hover" | "github" | "both";
    let tocStyle: TocStyle = "hover";
    const { data: tocRow } = await serverClient
        .from("site_config")
        .select("value")
        .eq("key", "post_toc_styles")
        .single();
    if (tocRow?.value && typeof tocRow.value === "object") {
        const styles = tocRow.value as Record<string, TocStyle>;
        if (slug in styles) tocStyle = styles[slug];
    }

    const category = post.category?.trim() ?? "";
    const tagSlugs: string[] = post.tags ?? [];
    const tagDisplay = tagSlugs.filter(Boolean).map((s) => ({
        slug: s,
        name: slugToTagName.get(s) ?? s,
        color: slugToTagColor.get(s),
    }));
    const pubDate = new Date(post.pub_date);

    return (
        <div className="mx-auto flex max-w-5xl gap-12">
            <article className="max-w-3xl min-w-0 flex-1">
                <Link
                    href="/blog"
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-muted) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Blog 목록
                </Link>

                {post.thumbnail && (
                    <div className="mb-10 aspect-video overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)">
                        <img
                            src={post.thumbnail}
                            alt=""
                            width={768}
                            height={432}
                            loading="eager"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}

                <header className="mb-10">
                    {category && (
                        <span className="mb-4 inline-flex items-center rounded-full bg-(--color-accent) px-3 py-1 text-xs font-semibold text-(--color-on-accent)">
                            {category}
                        </span>
                    )}
                    <h1 className="tablet:text-5xl mb-4 text-4xl leading-[1.1] font-black tracking-tight text-(--color-foreground)">
                        {post.title}
                    </h1>
                    {post.description && (
                        <p className="mb-6 text-xl leading-relaxed text-(--color-muted)">
                            {post.description}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                        <time
                            className="text-sm font-medium text-(--color-muted)"
                            dateTime={pubDate.toISOString()}
                        >
                            {formatPubDateKST(pubDate)}
                        </time>
                        {tagDisplay.length > 0 && (
                            <>
                                <span
                                    className="h-4 w-px bg-(--color-border)"
                                    aria-hidden="true"
                                />
                                <div
                                    className="flex flex-wrap gap-1.5"
                                    aria-label="태그"
                                >
                                    {tagDisplay.map((t) => (
                                        <Link
                                            key={t.slug}
                                            href={`/blog?tag=${encodeURIComponent(t.slug)}`}
                                            className="rounded-full bg-(--color-tag-bg) px-3 py-1 text-xs font-medium text-(--color-tag-fg) transition-opacity hover:opacity-80"
                                            style={
                                                t.color
                                                    ? {
                                                          backgroundColor:
                                                              t.color,
                                                          color: "#fff",
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {t.name}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </header>

                <div className="mb-10 h-px bg-(--color-border)" />

                {(tocStyle === "github" || tocStyle === "both") &&
                    tocEntries.length > 0 && <GithubToc entries={tocEntries} />}

                <div
                    className="post-content prose dark:prose-invert max-w-none"
                    data-content="true"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
            </article>
            {(tocStyle === "hover" || tocStyle === "both") && (
                <TableOfContents entries={tocEntries} />
            )}
            <MermaidRenderer selector=".post-content" label="blog post" />
        </div>
    );
}
