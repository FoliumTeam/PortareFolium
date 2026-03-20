import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase";
import type { PortfolioProject } from "@/types/portfolio";
import { renderMarkdown } from "@/lib/markdown";
import { extractTocFromHtml } from "@/lib/toc";
import TableOfContents from "@/components/TableOfContents";
import MermaidRenderer from "@/components/MermaidRenderer";
import { ArrowLeft, Github, ExternalLink, BookOpen, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    if (!serverClient) return {};
    const { data: item } = await serverClient
        .from("portfolio_items")
        .select(
            "title, meta_title, meta_description, og_image, description, thumbnail"
        )
        .eq("slug", slug)
        .single();
    if (!item) return {};
    return {
        title: item.meta_title || `${item.title} - Portfolio`,
        description: item.meta_description || item.description || undefined,
        openGraph:
            item.og_image || item.thumbnail
                ? { images: [item.og_image || item.thumbnail] }
                : undefined,
    };
}

interface BookItem {
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    rating: number | null;
}

export default async function PortfolioDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    if (!serverClient) redirect("/portfolio");

    const { data: item } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!item) redirect("/portfolio");

    const d = item.data ?? {};
    const project: PortfolioProject = {
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

    const contentHtml = await renderMarkdown(item.content ?? "");
    const tocEntries = extractTocFromHtml(contentHtml);

    const projectJobFields = Array.isArray(project.jobField)
        ? project.jobField
        : project.jobField
          ? [project.jobField]
          : [];

    let relatedBooks: BookItem[] = [];
    if (serverClient && projectJobFields.length > 0) {
        const { data: booksData } = await serverClient
            .from("books")
            .select("slug, title, author, cover_url, description, rating")
            .eq("published", true)
            .overlaps("job_field", projectJobFields)
            .order("order_idx", { ascending: true });
        if (booksData) relatedBooks = booksData;
    }

    return (
        <div className="mx-auto flex max-w-5xl gap-12">
            <article className="max-w-3xl min-w-0 flex-1">
                <Link
                    href="/portfolio"
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-muted) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio 목록
                </Link>

                {project.thumbnail ? (
                    <div className="mb-10 aspect-video overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)">
                        <img
                            src={project.thumbnail}
                            alt=""
                            width={768}
                            height={432}
                            loading="eager"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
                    </div>
                ) : null}

                <header className="mb-8">
                    <h1 className="tablet:text-4xl mb-4 text-3xl font-black tracking-tight text-(--color-foreground)">
                        {project.title}
                    </h1>
                    <p className="mb-5 text-lg leading-relaxed text-(--color-muted)">
                        {project.description}
                    </p>
                    {project.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {project.keywords.map((k) => (
                                <span
                                    key={k}
                                    className="rounded-full bg-(--color-tag-bg) px-3 py-1 text-xs font-medium text-(--color-tag-fg)"
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </header>

                <dl className="tablet:grid-cols-3 mb-8 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <dt className="mb-1 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            기간
                        </dt>
                        <dd className="text-sm font-semibold text-(--color-foreground)">
                            {project.startDate} &mdash; {project.endDate}
                        </dd>
                    </div>
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <dt className="mb-1 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            역할
                        </dt>
                        <dd className="text-sm font-semibold text-(--color-foreground)">
                            {project.role}
                        </dd>
                    </div>
                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                        <dt className="mb-1 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            참여 인원
                        </dt>
                        <dd className="text-sm font-semibold text-(--color-foreground)">
                            {project.teamSize}명
                        </dd>
                    </div>
                    {project.goal && (
                        <div className="tablet:col-span-3 col-span-2 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                            <dt className="mb-1 text-[10px] font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                목표
                            </dt>
                            <dd className="text-sm font-semibold text-(--color-foreground)">
                                {project.goal}
                            </dd>
                        </div>
                    )}
                </dl>

                {project.accomplishments.length > 0 ? (
                    <section className="mb-8 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            성과
                        </h2>
                        <ul className="space-y-2.5">
                            {project.accomplishments.map((a, idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start gap-2.5 text-sm text-(--color-foreground)"
                                >
                                    <span
                                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    <span className="leading-relaxed">{a}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {project.badges?.length ? (
                    <section className="mb-8">
                        <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                            수상 &middot; 출시
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {project.badges.map((b, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-subtle) px-4 py-2 text-sm font-medium text-(--color-foreground)"
                                >
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-(--color-accent)"
                                        aria-hidden="true"
                                    />
                                    {b.text}
                                </span>
                            ))}
                        </div>
                    </section>
                ) : null}

                {project.github ? (
                    <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-8 inline-flex items-center gap-2 rounded-full border border-(--color-border) px-5 py-2.5 text-sm font-medium text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                    >
                        <Github className="h-4 w-4" aria-hidden="true" />
                        GitHub 저장소
                        <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                    </a>
                ) : null}

                {contentHtml && (
                    <div className="mb-10 h-px bg-(--color-border)" />
                )}

                <div
                    className="portfolio-markdoc-body prose max-w-none text-(--color-foreground)"
                    data-content="true"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {relatedBooks.length > 0 && (
                    <>
                        <div className="my-12 h-px bg-(--color-border)" />
                        <section>
                            <h2 className="mb-6 flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                <BookOpen
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                                관련 도서
                            </h2>
                            <ul className="space-y-4">
                                {relatedBooks.map((book) => (
                                    <li key={book.slug}>
                                        <Link
                                            href={`/books/${book.slug}`}
                                            className="group flex items-start gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4 transition-colors hover:border-(--color-accent)"
                                        >
                                            {book.cover_url ? (
                                                <img
                                                    src={book.cover_url}
                                                    alt=""
                                                    width={56}
                                                    height={80}
                                                    className="h-20 w-14 shrink-0 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-(--color-border)">
                                                    <BookOpen
                                                        className="h-6 w-6 text-(--color-muted)"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="mb-1 font-semibold text-(--color-foreground) group-hover:text-(--color-accent)">
                                                    {book.title}
                                                </p>
                                                {book.author && (
                                                    <p className="mb-2 text-sm text-(--color-muted)">
                                                        {book.author}
                                                    </p>
                                                )}
                                                {book.rating && (
                                                    <div className="flex items-center gap-0.5">
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
                                                    <p className="mt-2 line-clamp-2 text-sm text-(--color-muted)">
                                                        {book.description}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </>
                )}
            </article>
            <TableOfContents
                entries={tocEntries}
                contentSelector=".portfolio-markdoc-body"
            />
            <MermaidRenderer
                selector=".portfolio-markdoc-body"
                label="portfolio slug"
            />
        </div>
    );
}
