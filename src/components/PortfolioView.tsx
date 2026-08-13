import PortfolioProjectGrid from "@/components/portfolio/PortfolioProjectGrid";
import type { PortfolioProject } from "@/types/portfolio";
import { BriefcaseBusiness, UserRound } from "lucide-react";

type PortfolioViewProps = {
    projects: PortfolioProject[];
    portfolioBasePath?: string;
    jobField?: string;
};

const sortByRecentDate = (left: PortfolioProject, right: PortfolioProject) =>
    (right.endDate || right.startDate).localeCompare(
        left.endDate || left.startDate
    );

export default function PortfolioView({
    projects,
    portfolioBasePath,
    jobField,
}: PortfolioViewProps) {
    const groupedProjects = [
        {
            eyebrow: "경력 및 협업",
            heading: "기업 프로젝트",
            description: "회사·고객사 업무와 협업으로 완성한 프로젝트",
            icon: BriefcaseBusiness,
            accentClass: "border-blue-500",
            badgeClass:
                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
            projects: projects
                .filter((project) => project.projectType === "work")
                .sort(sortByRecentDate),
        },
        {
            eyebrow: "개인 제작",
            heading: "개인 프로젝트",
            description: "직접 기획·개발·운영하며 확장한 프로젝트",
            icon: UserRound,
            accentClass: "border-purple-500",
            badgeClass:
                "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
            projects: projects
                .filter((project) => project.projectType === "personal")
                .sort(sortByRecentDate),
        },
    ];

    if (projects.length === 0) {
        return (
            <p className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) px-5 py-10 text-center text-(--color-muted)">
                공개된 프로젝트가 없습니다.
            </p>
        );
    }

    return (
        <div className="space-y-20">
            {groupedProjects.map(
                (group) =>
                    group.projects.length > 0 && (
                        <section
                            key={group.heading}
                            aria-labelledby={`${group.eyebrow}-heading`}
                            className="scroll-mt-24"
                            data-pdf-block
                        >
                            <div
                                className={`mb-7 rounded-2xl border border-l-4 border-(--color-border) ${group.accentClass} tablet:p-6 bg-(--color-surface) p-5`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${group.badgeClass}`}
                                        >
                                            <group.icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="mb-1 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                                                {group.eyebrow}
                                            </p>
                                            <h2
                                                id={`${group.eyebrow}-heading`}
                                                className="text-3xl font-(--font-display) font-black tracking-tight text-(--color-foreground)"
                                            >
                                                {group.heading}
                                            </h2>
                                            <p className="mt-2 text-base leading-relaxed text-(--color-muted)">
                                                {group.description}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${group.badgeClass}`}
                                    >
                                        {group.projects.length}건
                                    </span>
                                </div>
                            </div>
                            <PortfolioProjectGrid
                                projects={group.projects}
                                portfolioBasePath={portfolioBasePath}
                            />
                        </section>
                    )
            )}
        </div>
    );
}
