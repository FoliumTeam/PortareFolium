import { serverT } from "@/lib/server-i18n";
import PortfolioProjectGrid from "@/components/portfolio/PortfolioProjectGrid";
import PortfolioTimeline from "@/components/portfolio/PortfolioTimeline";
import {
    normalizePortfolioAiSectionConfig,
    splitPortfolioAiSection,
    type PortfolioAiSectionConfig,
} from "@/lib/portfolio-ai-section";
import type { PortfolioProject } from "@/types/portfolio";
import { Bot, BriefcaseBusiness, UserRound } from "lucide-react";

type PortfolioViewProps = {
    projects: PortfolioProject[];
    portfolioBasePath?: string;
    jobField?: string;
    design?: "timeline" | "cards";
    preserveOrder?: boolean;
    aiSection?: PortfolioAiSectionConfig;
};

const sortByRecentDate = (left: PortfolioProject, right: PortfolioProject) =>
    (right.endDate || right.startDate).localeCompare(
        left.endDate || left.startDate
    );

type ProjectGroup = {
    projectType: PortfolioProject["projectType"];
    eyebrow: string;
    heading: string;
    description: string;
    icon: typeof Bot;
    accentClass: string;
    badgeClass: string;
    projects: PortfolioProject[];
};

const renderProjectList = (
    projects: PortfolioProject[],
    design: "timeline" | "cards",
    portfolioBasePath: string | undefined
) =>
    design === "timeline" ? (
        <PortfolioTimeline
            projects={projects}
            portfolioBasePath={portfolioBasePath}
        />
    ) : (
        <PortfolioProjectGrid
            projects={projects}
            portfolioBasePath={portfolioBasePath}
        />
    );

const AiProjectSubsection = ({
    projects,
    design,
    portfolioBasePath,
    className = "",
}: {
    projects: PortfolioProject[];
    design: "timeline" | "cards";
    portfolioBasePath?: string;
    className?: string;
}) => (
    <section
        className={`mb-10 ${className}`}
        aria-labelledby="ai-projects-heading"
        data-pdf-block
    >
        <div className="mb-5 rounded-xl border border-violet-500/45 bg-violet-500/8 p-4">
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                        {serverT("AI")}
                    </p>
                    <h3
                        id="ai-projects-heading"
                        className="mt-1 text-2xl font-(--font-display) font-black text-(--color-foreground)"
                    >
                        {serverT("AI 프로젝트")}
                    </h3>
                    <p className="mt-1 text-base leading-relaxed text-(--color-muted)">
                        {serverT(
                            "AI를 도구로 삼아 개발 역량과 문제 해결의 범위를 넓힌 프로젝트"
                        )}
                    </p>
                </div>
            </div>
        </div>
        {renderProjectList(projects, design, portfolioBasePath)}
    </section>
);

const ProjectGroupSection = ({
    group,
    design,
    portfolioBasePath,
    aiProjects,
    aiFirst,
}: {
    group: ProjectGroup;
    design: "timeline" | "cards";
    portfolioBasePath?: string;
    aiProjects: PortfolioProject[];
    aiFirst: boolean;
}) => (
    <section
        aria-labelledby={`${group.eyebrow}-heading`}
        className="scroll-mt-24"
        data-pdf-block
    >
        <div
            className={`mb-7 rounded-2xl border border-l-4 border-(--color-border) ${group.accentClass} tablet:p-6 bg-(--color-surface) p-5`}
            data-pdf-block
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${group.badgeClass}`}
                    >
                        <group.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="mb-1 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                            {serverT(group.eyebrow)}
                        </p>
                        <h2
                            id={`${group.eyebrow}-heading`}
                            className="text-3xl font-(--font-display) font-black tracking-tight text-balance text-(--color-foreground)"
                        >
                            {serverT(group.heading)}
                        </h2>
                        <p className="mt-2 text-base leading-relaxed text-(--color-muted)">
                            {serverT(group.description)}
                        </p>
                    </div>
                </div>
                <span
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${group.badgeClass}`}
                >
                    {serverT("{0}건", [
                        group.projects.length + aiProjects.length,
                    ])}
                </span>
            </div>
        </div>
        {aiProjects.length > 0 && aiFirst && (
            <AiProjectSubsection
                projects={aiProjects}
                design={design}
                portfolioBasePath={portfolioBasePath}
            />
        )}
        {group.projects.length > 0 && (
            <div>
                {aiProjects.length > 0 && (
                    <h3 className="mb-5 text-2xl font-(--font-display) font-black text-(--color-foreground)">
                        {serverT("직무별 프로젝트")}
                    </h3>
                )}
                {renderProjectList(group.projects, design, portfolioBasePath)}
            </div>
        )}
        {aiProjects.length > 0 && !aiFirst && (
            <AiProjectSubsection
                projects={aiProjects}
                design={design}
                portfolioBasePath={portfolioBasePath}
                className="mt-12 border-t border-(--color-border) pt-10"
            />
        )}
    </section>
);

export default function PortfolioView({
    projects,
    portfolioBasePath,
    design = "cards",
    preserveOrder = false,
    aiSection,
}: PortfolioViewProps) {
    if (projects.length === 0) {
        return (
            <p className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) px-5 py-10 text-center text-(--color-muted)">
                {serverT("공개된 프로젝트가 없습니다.")}
            </p>
        );
    }

    const aiConfig = normalizePortfolioAiSectionConfig(aiSection);
    const { aiProjects, jobFieldProjects } = splitPortfolioAiSection(
        projects,
        aiConfig
    );

    const groupedProjects = [
        {
            projectType: "work" as const,
            eyebrow: "경력 및 협업",
            heading: "기업 프로젝트",
            description: "회사·고객사 업무와 협업으로 완성한 프로젝트",
            icon: BriefcaseBusiness,
            accentClass: "border-blue-500",
            badgeClass:
                "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
            projects: jobFieldProjects
                .filter((project) => project.projectType === "work")
                .sort(preserveOrder ? () => 0 : sortByRecentDate),
        },
        {
            projectType: "personal" as const,
            eyebrow: "개인 제작",
            heading: "개인 프로젝트",
            description: "직접 기획·개발·운영하며 확장한 프로젝트",
            icon: UserRound,
            accentClass: "border-purple-500",
            badgeClass:
                "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
            projects: jobFieldProjects
                .filter((project) => project.projectType === "personal")
                .sort(preserveOrder ? () => 0 : sortByRecentDate),
        },
    ];

    const sections = groupedProjects
        .filter(
            (group) =>
                group.projects.length > 0 ||
                aiProjects.some(
                    (project) => project.projectType === group.projectType
                )
        )
        .map((group) => (
            <ProjectGroupSection
                key={group.heading}
                group={group}
                design={design}
                portfolioBasePath={portfolioBasePath}
                aiProjects={aiProjects.filter(
                    (project) => project.projectType === group.projectType
                )}
                aiFirst={aiConfig.takePrecedence}
            />
        ));

    return <div className="space-y-20">{sections}</div>;
}
