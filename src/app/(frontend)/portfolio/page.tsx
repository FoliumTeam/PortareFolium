import type { Metadata } from "next";
import PortfolioView from "@/components/PortfolioView";
import PdfExportButton from "@/components/PdfExportButton";
import { serverClient } from "@/lib/supabase";
import type { PortfolioProject } from "@/types/portfolio";
import Link from "next/link";
import { BookOpen, Star } from "lucide-react";

interface BookItem {
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    rating: number | null;
}

export const revalidate = false;

export const metadata: Metadata = {
    title: "Portfolio",
    description: "프로젝트 포트폴리오",
};

export default async function PortfolioPage() {
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
        <PdfExportButton fileName="portfolio">
            <div className="mx-auto max-w-4xl">
                <h1 className="mb-8 text-3xl font-bold text-(--color-foreground)">
                    Portfolio
                </h1>
                <PortfolioView projects={publicProjects} />

                {publicBooks.length > 0 && (
                    <>
                        <div className="my-12 h-px bg-(--color-border)" />
                        <section>
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
                    </>
                )}
            </div>
        </PdfExportButton>
    );
}
