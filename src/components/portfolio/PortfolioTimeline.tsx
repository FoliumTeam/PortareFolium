import Link from "next/link";
import { CalendarDays, ImageIcon } from "lucide-react";
import PortfolioActions from "@/components/portfolio/PortfolioActions";
import { SkillBadge } from "@/components/resume/SkillBadge";
import { formatPortfolioMonthRange } from "@/lib/portfolio";
import type { PortfolioProject } from "@/types/portfolio";

type PortfolioTimelineProps = {
    projects: PortfolioProject[];
    portfolioBasePath?: string;
};

const focusClass =
    "focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface) focus-visible:outline-none";

const getProjectTypeBadge = (projectType: PortfolioProject["projectType"]) =>
    projectType === "work"
        ? {
              label: "기업 프로젝트",
              className:
                  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          }
        : {
              label: "개인 프로젝트",
              className:
                  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
          };

export default function PortfolioTimeline({
    projects,
    portfolioBasePath = "/portfolio",
}: PortfolioTimelineProps) {
    const timelineProjects = [...projects].sort((left, right) =>
        (right.endDate || right.startDate).localeCompare(
            left.endDate || left.startDate
        )
    );

    return (
        <div className="relative space-y-0">
            <div
                className="absolute top-0 bottom-0 left-0 w-px bg-(--color-border)"
                aria-hidden="true"
            />
            {timelineProjects.map((project, index) => {
                const media = project.primaryMedia;
                const imageSource =
                    media?.type === "video" ? media.poster : media?.src;
                const pitch = project.oneLinePitch || project.description;
                const projectTypeBadge = getProjectTypeBadge(
                    project.projectType
                );

                return (
                    <article
                        key={project.slug}
                        className="relative pb-10 pl-8 last:pb-0"
                        data-pdf-block-item
                    >
                        <div
                            className="absolute top-7 left-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-(--color-accent) bg-(--color-surface)"
                            aria-hidden="true"
                        />
                        <div className="card-lift group relative overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)">
                            <Link
                                href={`${portfolioBasePath}/${project.slug}`}
                                aria-label={`${project.title} 프로젝트 기록 보기`}
                                className={`absolute inset-0 z-10 rounded-2xl ${focusClass}`}
                            />
                            <div className="tablet:p-6 overflow-hidden p-5">
                                <div className="tablet:w-80 tablet:ml-6 tablet:mb-4 tablet:float-right float-none mb-5 overflow-hidden rounded-xl bg-(--color-border)">
                                    <div className="relative aspect-video">
                                        {imageSource ? (
                                            <img
                                                src={imageSource}
                                                alt={
                                                    media?.alt ??
                                                    `${project.title} 대표 이미지`
                                                }
                                                width={640}
                                                height={360}
                                                loading={
                                                    index < 2 ? "eager" : "lazy"
                                                }
                                                decoding="async"
                                                fetchPriority={
                                                    index < 2
                                                        ? "high"
                                                        : undefined
                                                }
                                                className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-(--color-muted)">
                                                <ImageIcon
                                                    className="h-9 w-9"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        )}
                                        {media?.type === "video" && (
                                            <span className="absolute right-3 bottom-3 rounded-md bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
                                                Video
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${projectTypeBadge.className}`}
                                    >
                                        {projectTypeBadge.label}
                                    </span>
                                    <p className="flex items-center gap-1.5 text-sm font-semibold text-(--color-muted)">
                                        <CalendarDays
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        {formatPortfolioMonthRange(
                                            project.startDate,
                                            project.endDate
                                        )}
                                    </p>
                                </div>
                                <h2 className="tablet:text-2xl text-xl font-(--font-display) font-black tracking-tight text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                    {project.title}
                                </h2>
                                {pitch && (
                                    <p className="mt-3 text-base leading-relaxed text-(--color-muted)">
                                        {pitch}
                                    </p>
                                )}
                                {project.ownership[0] && (
                                    <p className="mt-4 border-l-2 border-(--color-accent) pl-3 text-base font-semibold text-(--color-foreground)">
                                        {project.ownership[0]}
                                    </p>
                                )}
                                {project.keywords.length > 0 && (
                                    <div
                                        className="mt-5 flex flex-wrap gap-1.5"
                                        aria-label="사용 기술"
                                    >
                                        {project.keywords.map((keyword) => (
                                            <SkillBadge
                                                key={keyword}
                                                name={keyword}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="clear-both" />
                                {project.outcomes.length > 0 && (
                                    <ul
                                        className="tablet:grid-cols-2 mt-5 grid grid-cols-1 gap-2"
                                        aria-label="주요 결과"
                                    >
                                        {project.outcomes.map((outcome) => (
                                            <li
                                                key={outcome.result}
                                                className="flex items-start gap-2 text-base leading-relaxed text-(--color-foreground)"
                                            >
                                                <span
                                                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)"
                                                    aria-hidden="true"
                                                />
                                                <span>{outcome.result}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <PortfolioActions
                                    slug={project.slug}
                                    links={project.links}
                                    className="relative z-20 mt-6"
                                    portfolioBasePath={portfolioBasePath}
                                />
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
