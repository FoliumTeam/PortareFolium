import Link from "next/link";
import { ImageIcon } from "lucide-react";
import PortfolioActions from "@/components/portfolio/PortfolioActions";
import type { PortfolioProject } from "@/types/portfolio";

type PortfolioProjectCardProps = {
    project: PortfolioProject;
    priority?: boolean;
    prominent?: boolean;
};

const focusClass =
    "focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface) focus-visible:outline-none";

export default function PortfolioProjectCard({
    project,
    priority = false,
    prominent = false,
}: PortfolioProjectCardProps) {
    const media = project.primaryMedia;
    const imageSource = media?.type === "video" ? media.poster : media?.src;
    const pitch = project.oneLinePitch || project.description;

    return (
        <article
            className={`card-lift group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) ${prominent ? "tablet:col-span-2 laptop:grid laptop:grid-cols-2" : ""}`}
            data-pdf-block-item
        >
            <Link
                href={`/portfolio/${project.slug}`}
                aria-label={`${project.title} 사례 연구 보기`}
                className={`relative block aspect-video overflow-hidden bg-(--color-border) ${focusClass}`}
            >
                {imageSource ? (
                    <img
                        src={imageSource}
                        alt={media?.alt ?? `${project.title} 대표 이미지`}
                        width={960}
                        height={540}
                        loading={priority ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={priority ? "high" : undefined}
                        className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none"
                    />
                ) : (
                    <span className="flex h-full items-center justify-center text-(--color-muted)">
                        <ImageIcon className="h-9 w-9" aria-hidden="true" />
                    </span>
                )}
                {media?.type === "video" && (
                    <span className="absolute right-3 bottom-3 rounded-md bg-black/75 px-2.5 py-1 text-xs font-bold text-white">
                        Video
                    </span>
                )}
            </Link>

            <div className="tablet:p-6 flex min-w-0 flex-1 flex-col p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                    {project.engine && <span>{project.engine}</span>}
                    {project.platforms.length > 0 && (
                        <>
                            <span aria-hidden="true">·</span>
                            <span>{project.platforms.join(" / ")}</span>
                        </>
                    )}
                </div>
                <h3 className="text-xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                    <Link
                        href={`/portfolio/${project.slug}`}
                        className={`rounded-sm transition-colors hover:text-(--color-accent) ${focusClass}`}
                    >
                        {project.title}
                    </Link>
                </h3>
                {pitch && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-(--color-muted)">
                        {pitch}
                    </p>
                )}
                {project.ownership[0] && (
                    <p className="mt-4 border-l-2 border-(--color-accent) pl-3 text-sm font-semibold text-(--color-foreground)">
                        {project.ownership[0]}
                    </p>
                )}
                {project.outcomes.length > 0 && (
                    <ul className="mt-4 space-y-2" aria-label="주요 결과">
                        {project.outcomes.slice(0, 2).map((outcome) => (
                            <li
                                key={outcome.result}
                                className="flex items-start gap-2 text-sm leading-relaxed text-(--color-foreground)"
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
                <PortfolioActions
                    slug={project.slug}
                    links={project.links}
                    className="mt-auto pt-6"
                />
            </div>
        </article>
    );
}
