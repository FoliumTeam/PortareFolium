import {
    groupPortfolioProjects,
    matchesPortfolioJobField,
    normalizePortfolioProject,
} from "@/lib/portfolio";
import type { PortfolioRawRow } from "@/types/portfolio";
import type { ResumePdfSource } from "@/types/resume-pdf";

export const isAiAgentRow = (row: PortfolioRawRow): boolean =>
    row.data?.aiAgentAchievement === true;

export const rowInJobField = (row: PortfolioRawRow, jobField: string) =>
    matchesPortfolioJobField(normalizePortfolioProject(row), jobField);

// 사이트 기본 프로젝트 집합 (D12): 직무 이력서 간략 목록(대표 최대 5건) + AI 에이전트 항목
// 지원 프로필: overrides 제외 목록을 먼저 적용
export const defaultProjectSlugs = (source: ResumePdfSource): string[] => {
    const excluded = new Set(
        source.profileOverrides?.excludedPortfolioSlugs ?? []
    );
    const rows = source.portfolio.filter((row) => !excluded.has(row.slug));
    const featured = groupPortfolioProjects(
        rows
            .map((row) => normalizePortfolioProject(row))
            .filter((p) => matchesPortfolioJobField(p, source.jobField)),
        source.jobField
    ).selected.slice(0, 5);
    const ai = rows.filter(
        (row) => isAiAgentRow(row) && rowInJobField(row, source.jobField)
    );
    return [
        ...new Set([...featured.map((p) => p.slug), ...ai.map((r) => r.slug)]),
    ];
};

// 최종 포함 slug와 순서 힌트
// 프리셋 order가 있으면 그것이 포함 집합 + 순서, 없으면 기본 집합 + 프로필 portfolioOrder
// 다른 직무 항목은 order에 있어도 제외 (V3)
export const selectProjectSlugs = (
    source: ResumePdfSource,
    presetOrder: string[] | undefined
): { slugs: string[]; rank: Map<string, number>; missing: string[] } => {
    const bySlug = new Map(source.portfolio.map((row) => [row.slug, row]));
    const excluded = new Set(
        source.profileOverrides?.excludedPortfolioSlugs ?? []
    );
    const wanted = presetOrder ?? defaultProjectSlugs(source);
    const missing = wanted.filter((slug) => !bySlug.has(slug));
    const slugs = wanted.filter((slug) => {
        const row = bySlug.get(slug);
        return (
            row !== undefined &&
            !excluded.has(slug) &&
            rowInJobField(row, source.jobField)
        );
    });
    const orderHint =
        presetOrder ?? source.profileOverrides?.portfolioOrder ?? [];
    const rank = new Map(orderHint.map((slug, i) => [slug, i]));
    return { slugs, rank, missing };
};
