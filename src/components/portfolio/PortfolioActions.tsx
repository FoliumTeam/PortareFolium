import Link from "next/link";
import {
    ArrowUpRight,
    Code2,
    Gamepad2,
    PackageCheck,
    Play,
} from "lucide-react";
import type { PortfolioLink } from "@/types/portfolio";

type PortfolioActionsProps = {
    slug?: string;
    links: PortfolioLink[];
    className?: string;
    portfolioBasePath?: string;
};

const actionIcon = {
    demo: Play,
    play: Gamepad2,
    release: PackageCheck,
    source: Code2,
} as const;

const actionLabel = {
    demo: "시연 보기",
    play: "플레이하기",
    release: "결과물 보기",
    source: "소스 보기",
} as const;

const focusClass =
    "focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface) focus-visible:outline-none";

export default function PortfolioActions({
    slug,
    links,
    className = "",
    portfolioBasePath = "/portfolio",
}: PortfolioActionsProps) {
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {slug && (
                <Link
                    href={`${portfolioBasePath}/${slug}`}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-bold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 ${focusClass}`}
                >
                    프로젝트 기록 보기
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            )}
            {links.map((link) => {
                const Icon = actionIcon[link.kind];
                const className = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent) ${focusClass}`;
                const content = (
                    <>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {actionLabel[link.kind]}
                        <ArrowUpRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                    </>
                );
                return link.url.startsWith("/") ? (
                    <Link
                        key={`${link.kind}-${link.url}`}
                        href={link.url}
                        className={className}
                    >
                        {content}
                    </Link>
                ) : (
                    <a
                        key={`${link.kind}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                    >
                        {content}
                    </a>
                );
            })}
        </div>
    );
}
