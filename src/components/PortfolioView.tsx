import PortfolioProjectGrid from "@/components/portfolio/PortfolioProjectGrid";
import type { PortfolioProject } from "@/types/portfolio";

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
            projects: projects
                .filter((project) => project.projectType === "work")
                .sort(sortByRecentDate),
        },
        {
            eyebrow: "개인 제작",
            heading: "개인 프로젝트",
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
        <div className="space-y-14">
            {groupedProjects.map(
                (group) =>
                    group.projects.length > 0 && (
                        <section
                            key={group.heading}
                            aria-labelledby={`${group.eyebrow}-heading`}
                            data-pdf-block
                        >
                            <div className="mb-6 max-w-2xl">
                                <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                                    {group.eyebrow}
                                </p>
                                <h2
                                    id={`${group.eyebrow}-heading`}
                                    className="text-2xl font-(--font-display) font-black tracking-tight text-(--color-foreground)"
                                >
                                    {group.heading}
                                </h2>
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
