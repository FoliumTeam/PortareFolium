import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
    ArrowLeft,
    ArrowUpRight,
    CalendarDays,
    Cpu,
    Users,
} from "lucide-react";
import {
    getAllPortfolioSlugs,
    getPortfolioItem,
    getPortfolioItemMeta,
} from "@/lib/queries";
import { getCachedMarkdown } from "@/lib/markdown";
import { extractTocFromHtml } from "@/lib/toc";
import {
    extractLegacyPortfolioGallery,
    matchesPortfolioJobField,
    normalizePortfolioProject,
} from "@/lib/portfolio";
import type { PortfolioMedia, PortfolioRawRow } from "@/types/portfolio";
import TableOfContents from "@/components/TableOfContents";
import GithubToc from "@/components/GithubToc";
import MermaidRenderer from "@/components/MermaidRenderer";
import ImageLightbox from "@/components/ImageLightbox";
import PortfolioActions from "@/components/portfolio/PortfolioActions";
import PortfolioGallery from "@/components/portfolio/PortfolioGallery";

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

const formatDateRange = (startDate: string, endDate: string): string => {
    if (!startDate && !endDate) return "";
    return `${startDate || "시작일 미정"} — ${endDate || "진행 중"}`;
};

const ProjectHeroMedia = ({ media }: { media?: PortfolioMedia }) => {
    if (!media) return null;
    return (
        <figure
            className="mt-8 overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)"
            data-pdf-block
        >
            <div className="aspect-video overflow-hidden bg-(--color-border)">
                {media.type === "image" ? (
                    <img
                        src={media.src}
                        alt={media.alt}
                        width={1200}
                        height={675}
                        fetchPriority="high"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <>
                        <video
                            controls
                            preload="metadata"
                            poster={media.poster}
                            aria-label={media.alt}
                            className="h-full w-full bg-black object-contain print:hidden"
                        >
                            <source src={media.src} />
                        </video>
                        <img
                            src={media.poster}
                            alt={media.alt}
                            width={1200}
                            height={675}
                            className="hidden h-full w-full object-cover print:block"
                        />
                    </>
                )}
            </div>
            {(media.caption || media.type === "video") && (
                <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-(--color-muted)">
                    <span>{media.caption || media.alt}</span>
                    {media.type === "video" && (
                        <a
                            href={media.src}
                            className="inline-flex items-center gap-1 font-semibold text-(--color-accent) underline-offset-4 hover:underline"
                        >
                            Video 원본
                            <ArrowUpRight
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                        </a>
                    )}
                </figcaption>
            )}
        </figure>
    );
};

type PortfolioDetailContentProps = {
    slug: string;
    jobField?: string;
    portfolioBasePath?: string;
};

export async function PortfolioDetailContent({
    slug,
    jobField,
    portfolioBasePath = "/portfolio",
}: PortfolioDetailContentProps) {
    const item = await getPortfolioItem(slug);
    if (!item) notFound();

    const project = normalizePortfolioProject(item as PortfolioRawRow);
    if (jobField && !matchesPortfolioJobField(project, jobField)) notFound();
    const contentHtml = await getCachedMarkdown(slug, project.content);
    const tocEntries = extractTocFromHtml(contentHtml);
    const isV2 = project.caseStudyVersion === 2;
    const derivedLegacyGallery = isV2
        ? []
        : extractLegacyPortfolioGallery(contentHtml).filter(
              (media) => media.src !== project.primaryMedia?.src
          );
    const gallery = isV2
        ? project.gallery.filter(
              (media) => media.src !== project.primaryMedia?.src
          )
        : derivedLegacyGallery;
    const contentSelector = isV2
        ? ".portfolio-case-study-content"
        : ".portfolio-legacy-content";
    const dateRange = formatDateRange(project.startDate, project.endDate);

    return (
        <div className="portfolio-case-study min-w-0">
            <Link
                href={portfolioBasePath}
                className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Portfolio
            </Link>

            <header className="mt-8 max-w-4xl" data-pdf-block>
                <p className="mb-3 text-xs font-bold tracking-[0.2em] text-(--color-accent) uppercase">
                    {isV2 ? "Case Study" : "Legacy Project"}
                </p>
                <h1 className="tablet:text-5xl text-4xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                    {project.title}
                </h1>
                {(project.oneLinePitch || project.description) && (
                    <p className="tablet:text-xl mt-4 text-lg leading-relaxed text-(--color-muted)">
                        {project.oneLinePitch || project.description}
                    </p>
                )}
                {project.keywords.length > 0 && (
                    <div
                        className="mt-5 flex flex-wrap gap-1.5"
                        aria-label="사용 기술"
                    >
                        {project.keywords.slice(0, 4).map((keyword) => (
                            <span
                                key={keyword}
                                className="rounded-md bg-(--color-tag-bg) px-2.5 py-1 text-xs font-medium text-(--color-tag-fg)"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            <ProjectHeroMedia media={project.primaryMedia} />

            <div
                className="tablet:grid-cols-2 laptop:grid-cols-4 mt-10 grid min-w-0 grid-cols-1 gap-4"
                data-pdf-block
            >
                {(project.ownership[0] || project.role) && (
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <p className="mb-2 text-xs font-bold tracking-wider text-(--color-muted) uppercase">
                            Role
                        </p>
                        <p className="font-semibold text-(--color-foreground)">
                            {project.ownership[0] || project.role}
                        </p>
                    </div>
                )}
                {project.teamSize > 0 && (
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-(--color-muted) uppercase">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            Team
                        </p>
                        <p className="font-semibold text-(--color-foreground)">
                            {project.teamSize}명
                        </p>
                    </div>
                )}
                {dateRange && (
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-(--color-muted) uppercase">
                            <CalendarDays
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            />
                            Duration
                        </p>
                        <p className="font-semibold text-(--color-foreground)">
                            {dateRange}
                        </p>
                    </div>
                )}
                {(project.engine || project.platforms.length > 0) && (
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-(--color-muted) uppercase">
                            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                            Stack
                        </p>
                        <p className="font-semibold text-(--color-foreground)">
                            {[project.engine, ...project.platforms]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    </div>
                )}
            </div>

            {project.ownership.length > 0 && (
                <section
                    className="mt-14"
                    aria-labelledby="ownership-heading"
                    data-pdf-block
                >
                    <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Ownership
                    </p>
                    <h2
                        id="ownership-heading"
                        className="text-2xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        제가 맡은 일
                    </h2>
                    <ul className="tablet:grid-cols-2 mt-5 grid grid-cols-1 gap-3">
                        {project.ownership.map((ownership) => (
                            <li
                                key={ownership}
                                className="flex items-start gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4 text-(--color-foreground)"
                                data-pdf-block-item
                            >
                                <span
                                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)"
                                    aria-hidden="true"
                                />
                                <span className="leading-relaxed">
                                    {ownership}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {project.outcomes.length > 0 && (
                <section
                    className="mt-14"
                    aria-labelledby="outcomes-heading"
                    data-pdf-block
                >
                    <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Impact
                    </p>
                    <h2
                        id="outcomes-heading"
                        className="text-2xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        결과와 근거
                    </h2>
                    <div className="tablet:grid-cols-3 mt-5 grid grid-cols-1 gap-3">
                        {project.outcomes.map((outcome) => (
                            <div
                                key={outcome.result}
                                className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                                data-pdf-block-item
                            >
                                <p className="leading-relaxed font-bold text-(--color-foreground)">
                                    {outcome.result}
                                </p>
                                {outcome.evidence && (
                                    <p className="mt-2 text-sm leading-relaxed text-(--color-muted)">
                                        {outcome.evidence}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {project.links.length > 0 && (
                <section
                    className="mt-10"
                    aria-label="프로젝트 링크"
                    data-pdf-block
                >
                    <PortfolioActions links={project.links} />
                </section>
            )}

            {project.goal && !isV2 && (
                <section
                    className="tablet:p-6 mt-14 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                    aria-labelledby="project-context-heading"
                    data-pdf-block
                >
                    <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Context
                    </p>
                    <h2
                        id="project-context-heading"
                        className="text-xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        프로젝트 목표
                    </h2>
                    <p className="mt-3 leading-relaxed text-(--color-muted)">
                        {project.goal}
                    </p>
                </section>
            )}

            {gallery.length > 0 && (
                <div className="mt-14">
                    <PortfolioGallery media={gallery} />
                </div>
            )}

            {isV2 ? (
                <div className="mt-16 flex min-w-0 gap-12">
                    <article className="min-w-0 flex-1" data-pdf-block>
                        <div
                            className="portfolio-case-study-content prose max-w-none text-(--color-foreground)"
                            data-content="true"
                            dangerouslySetInnerHTML={{ __html: contentHtml }}
                        />
                    </article>
                    <TableOfContents
                        entries={tocEntries}
                        contentSelector=".portfolio-case-study-content"
                    />
                </div>
            ) : (
                contentHtml && (
                    <details
                        className="mt-16 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)"
                        data-pdf-block
                    >
                        <summary className="tablet:px-6 cursor-pointer px-5 py-4 font-bold text-(--color-foreground) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:outline-none">
                            전체 기술 기록 펼치기
                        </summary>
                        <div className="tablet:px-6 border-t border-(--color-border) px-5 py-6">
                            {tocEntries.length > 0 && (
                                <GithubToc entries={tocEntries} />
                            )}
                            <div
                                className="portfolio-legacy-content prose max-w-none text-(--color-foreground)"
                                data-content="true"
                                dangerouslySetInnerHTML={{
                                    __html: contentHtml,
                                }}
                            />
                        </div>
                    </details>
                )
            )}

            {isV2 && project.devlogs.length > 0 && (
                <section
                    className="mt-14"
                    aria-labelledby="devlogs-heading"
                    data-pdf-block
                >
                    <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Further Reading
                    </p>
                    <h2
                        id="devlogs-heading"
                        className="text-2xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        개발 기록
                    </h2>
                    <ul className="mt-4 space-y-2">
                        {project.devlogs.map((devlog) => (
                            <li key={devlog.url}>
                                <a
                                    href={devlog.url}
                                    className="inline-flex items-center gap-1.5 font-semibold text-(--color-accent) underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:outline-none"
                                >
                                    {devlog.title}
                                    <ArrowUpRight
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {isV2 && project.credits.length > 0 && (
                <section
                    className="mt-14"
                    aria-labelledby="credits-heading"
                    data-pdf-block
                >
                    <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Credits
                    </p>
                    <h2
                        id="credits-heading"
                        className="text-2xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        함께 만든 사람들
                    </h2>
                    <ul className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-3">
                        {project.credits.map((credit) => (
                            <li
                                key={`${credit.name}-${credit.role}`}
                                className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4"
                                data-pdf-block-item
                            >
                                {credit.url ? (
                                    <a
                                        href={credit.url}
                                        className="font-bold text-(--color-foreground) underline-offset-4 hover:text-(--color-accent) hover:underline"
                                    >
                                        {credit.name}
                                    </a>
                                ) : (
                                    <p className="font-bold text-(--color-foreground)">
                                        {credit.name}
                                    </p>
                                )}
                                <p className="mt-1 text-sm text-(--color-muted)">
                                    {credit.role}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section
                className="tablet:flex-row tablet:items-center tablet:justify-between mt-16 flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                aria-labelledby="next-project-heading"
                data-pdf-block
            >
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                        Next
                    </p>
                    <h2
                        id="next-project-heading"
                        className="mt-1 text-xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        다른 프로젝트도 확인해 보세요
                    </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={portfolioBasePath}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-bold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        Selected Work
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {!jobField && (
                        <Link
                            href="/about"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:outline-none"
                        >
                            Contact
                        </Link>
                    )}
                </div>
            </section>

            <MermaidRenderer
                selector={contentSelector}
                label="portfolio slug"
            />
            <ImageLightbox contentSelector=".portfolio-case-study" />
        </div>
    );
}

export default async function PortfolioDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return <PortfolioDetailContent slug={(await params).slug} />;
}
