import type { Metadata } from "next";
import PortfolioView from "@/components/PortfolioView";
import { serverClient } from "@/lib/supabase";
import type { PortfolioProject } from "@/types/portfolio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Portfolio",
    description: "프로젝트 포트폴리오",
};

export default async function PortfolioPage() {
    let portfolioViewMode: "list" | "block" | undefined = undefined;
    if (serverClient) {
        const { data: vmCfg } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "portfolio_view_mode")
            .single();
        if (vmCfg?.value === "list" || vmCfg?.value === "block") {
            portfolioViewMode = vmCfg.value;
        }
    }

    let jobField = process.env.NEXT_PUBLIC_JOB_FIELD ?? "game";
    if (serverClient) {
        const { data: cfg } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_field")
            .single();
        if (cfg?.value) {
            const raw = cfg.value;
            jobField =
                typeof raw === "string" && raw.startsWith('"')
                    ? JSON.parse(raw)
                    : raw;
        }
    }

    function matchesJobField(jf: string | string[] | undefined): boolean {
        if (jf == null) return true;
        if (Array.isArray(jf)) return jf.includes(jobField);
        return jf === jobField;
    }

    let publicProjects: PortfolioProject[] = [];

    if (serverClient) {
        const { data: items } = await serverClient
            .from("portfolio_items")
            .select(
                "slug, title, description, tags, thumbnail, data, published"
            )
            .eq("published", true)
            .order("order_idx", { ascending: true });

        if (items) {
            publicProjects = items
                .map((item): PortfolioProject => {
                    const d = item.data ?? {};
                    return {
                        slug: item.slug,
                        title: item.title,
                        description: item.description ?? "",
                        startDate: d.startDate,
                        endDate: d.endDate,
                        goal: d.goal,
                        role: d.role,
                        teamSize: d.teamSize,
                        accomplishments: d.accomplishments ?? [],
                        keywords: item.tags ?? [],
                        github: d.github ?? "",
                        public: true,
                        jobField: d.jobField,
                        thumbnail: item.thumbnail,
                        badges: d.badges,
                    };
                })
                .filter((p) => matchesJobField(p.jobField))
                .sort((a, b) =>
                    (b.startDate ?? "").localeCompare(a.startDate ?? "")
                );
        }
    }

    return (
        <div className="max-w-4xl">
            <h1 className="mb-2 text-3xl font-bold text-(--color-foreground)">
                Portfolio
            </h1>
            <p className="mb-8 text-(--color-muted)">
                프로젝트 목록입니다. List는 상세 정보를 한 화면에, Block은 카드
                그리드로 보기입니다.
            </p>

            <PortfolioView
                projects={publicProjects}
                forcedViewMode={portfolioViewMode}
            />
        </div>
    );
}
