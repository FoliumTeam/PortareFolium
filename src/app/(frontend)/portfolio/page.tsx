import type { Metadata } from "next";
import { isAdminSession } from "@/lib/admin-auth";
import { getEffectiveAdminSession } from "@/lib/server-admin";
import PortfolioView from "@/components/PortfolioView";
import PdfExportButton from "@/components/PdfExportButton";
import ProfileSelectionPage from "@/components/ProfileSelectionPage";
import { serverClient } from "@/lib/supabase";
import {
    matchesPortfolioJobField,
    normalizePortfolioProject,
} from "@/lib/portfolio";
import { getPublicPortfolioRow } from "@/lib/portfolio-review";
import { getSiteConfig } from "@/lib/queries";
import type { PortfolioProject, PortfolioRawRow } from "@/types/portfolio";
import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, Star } from "lucide-react";

interface BookItem {
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    rating: number | null;
}

export const revalidate = false;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Portfolio",
    description: "프로젝트 포트폴리오",
};

type PortfolioPageContentProps = {
    jobFieldOverride?: string;
};

export async function PortfolioPageContent({
    jobFieldOverride,
}: PortfolioPageContentProps) {
    const session = await getEffectiveAdminSession();
    const initialAuthed = isAdminSession(session);
    const configRows = await getSiteConfig();
    let jobField =
        jobFieldOverride ?? process.env.NEXT_PUBLIC_JOB_FIELD ?? "game";
    if (serverClient && !jobFieldOverride) {
        const { data: cfg } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_field")
            .single();
        if (cfg?.value) {
            const raw = cfg.value;
            try {
                jobField =
                    typeof raw === "string" && raw.startsWith('"')
                        ? JSON.parse(raw)
                        : raw;
            } catch {
                jobField = "game";
            }
        }
    }
    const githubConfig = configRows.find((row) => row.key === "github_url");
    const githubUrl =
        typeof githubConfig?.value === "string"
            ? githubConfig.value.replace(/^"|"$/g, "")
            : "";
    const portfolioEyebrow =
        jobField === "game"
            ? "Gameplay & Engine Programming"
            : jobField === "web"
              ? "Web Product & Full-Stack Development"
              : "Selected Work";
    const portfolioIntroduction =
        jobField === "web"
            ? "업무 맥락, 개인 책임, 실행 근거와 확인 가능한 결과를 정리했습니다."
            : "플레이 경험을 만든 목표, 개인 책임, 핵심 구현과 검증 결과를 정리했습니다.";
    const portfolioBasePath = jobFieldOverride
        ? `/${jobField}/portfolio`
        : "/portfolio";

    let publicBooks: BookItem[] = [];
    if (serverClient) {
        const { data: booksData } = await serverClient
            .from("books")
            .select("slug, title, author, cover_url, description, rating")
            .eq("published", true)
            .contains("job_field", [jobField])
            .order("order_idx", { ascending: true });
        if (booksData) publicBooks = booksData;
    }

    let publicProjects: PortfolioProject[] = [];

    if (serverClient) {
        const { data: items } = await serverClient
            .from("portfolio_items")
            .select(
                "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, job_field"
            )
            .eq("published", true)
            .order("order_idx", { ascending: true });

        if (items) {
            publicProjects = items
                .map((item) => getPublicPortfolioRow(item as PortfolioRawRow))
                .filter((item): item is PortfolioRawRow => item !== null)
                .map((item) => normalizePortfolioProject(item))
                .filter((project) =>
                    matchesPortfolioJobField(project, jobField)
                );
        }
    }

    return (
        <PdfExportButton
            fileName="portfolio"
            initialAuthed={initialAuthed}
            sections={[
                {
                    key: "books",
                    label: "Books 섹션 포함",
                    defaultIncluded: false,
                },
            ]}
        >
            <div>
                <header className="mb-12 max-w-3xl" data-pdf-block>
                    <p className="mb-3 text-xs font-bold tracking-[0.2em] text-(--color-accent) uppercase">
                        {portfolioEyebrow}
                    </p>
                    <h1 className="tablet:text-5xl text-4xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                        Portfolio
                    </h1>
                    <p className="mt-4 text-lg leading-relaxed text-(--color-muted)">
                        {portfolioIntroduction}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <Link
                            href={
                                jobFieldOverride
                                    ? `/${jobField}/resume`
                                    : "/resume"
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-bold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            Resume
                        </Link>
                        {githubUrl && (
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                GitHub
                                <ArrowUpRight
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            </a>
                        )}
                        {!jobFieldOverride && (
                            <Link
                                href="/about"
                                className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                Contact
                                <ArrowUpRight
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        )}
                    </div>
                </header>
                <PortfolioView
                    projects={publicProjects}
                    portfolioBasePath={portfolioBasePath}
                    jobField={jobField}
                />

                {publicBooks.length > 0 && (
                    <div data-pdf-section="books">
                        <div className="my-12 h-px bg-(--color-border)" />
                        <section data-pdf-block>
                            <h2 className="mb-6 flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                <BookOpen
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                Books
                            </h2>
                            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-5">
                                {publicBooks.map((book) => (
                                    <Link
                                        key={book.slug}
                                        href={`/books/${book.slug}`}
                                        data-pdf-block
                                        className="card-lift group flex items-start gap-4 overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                                    >
                                        {book.cover_url ? (
                                            <img
                                                src={book.cover_url}
                                                alt=""
                                                width={64}
                                                height={90}
                                                className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-(--color-border)">
                                                <BookOpen
                                                    className="h-6 w-6 text-(--color-muted)"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="mb-1 font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                                {book.title}
                                            </p>
                                            {book.author && (
                                                <p className="mb-2 text-sm text-(--color-muted)">
                                                    {book.author}
                                                </p>
                                            )}
                                            {book.rating && (
                                                <div className="mb-2 flex items-center gap-0.5">
                                                    {Array.from({
                                                        length: 5,
                                                    }).map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`h-3.5 w-3.5 ${i < book.rating! ? "fill-(--color-accent) text-(--color-accent)" : "text-(--color-border)"}`}
                                                            aria-hidden="true"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {book.description && (
                                                <p className="line-clamp-2 text-sm text-(--color-muted)">
                                                    {book.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </PdfExportButton>
    );
}

export default async function PortfolioPage() {
    return <ProfileSelectionPage content="portfolio" />;
}
