import { serverT } from "@/lib/server-i18n";
import type { TocEntry } from "@/lib/toc";

export default function GithubToc({ entries }: { entries: TocEntry[] }) {
    if (!entries || entries.length === 0) return null;

    return (
        <nav
            className="github-toc mb-8 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 text-[0.9rem]"
            aria-label={serverT("목차")}
        >
            <details open className="github-toc-details">
                <summary className="github-toc-summary flex cursor-pointer items-center gap-2 py-1 font-semibold text-(--color-foreground)">
                    <svg
                        className="github-toc-arrow shrink-0 text-(--color-muted)"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                    <span>{serverT("목차")}</span>
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
