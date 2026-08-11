import PortfolioProjectCard from "@/components/portfolio/PortfolioProjectCard";
import type { PortfolioProject } from "@/types/portfolio";

type PortfolioProjectGridProps = {
    projects: PortfolioProject[];
    featuredLayout?: boolean;
    portfolioBasePath?: string;
};

export default function PortfolioProjectGrid({
    projects,
    featuredLayout = false,
    portfolioBasePath,
}: PortfolioProjectGridProps) {
    return (
        <div className="tablet:grid-cols-2 grid min-w-0 grid-cols-1 gap-5">
            {projects.map((project, index) => (
                <PortfolioProjectCard
                    key={project.slug}
                    project={project}
                    priority={index < 2}
                    prominent={featuredLayout && index === 0}
                    portfolioBasePath={portfolioBasePath}
                />
            ))}
        </div>
    );
}
