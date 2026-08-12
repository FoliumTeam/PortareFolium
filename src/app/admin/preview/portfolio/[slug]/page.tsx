import { notFound } from "next/navigation";
import { PortfolioDetailContent } from "@/app/(frontend)/portfolio/[slug]/page";
import ContentWrapper from "@/components/ContentWrapper";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import type { PortfolioRawRow } from "@/types/portfolio";

type PageProps = {
    params: Promise<{ slug: string }>;
};

/** 관리자 세션에서만 현재 Portfolio를 미리보기로 렌더한다. */
export default async function PortfolioPreviewPage({ params }: PageProps) {
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
    return (
        <ContentWrapper
            width="wide"
            className="tablet:px-6 laptop:px-8 space-y-8 px-4 py-8"
        >
            <section className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                            Admin preview
                        </p>
                        <h1 className="mt-1 text-xl font-bold text-(--color-foreground)">
                            현재 저장본 미리보기
                        </h1>
                    </div>
                </div>
            </section>
            <PortfolioDetailContent
                slug={slug}
                itemOverride={row}
                portfolioBasePath="/admin#portfolio"
                preview
            />
        </ContentWrapper>
    );
}
