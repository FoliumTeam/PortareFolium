import { notFound } from "next/navigation";
import { PortfolioDetailContent } from "@/app/(frontend)/portfolio/[slug]/page";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    getPortfolioReview,
    getPortfolioReviewDiff,
    getPortfolioReviewStatusLabel,
} from "@/lib/portfolio-review";
import type { PortfolioRawRow } from "@/types/portfolio";

type PageProps = {
    params: Promise<{ slug: string }>;
};

/** 관리자 세션에서만 현재 Draft와 공개본 차이를 함께 렌더한다. */
export default async function PortfolioDraftPreviewPage({ params }: PageProps) {
    await requireAdminSession();
    const { slug } = await params;
    if (!serverClient) notFound();

    const { data } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .single();
    if (!data) notFound();

    const row = data as PortfolioRawRow;
    const review = getPortfolioReview(row.data);
    const diff = getPortfolioReviewDiff(row);

    return (
        <div className="space-y-8">
            <section className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                            Review workflow
                        </p>
                        <h1 className="mt-1 text-xl font-bold text-(--color-foreground)">
                            {getPortfolioReviewStatusLabel(review.status)}
                        </h1>
                    </div>
                    <p className="text-sm text-(--color-muted)">
                        승인 이력 {review.history.length}건
                    </p>
                </div>
                {diff.length > 0 && (
                    <div className="mt-5">
                        <h2 className="text-sm font-bold text-(--color-foreground)">
                            마지막 공개본과의 차이
                        </h2>
                        <ul className="mt-3 space-y-2 text-sm text-(--color-muted)">
                            {diff.map((entry) => (
                                <li key={entry.label}>
                                    <span className="font-semibold text-(--color-foreground)">
                                        {entry.label}
                                    </span>{" "}
                                    {entry.previous} → {entry.current}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {review.history.length > 0 && (
                    <ol className="mt-5 space-y-1 text-xs text-(--color-muted)">
                        {review.history.map((event, index) => (
                            <li key={`${event.at}-${index}`}>
                                {event.at.slice(0, 16).replace("T", " ")} ·{" "}
                                {getPortfolioReviewStatusLabel(event.status)}
                            </li>
                        ))}
                    </ol>
                )}
            </section>
            <PortfolioDetailContent
                slug={slug}
                itemOverride={row}
                portfolioBasePath="/admin#portfolio"
                preview
            />
        </div>
    );
}
