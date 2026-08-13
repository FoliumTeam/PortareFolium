import type { ResumeProject } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";
import { getPortfolioItem } from "@/lib/queries";
import { normalizePortfolioProject } from "@/lib/portfolio";
import type { PortfolioRawRow } from "@/types/portfolio";
import { ArrowUpRight, ExternalLinkIcon } from "lucide-react";

// 날짜 포맷
const formatDateRange = (startDate?: string, endDate?: string): string =>
    `${startDate || ""} ~ ${endDate || "진행 중"}`;

interface Props {
    projects: ResumeProject[];
    label?: string;
    badge?: string;
    portfolioBasePath?: string;
    compact?: boolean;
    activeJobField?: string;
}

// 프로젝트 섹션 렌더링 (markdown 렌더링 및 portfolio fetch 자체 처리)
export default async function ProjectsSection({
    projects,
    label = "프로젝트",
    badge,
    portfolioBasePath = "/portfolio",
    compact = false,
    activeJobField = "web",
}: Props) {
    if (projects.length === 0) return null;

    // sections markdown 렌더링
    const projectsMarkdown = await Promise.all(
        projects.map(async (proj) => {
            if (!proj.sections) return [] as (string | null)[];
            return Promise.all(
                proj.sections.map((sec) =>
                    sec.markdown ? renderMarkdown(sec.content) : null
                )
            );
        })
    );

    // portfolioSlug 연결 항목 fetch
    const portfolioSlugs = projects
        .map((p) => p.portfolioSlug)
        .filter((s): s is string => Boolean(s));
    const portfolioRows = await Promise.all(
        portfolioSlugs.map((slug) => getPortfolioItem(slug))
    );
    const portfolioItemMap = Object.fromEntries(
        portfolioSlugs.flatMap((slug, index) => {
            const row = portfolioRows[index];
            return row
                ? [[slug, normalizePortfolioProject(row as PortfolioRawRow)]]
                : [];
        })
    );

    if (compact) {
        const compactProjects = projects
            .map((project) => ({
                project,
                portfolio: project.portfolioSlug
                    ? portfolioItemMap[project.portfolioSlug]
                    : undefined,
            }))
            .filter((entry) => entry.project.portfolioSlug && entry.portfolio)
            .sort((left, right) =>
                (
                    right.project.endDate ||
                    right.project.startDate ||
                    ""
                ).localeCompare(
                    left.project.endDate || left.project.startDate || ""
                )
            )
            .slice(0, 5);

        return (
            <section className="mb-10" data-pdf-block>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-(--color-border) pb-2">
                    <div>
                        <h2 className="text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                            {label}
                        </h2>
                        <p className="mt-1 text-sm text-(--color-muted)">
                            최신 대표 프로젝트 5건을 요약했습니다.
                        </p>
                    </div>
                    <a
                        href={portfolioBasePath}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent) px-3.5 py-2 text-sm font-bold text-(--color-on-accent) transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        웹 포트폴리오 전체 보기
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                </div>
                <div className="space-y-3">
                    {compactProjects.map(({ project, portfolio }) => {
                        const summary =
                            project.description ||
                            portfolio?.outcomes[0]?.result ||
                            project.highlights?.[0] ||
                            "";
                        return (
                            <article
                                key={project.portfolioSlug}
                                className="group relative rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5 transition-colors hover:border-(--color-accent)"
                                data-pdf-block-item
                            >
                                <a
                                    href={`${portfolioBasePath}/${project.portfolioSlug}`}
                                    className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                                    aria-label={`${project.name ?? "프로젝트"} 프로젝트 기록 보기`}
                                />
                                <div className="tablet:flex-row tablet:items-start tablet:justify-between flex flex-col gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                            {project.name}
                                        </h3>
                                        {summary ? (
                                            <p className="mt-1.5 text-base leading-relaxed text-(--color-muted)">
                                                {summary}
                                            </p>
                                        ) : null}
                                        {(project.startDate ||
                                            project.endDate) && (
                                            <p className="mt-3 text-sm font-medium text-(--color-muted)">
                                                {formatDateRange(
                                                    project.startDate,
                                                    project.endDate
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-(--color-accent)">
                                        상세 보기
                                        <ArrowUpRight
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        );
    }

    return (
        <section className="mb-10" data-pdf-block>
            <h2
                className={`mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase ${badge ? "flex items-center gap-3" : ""}`}
            >
                {label}
                {badge ? (
                    <span className="rounded-lg bg-(--color-accent) px-3 py-0.5 text-xs font-bold tracking-widest text-(--color-on-accent) normal-case">
                        {badge}
                    </span>
                ) : null}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {projects.map((project, pIdx) => {
                    const pf = project.portfolioSlug
                        ? portfolioItemMap[project.portfolioSlug]
                        : null;
                    const pfTags = pf?.keywords;
                    const sourceLink = pf?.links.find(
                        (link) => link.kind === "source"
                    );
                    const media = pf?.primaryMedia;
                    const imageSource =
                        media?.type === "video" ? media.poster : media?.src;
                    return (
                        <div
                            key={pIdx}
                            className="group relative flex flex-col overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-subtle) transition-colors hover:border-(--color-accent)"
                            data-pdf-block-item
                        >
                            {project.portfolioSlug ? (
                                <a
                                    href={`${portfolioBasePath}/${project.portfolioSlug}`}
                                    className="absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface) focus-visible:outline-none"
                                    aria-label={`${project.name ?? "프로젝트"} 프로젝트 기록 보기`}
                                />
                            ) : null}
                            {/* Thumbnail */}
                            {imageSource ? (
                                <div className="relative aspect-video w-full overflow-hidden bg-(--color-border)">
                                    <img
                                        src={imageSource}
                                        alt={
                                            media?.alt ||
                                            `${project.name ?? "프로젝트"} 대표 이미지`
                                        }
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                            ) : null}
                            <div className="flex flex-1 flex-col p-4">
                                {/* Name */}
                                {project.name ? (
                                    <h3
                                        className={`${project.url && !project.portfolioSlug ? "relative z-20" : ""}m-0 mb-1.5 text-base leading-snug font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)`}
                                    >
                                        {project.url &&
                                        !project.portfolioSlug ? (
                                            <a
                                                href={project.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-(--color-link) no-underline hover:opacity-80"
                                            >
                                                {project.name}
                                            </a>
                                        ) : (
                                            project.name
                                        )}
                                    </h3>
                                ) : null}
                                {/* Tags from portfolio */}
                                {pfTags && pfTags.length > 0 ? (
                                    <div className="mb-2 flex flex-wrap gap-1">
                                        {pfTags.slice(0, 5).map((tag, tIdx) => (
                                            <span
                                                key={tIdx}
                                                className="inline-block rounded bg-(--color-tag-bg) px-[0.45em] py-[0.1em] text-xs leading-normal font-medium text-(--color-tag-fg)"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                {/* Role · Team size */}
                                {pf?.ownership[0] || pf?.teamSize ? (
                                    <p className="m-0 mb-1.5 text-xs text-(--color-muted)">
                                        {[
                                            pf?.ownership[0],
                                            pf?.teamSize
                                                ? `${pf.teamSize}인`
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                ) : null}
                                {/* Date range */}
                                {(project.startDate || project.endDate) && (
                                    <div
                                        className="mb-2 text-sm text-(--color-muted)"
                                        style={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatDateRange(
                                            project.startDate,
                                            project.endDate
                                        )}
                                    </div>
                                )}
                                {/* Content */}
                                {project.sections &&
                                project.sections.length > 0 ? (
                                    project.sections.map((sec, sIdx) => (
                                        <div key={sIdx} className="mt-2">
                                            {sec.title ? (
                                                <p className="m-0 mb-0.5 text-base font-semibold tracking-wider text-(--color-muted) uppercase">
                                                    {sec.title}
                                                </p>
                                            ) : null}
                                            {projectsMarkdown[pIdx]?.[sIdx] ? (
                                                <div
                                                    className="resume-markdown m-0 text-base leading-[1.6] text-(--color-foreground)"
                                                    dangerouslySetInnerHTML={{
                                                        __html: projectsMarkdown[
                                                            pIdx
                                                        ][sIdx]!,
                                                    }}
                                                />
                                            ) : (
                                                <p className="m-0 text-base leading-[1.6] whitespace-pre-wrap text-(--color-foreground)">
                                                    {sec.content}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        {project.description ? (
                                            <p className="m-0 text-base leading-[1.6] whitespace-pre-wrap text-(--color-foreground)">
                                                {project.description}
                                            </p>
                                        ) : null}
                                        {project.highlights &&
                                        project.highlights.length > 0 ? (
                                            <ul className="mt-1 mb-0 pl-2 text-base text-(--color-foreground)">
                                                {project.highlights.map(
                                                    (h, hIdx) => (
                                                        <li
                                                            key={hIdx}
                                                            className="mb-[0.2em]"
                                                        >
                                                            {`• ${h}`}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        ) : null}
                                    </>
                                )}
                                {/* GitHub */}
                                {sourceLink ? (
                                    <div className="relative z-20 mt-auto pt-2">
                                        <a
                                            href={sourceLink.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#24292e] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-opacity hover:opacity-80"
                                        >
                                            <svg
                                                className="h-3.5 w-3.5"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            {sourceLink.label}
                                            <span className="ml-1">
                                                <ExternalLinkIcon className="h-3.5 w-3.5" />
                                            </span>
                                        </a>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
