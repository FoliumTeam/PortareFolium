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
import { ArrowLeft, ExternalLink } from "lucide-react";
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
                    className="inline-flex items-center gap-2 rounded-xl border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-muted) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio 목록
                </Link>

                {project.thumbnail ? (
                    <div className="my-10 aspect-video overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)">
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

                <header>
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
                                    className="rounded-lg bg-(--color-tag-bg) px-3 py-1 text-sm font-medium text-(--color-tag-fg)"
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </header>

                {/* 메타데이터 */}
                <div className="mt-8 space-y-3">
                    <div className="tablet:grid-cols-4 grid grid-cols-2 gap-x-8 gap-y-4">
                        {project.role ? (
                            <div>
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-widest text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    역할
                                </p>
                                <p className="text-base font-medium text-(--color-foreground)">
                                    {project.role}
                                </p>
                            </div>
                        ) : null}
                        {project.teamSize != null ? (
                            <div>
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-widest text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    참여 인원
                                </p>
                                <p className="text-base font-medium text-(--color-foreground)">
                                    {project.teamSize}명
                                </p>
                            </div>
                        ) : null}
                        {project.startDate || project.endDate ? (
                            <div className="col-span-2 w-fit whitespace-nowrap">
                                <p className="mb-0.5 flex items-center gap-1 text-base font-bold tracking-widest text-(--color-accent) uppercase">
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    개발 기간
                                </p>
                                <p className="text-base font-medium text-(--color-foreground)">
                                    {project.startDate}
                                    {project.endDate
                                        ? ` — ${project.endDate}`
                                        : ""}
                                </p>
                            </div>
                        ) : null}
                    </div>
                    {project.goal ? (
                        <div>
                            <p className="flex items-center gap-1 text-base font-bold tracking-widest text-(--color-accent) uppercase">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                    aria-hidden="true"
                                />
                                개발 목적
                            </p>
                            <p className="mt-0.5 text-base font-medium text-(--color-foreground)">
                                {project.goal}
                            </p>
                        </div>
                    ) : null}
                </div>

                {project.accomplishments.length > 0 ? (
                    <section className="mt-8">
                        <h2 className="flex items-center gap-1 text-base font-bold tracking-widest text-(--color-accent) uppercase">
                            <span
                                className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                aria-hidden="true"
                            />
                            성과
                        </h2>
                        <ul className="tablet:grid-cols-2 mt-3 grid grid-cols-1 gap-2">
                            {project.accomplishments.map((a, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2.5 text-base text-(--color-foreground)"
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
                    <section className="mt-8">
                        <h2 className="text-sm font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            수상 &middot; 출시
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {project.badges.map((b, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) px-4 py-2 text-base font-medium text-(--color-foreground)"
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
                        className="mt-8 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#24292e] px-4 py-2 text-lg font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-80"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.155-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.948.358.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.582.688.482A9.504 9.504 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                clipRule="evenodd"
                            />
                        </svg>
                        GitHub
                        <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                    </a>
                ) : null}

                {contentHtml && (
                    <div className="my-10 h-px bg-(--color-border)" />
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
