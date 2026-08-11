import PortfolioProjectGrid from "@/components/portfolio/PortfolioProjectGrid";
import { groupPortfolioProjects } from "@/lib/portfolio";
import type { PortfolioProject } from "@/types/portfolio";

type PortfolioViewProps = {
    projects: PortfolioProject[];
    portfolioBasePath?: string;
};

export default function PortfolioView({
    projects,
    portfolioBasePath,
}: PortfolioViewProps) {
    const { selected, other } = groupPortfolioProjects(projects);

    if (selected.length === 0 && other.length === 0) {
        return (
            <p className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) px-5 py-10 text-center text-(--color-muted)">
                공개된 프로젝트가 없습니다.
            </p>
        );
    }

    return (
        <div className="space-y-14">
            {selected.length > 0 && (
                <section aria-labelledby="selected-work-heading" data-pdf-block>
                    <div className="mb-6 max-w-2xl">
                        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                            Selected Work
                        </p>
                        <h2
                            id="selected-work-heading"
                            className="text-2xl font-(--font-display) font-black tracking-tight text-(--color-foreground)"
                        >
                            가장 강한 결과와 기여
                        </h2>
                    </div>
                    <PortfolioProjectGrid
                        projects={selected}
                        featuredLayout
                        portfolioBasePath={portfolioBasePath}
                    />
                </section>
            )}

            {other.length > 0 && (
                <section aria-labelledby="other-work-heading" data-pdf-block>
                    <div className="mb-6 max-w-2xl">
                        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-(--color-muted) uppercase">
                            Other Work
                        </p>
                        <h2
                            id="other-work-heading"
                            className="text-2xl font-(--font-display) font-black tracking-tight text-(--color-foreground)"
                        >
                            추가 프로젝트와 실험
                        </h2>
                    </div>
                    <PortfolioProjectGrid
                        projects={other}
                        portfolioBasePath={portfolioBasePath}
                    />
                </section>
            )}
        </div>
    );
}
