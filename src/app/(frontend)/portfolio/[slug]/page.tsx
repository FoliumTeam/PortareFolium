import { redirect } from "next/navigation";
import {
    getPortfolioItem,
    getPortfolioItemMeta,
    getAllPortfolioSlugs,
} from "@/lib/queries";
import type { PortfolioProject } from "@/types/portfolio";
import { getCachedMarkdown } from "@/lib/markdown";
import { extractTocFromHtml } from "@/lib/toc";
import TableOfContents from "@/components/TableOfContents";
import MermaidRenderer from "@/components/MermaidRenderer";
import { ArrowLeft, Github, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    return getAllPortfolioSlugs();
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const item = await getPortfolioItemMeta(slug);
    if (!item) return {};
    return {
        title: item.meta_title || `${item.title} - Portfolio`,
        description: item.meta_description || item.description || undefined,
        openGraph:
            item.og_image || item.thumbnail
                ? { images: [item.og_image || item.thumbnail] }
                : undefined,
    };
}

export default async function PortfolioDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const item = await getPortfolioItem(slug);
    if (!item) redirect("/portfolio");

    const d = item.data ?? {};
    const project: PortfolioProject = {
        slug: item.slug,
        title: item.title,
        description: item.description ?? "",
        startDate: d.startDate,
        endDate: d.endDate,
        goal: d.goal,
        role: d.role,
        teamSize: d.teamSize,
        accomplishments: d.accomplishments ?? [],
        keywords: item.tags ?? [],
        github: d.github ?? "",
        public: true,
        jobField: d.jobField,
        thumbnail: item.thumbnail,
        badges: d.badges,
    };

    const contentHtml = await getCachedMarkdown(slug, item.content ?? "");
    const tocEntries = extractTocFromHtml(contentHtml);

    return (
        <div className="mx-auto flex max-w-5xl gap-12">
            <article className="max-w-3xl min-w-0 flex-1">
                <Link
                    href="/portfolio"
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-muted) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio 목록
                </Link>

                {project.thumbnail ? (
                    <div className="mb-10 aspect-video overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)">
                        <Image
                            src={project.thumbnail}
                            alt=""
                            width={768}
                            height={432}
                            priority
                            className="h-full w-full object-cover"
                        />
                    </div>
                ) : null}

                <header className="mb-8">
                    <h1 className="tablet:text-4xl mb-4 text-3xl font-black tracking-tight text-(--color-foreground)">
                        {project.title}
                    </h1>
                    <p className="mb-5 text-lg leading-relaxed text-(--color-muted)">
                        {project.description}
                    </p>
                    {project.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {project.keywords.map((k) => (
                                <span
                                    key={k}
                                    className="rounded-full bg-(--color-tag-bg) px-3 py-1 text-xs font-medium text-(--color-tag-fg)"
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </header>

                {/* 메타데이터 — ref.png 스타일 */}
                <div className="mb-8 space-y-3">
                    <div className="tablet:grid-cols-4 grid grid-cols-2 gap-x-8 gap-y-3">
                        {project.startDate || project.endDate ? (
                            <div>
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    개발 기간
                                </p>
                                <p className="text-sm font-medium text-(--color-foreground)">
                                    {project.startDate}
                                    {project.endDate
                                        ? ` — ${project.endDate}`
                                        : ""}
                                </p>
                            </div>
                        ) : null}
                        {project.role ? (
                            <div>
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    역할
                                </p>
                                <p className="text-sm font-medium text-(--color-foreground)">
                                    {project.role}
                                </p>
                            </div>
                        ) : null}
                        {project.teamSize != null ? (
                            <div>
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    참여 인원
                                </p>
                                <p className="text-sm font-medium text-(--color-foreground)">
                                    {project.teamSize}명
                                </p>
                            </div>
                        ) : null}
                    </div>
                    {project.goal ? (
                        <div>
                            <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                    aria-hidden="true"
                                />
                                개발 목적
                            </p>
                            <p className="text-sm font-medium text-(--color-foreground)">
                                {project.goal}
                            </p>
                        </div>
                    ) : null}
                </div>

                {project.accomplishments.length > 0 ? (
                    <section className="mb-8">
                        <h2 className="mb-3 flex items-center gap-1 text-base font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                            <span
                                className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                aria-hidden="true"
                            />
                            성과
                        </h2>
                        <ul className="tablet:grid-cols-2 grid grid-cols-1 gap-2">
                            {project.accomplishments.map((a, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2.5 text-sm text-(--color-foreground)"
                                >
                                    <span
                                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    <span className="leading-relaxed">{a}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {project.badges?.length ? (
                    <section className="mb-8">
                        <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            수상 &middot; 출시
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {project.badges.map((b, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-subtle) px-4 py-2 text-sm font-medium text-(--color-foreground)"
                                >
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    {b.text}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null}

                {project.github ? (
                    <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-8 inline-flex items-center gap-2 rounded-full border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                    >
                        <Github className="h-4 w-4" aria-hidden="true" />
                        GitHub 저장소
                        <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                    </a>
                ) : null}

                {contentHtml && (
                    <div className="mb-10 h-px bg-(--color-border)" />
                )}

                <div
                    className="portfolio-markdoc-body prose max-w-none text-(--color-foreground)"
                    data-content="true"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
            </article>
            <TableOfContents
                entries={tocEntries}
                contentSelector=".portfolio-markdoc-body"
            />
            <MermaidRenderer
                selector=".portfolio-markdoc-body"
                label="portfolio slug"
            />
        </div>
    );
}
