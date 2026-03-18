/**
 * 포트폴리오 목록/블록 뷰 토글 및 렌더링
 * - List: 기존 리스트형 레이아웃
 * - Block: 썸네일 그리드 카드, 각 카드는 상세 페이지 링크
 * - 보기 방식은 localStorage에 저장되어 새로고침·재방문 시 유지됨
 */
import { useState, useEffect } from "react";
import type { PortfolioProject } from "@/types/portfolio";

type ViewMode = "list" | "block";

interface Props {
    projects: PortfolioProject[];
    forcedViewMode?: "list" | "block";
}

/** 블록 뷰용 태그 색상 (키워드별 대응 또는 순환) */
const TAG_COLORS = [
    "bg-emerald-600/90 text-white",
    "bg-violet-600/90 text-white",
    "bg-amber-800/90 text-white",
    "bg-stone-500/90 text-white",
    "bg-amber-600/90 text-white",
    "bg-rose-800/90 text-white",
];

function getTagClass(index: number) {
    return TAG_COLORS[index % TAG_COLORS.length];
}

const STORAGE_KEY = "portfolioViewMode";

function getStoredViewMode(): ViewMode {
    if (typeof window === "undefined") return "list";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "list" || stored === "block") return stored;
    return "list";
}

export default function PortfolioView({ projects, forcedViewMode }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>(
        forcedViewMode ?? "list"
    );

    useEffect(() => {
        if (!forcedViewMode) {
            setViewMode(getStoredViewMode());
        }
    }, [forcedViewMode]);

    const handleSetViewMode = (mode: ViewMode) => {
        setViewMode(mode);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, mode);
        }
    };

    return (
        <div className="space-y-6">
            {/* 헤더 + List/Block 토글 */}
            <div className="flex items-end justify-between">
                <h1 className="text-3xl font-black tracking-tight text-(--color-foreground)">
                    Portfolio
                </h1>
                {!forcedViewMode && (
                    <div
                        className="inline-flex rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-0.5"
                        role="tablist"
                        aria-label="포트폴리오 보기 방식"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "list"}
                            onClick={() => handleSetViewMode("list")}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                viewMode === "list"
                                    ? "bg-(--color-surface) text-(--color-foreground) shadow-sm"
                                    : "text-(--color-muted) hover:text-(--color-foreground)"
                            }`}
                        >
                            List
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "block"}
                            onClick={() => handleSetViewMode("block")}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                viewMode === "block"
                                    ? "bg-(--color-surface) text-(--color-foreground) shadow-sm"
                                    : "text-(--color-muted) hover:text-(--color-foreground)"
                            }`}
                        >
                            Block
                        </button>
                    </div>
                )}
            </div>

            {viewMode === "list" ? (
                // 타임라인 리스트 뷰
                <div className="relative space-y-0">
                    {/* 타임라인 세로선 */}
                    <div
                        className="absolute top-0 bottom-0 left-0 w-px bg-(--color-border)"
                        aria-hidden="true"
                    />
                    {projects.map((project) => (
                        <article
                            key={project.slug}
                            className="relative pb-10 pl-8 last:pb-0"
                        >
                            {/* 타임라인 닷 */}
                            <div
                                className="absolute top-7 left-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-(--color-accent) bg-(--color-surface)"
                                aria-hidden="true"
                            />
                            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="mb-1 text-xs font-semibold tracking-wider text-(--color-muted) uppercase">
                                            {project.startDate} —{" "}
                                            {project.endDate}
                                        </p>
                                        <h2 className="tablet:text-2xl text-xl font-bold text-(--color-foreground)">
                                            {project.title}
                                        </h2>
                                    </div>
                                    {project.github ? (
                                        <a
                                            href={project.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                                        >
                                            GitHub
                                            <svg
                                                className="h-3.5 w-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                />
                                            </svg>
                                        </a>
                                    ) : null}
                                </div>
                                <p className="tablet:text-base mb-5 text-sm leading-relaxed text-(--color-foreground)">
                                    {project.description}
                                </p>
                                <dl className="tablet:grid-cols-3 mb-5 grid grid-cols-2 gap-4 rounded-xl bg-(--color-surface) p-4 text-sm">
                                    <div>
                                        <dt className="mb-0.5 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                            역할
                                        </dt>
                                        <dd className="font-semibold text-(--color-foreground)">
                                            {project.role}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="mb-0.5 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                            참여 인원
                                        </dt>
                                        <dd className="font-semibold text-(--color-foreground)">
                                            {project.teamSize}명
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="mb-0.5 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                            목표
                                        </dt>
                                        <dd className="font-semibold text-(--color-foreground)">
                                            {project.goal}
                                        </dd>
                                    </div>
                                </dl>
                                {project.accomplishments.length > 0 ? (
                                    <div className="mb-5">
                                        <h3 className="mb-2 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                            성과
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {project.accomplishments.map(
                                                (a, i) => (
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
                                                )
                                            )}
                                        </ul>
                                    </div>
                                ) : null}
                                {project.keywords.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
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
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                // 블록 그리드 뷰
                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-5">
                    {projects.map((project, index) => (
                        <a
                            key={project.slug}
                            href={`/portfolio/${project.slug}`}
                            className="card-lift group block overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)"
                        >
                            {/* 썸네일 */}
                            <div className="relative aspect-video w-full overflow-hidden bg-(--color-border)">
                                {project.thumbnail ? (
                                    <img
                                        src={project.thumbnail}
                                        alt=""
                                        width={640}
                                        height={360}
                                        loading={index < 2 ? "eager" : "lazy"}
                                        decoding="async"
                                        fetchPriority={
                                            index < 2 ? "high" : undefined
                                        }
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-(--color-muted)">
                                        No image
                                    </div>
                                )}
                                {/* 호버 오버레이 */}
                                <div
                                    className="absolute inset-0 bg-(--color-foreground) opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]"
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="p-5">
                                <h2 className="mb-2.5 font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                    {project.title}
                                </h2>
                                {project.keywords.length > 0 ? (
                                    <div className="mb-3 flex flex-wrap gap-1.5">
                                        {project.keywords.map((k, i) => (
                                            <span
                                                key={i}
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTagClass(i)}`}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                <p className="line-clamp-2 text-sm text-(--color-muted)">
                                    {project.description}
                                </p>
                                {project.badges?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {project.badges.map((b, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1 rounded-full border border-(--color-border) px-2.5 py-0.5 text-xs font-medium text-(--color-foreground)"
                                            >
                                                {b.text}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
