import type { TocEntry } from "@/lib/toc";

export default function GithubToc({ entries }: { entries: TocEntry[] }) {
    if (!entries || entries.length === 0) return null;

    return (
        <nav
            className="github-toc mb-8 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 text-[0.9rem]"
            aria-label="목차"
        >
            <details open>
                <summary className="cursor-pointer list-none py-1 font-semibold text-(--color-foreground) before:mr-1 before:inline-block before:text-[0.7em] before:transition-transform before:content-['▶'] open:before:rotate-90">
                    목차
                </summary>
                <ol className="mt-2 ml-5 space-y-0.5">
                    {entries.map((entry) => (
                        <li key={entry.slug} className="my-0.5">
                            <a
                                href={`#${entry.slug}`}
                                className="leading-relaxed text-(--color-accent) no-underline hover:underline"
                            >
                                {entry.text}
                            </a>
                            {entry.children.length > 0 && (
                                <ol className="mt-1 ml-5 space-y-0.5">
                                    {entry.children.map((child) => (
                                        <li key={child.slug}>
                                            <a
                                                href={`#${child.slug}`}
                                                className="leading-relaxed text-(--color-accent) no-underline hover:underline"
                                            >
                                                {child.text}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </li>
                    ))}
                </ol>
            </details>
        </nav>
    );
}
