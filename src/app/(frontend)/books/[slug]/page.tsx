import { redirect } from "next/navigation";
import { getBook, getBookMeta, getAllBookSlugs } from "@/lib/queries";
import { getCachedMarkdown } from "@/lib/markdown";
import { extractTocFromHtml } from "@/lib/toc";
import TableOfContents from "@/components/TableOfContents";
import MermaidRenderer from "@/components/MermaidRenderer";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
    return getAllBookSlugs();
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const book = await getBookMeta(slug);
    if (!book) return {};
    return {
        title: book.meta_title || `${book.title} - Books`,
        description: book.meta_description || book.description || undefined,
        openGraph:
            book.og_image || book.cover_url
                ? { images: [book.og_image || book.cover_url] }
                : undefined,
    };
}

export default async function BookDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const book = await getBook(slug);
    if (!book) redirect("/portfolio");

    const contentHtml = await getCachedMarkdown(slug, book.content ?? "");
    const tocEntries = extractTocFromHtml(contentHtml);

    return (
        <div className="mx-auto flex max-w-5xl gap-12">
            <article className="max-w-3xl min-w-0 flex-1">
                <Link
                    href="/portfolio"
                    className="mb-8 inline-flex items-center gap-2 rounded-xl border border-(--color-border) px-4 py-2 text-sm font-medium text-(--color-muted) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio 목록
                </Link>

                <header className="mb-8 flex gap-6">
                    {book.cover_url ? (
                        <img
                            src={book.cover_url}
                            alt=""
                            width={120}
                            height={180}
                            loading="eager"
                            decoding="async"
                            className="h-44 w-[7.5rem] shrink-0 rounded-xl border border-(--color-border) object-cover shadow-md"
                        />
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <h1 className="tablet:text-4xl mb-2 text-3xl font-black tracking-tight text-(--color-foreground)">
                            {book.title}
                        </h1>
                        {book.author && (
                            <p className="mb-4 text-base text-(--color-muted)">
                                {book.author}
                            </p>
                        )}
                        {book.rating && (
                            <div className="mb-4 flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${i < book.rating! ? "fill-(--color-accent) text-(--color-accent)" : "text-(--color-border)"}`}
                                        aria-hidden="true"
                                    />
                                ))}
                                <span className="ml-1 text-sm text-(--color-muted)">
                                    {book.rating} / 5
                                </span>
                            </div>
                        )}
                        {book.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {book.tags.map((tag: string) => (
                                    <span
                                        key={tag}
                                        className="rounded-lg bg-(--color-tag-bg) px-3 py-1 text-xs font-medium text-(--color-tag-fg)"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {book.description && (
                    <p className="mb-8 text-lg leading-relaxed text-(--color-muted)">
                        {book.description}
                    </p>
                )}

                {contentHtml && (
                    <div className="mb-10 h-px bg-(--color-border)" />
                )}

                <div
                    className="book-markdoc-body prose max-w-none text-(--color-foreground)"
                    data-content="true"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
            </article>
            <TableOfContents
                entries={tocEntries}
                contentSelector=".book-markdoc-body"
            />
            <MermaidRenderer selector=".book-markdoc-body" label="book slug" />
        </div>
    );
}
