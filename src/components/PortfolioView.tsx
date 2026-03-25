"use client";

// 포트폴리오 타임라인 리스트 뷰
// - 좌측 타임라인 선 + 닷 구조
// - 썸네일 float-right: 제목·날짜·설명·메타 정보가 이미지를 감싸는 레이아웃
// - 전체 카드 클릭 → 상세 페이지 (stretched link)
// - GitHub 버튼은 z-10으로 독립 동작
import type { PortfolioProject } from "@/types/portfolio";
import { ExternalLinkIcon } from "lucide-react";

interface Props {
    projects: PortfolioProject[];
}

export default function PortfolioView({ projects }: Props) {
    return (
        <div className="relative space-y-0">
            {/* 타임라인 세로선 */}
            <div
                className="absolute top-0 bottom-0 left-0 w-px bg-(--color-border)"
                aria-hidden="true"
            />

            {projects.map((project, index) => (
                <article
                    key={project.slug}
                    className="relative pb-10 pl-8 last:pb-0"
                >
                    {/* 타임라인 닷 */}
                    <div
                        className="absolute top-7 left-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-(--color-accent) bg-(--color-surface)"
                        aria-hidden="true"
                    />

                    <div className="card-lift group relative overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) transition-colors hover:border-(--color-accent)">
                        {/* stretched link */}
                        <a
                            href={`/portfolio/${project.slug}`}
                            className="absolute inset-0 z-0"
                            aria-label={project.title}
                        />

                        {/* 카드 본문 */}
                        <div className="tablet:p-6 overflow-hidden p-5">
                            {/* 썸네일 float-right */}
                            {project.thumbnail ? (
                                <div className="tablet:w-80 float-right mb-4 ml-5 w-48 overflow-hidden">
                                    <div className="aspect-video">
                                        <img
                                            src={project.thumbnail}
                                            alt=""
                                            width={320}
                                            height={180}
                                            loading={
                                                index < 2 ? "eager" : "lazy"
                                            }
                                            decoding="async"
                                            fetchPriority={
                                                index < 2 ? "high" : undefined
                                            }
                                            className="h-full w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                        />
                                    </div>

                                    {/* 썸네일 아래 GitHub 버튼 */}
                                    {project.github ? (
                                        <div className="mt-4 flex w-full items-center justify-end">
                                            <a
                                                href={project.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative z-10 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#24292e] px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-opacity hover:opacity-80"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
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
                                                GitHub
                                                <span className="ml-1">
                                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                                </span>
                                            </a>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {/* 날짜 */}
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold tracking-wider text-(--color-muted) uppercase tabular-nums">
                                    {project.startDate}
                                    {project.endDate
                                        ? ` — ${project.endDate}`
                                        : ""}
                                </p>
                            </div>

                            {/* 제목 */}
                            <h2 className="tablet:text-2xl mb-3 text-xl font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                {project.title}
                            </h2>

                            {/* 뱃지 */}
                            {project.badges && project.badges.length > 0 ? (
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                    {project.badges.map((b, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full bg-(--color-accent) px-2.5 py-0.5 text-xs font-semibold text-white"
                                        >
                                            {b.text}
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {/* 역할 + 참여 인원 (2열 그리드) */}
                            {project.role || project.teamSize ? (
                                <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-3">
                                    {project.role ? (
                                        <div>
                                            <p className="mb-0.5 flex items-center gap-1 text-sm font-bold tracking-widest text-(--color-accent) uppercase">
                                                <span
                                                    className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                                    aria-hidden="true"
                                                />
                                                역할
                                            </p>
                                            <p className="text-sm text-(--color-foreground)">
                                                {project.role}
                                            </p>
                                        </div>
                                    ) : null}
                                    {project.teamSize ? (
                                        <div>
                                            <p className="mb-0.5 flex items-center gap-1 text-sm font-bold tracking-widest text-(--color-accent) uppercase">
                                                <span
                                                    className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                                    aria-hidden="true"
                                                />
                                                참여 인원
                                            </p>
                                            <p className="text-sm text-(--color-foreground)">
                                                {project.teamSize}명
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {/* 목표 (풀 너비) */}
                            {project.goal ? (
                                <div className="mb-3">
                                    <p className="mb-0.5 flex items-center gap-1 text-sm font-bold tracking-widest text-(--color-accent) uppercase">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                            aria-hidden="true"
                                        />
                                        목표
                                    </p>
                                    <p className="text-sm text-(--color-foreground)">
                                        {project.goal}
                                    </p>
                                </div>
                            ) : null}

                            {/* 설명 2줄 clamp */}
                            {project.description ? (
                                <p className="mb-3 line-clamp-2 text-sm text-(--color-muted)">
                                    {project.description}
                                </p>
                            ) : null}

                            {/* 태그 */}
                            {project.keywords.length > 0 ? (
                                <div className="mb-4 flex flex-wrap gap-1.5">
                                    {project.keywords.map((k, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full bg-(--color-tag-bg) px-3 py-1 text-xs font-medium text-(--color-tag-fg)"
                                        >
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {/* float 해제 */}
                            <div className="clear-both" />

                            {/* 성과 (float 아래) */}
                            {project.accomplishments.length > 0 && (
                                <div className="mt-2">
                                    <p className="mb-2 flex items-center gap-1 text-sm font-bold tracking-widest text-(--color-accent) uppercase">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                            aria-hidden="true"
                                        />
                                        성과
                                    </p>
                                    <ul className="tablet:grid-cols-2 grid grid-cols-1 gap-1.5">
                                        {project.accomplishments.map((a, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-sm text-(--color-foreground)"
                                            >
                                                <span
                                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)"
                                                    aria-hidden="true"
                                                />
                                                {a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}
