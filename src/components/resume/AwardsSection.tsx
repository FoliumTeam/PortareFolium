import type { ResumeAward } from "@/types/resume";

type AwardsSectionProps = {
    awards: ResumeAward[];
    label: string;
    dataPdfBlock?: boolean;
};

export default function AwardsSection({
    awards,
    label,
    dataPdfBlock = false,
}: AwardsSectionProps) {
    if (awards.length === 0) return null;

    return (
        <section
            className="mb-10"
            data-pdf-block={dataPdfBlock ? true : undefined}
        >
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {label}
            </h2>
            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                {awards.map((award, index) => (
                    <article
                        key={`${award.title ?? "award"}-${index}`}
                        className="flex min-w-0 gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                        data-pdf-block-item={dataPdfBlock ? true : undefined}
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent)/12 text-sm font-black text-(--color-accent)">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                {award.title ? (
                                    <h3 className="m-0 text-lg leading-snug font-bold text-(--color-foreground)">
                                        {award.title}
                                    </h3>
                                ) : null}
                                {award.date ? (
                                    <time className="shrink-0 text-sm font-semibold text-(--color-muted) tabular-nums">
                                        {award.date}
                                    </time>
                                ) : null}
                            </div>
                            {award.awarder ? (
                                <p className="mt-1 text-base font-semibold text-(--color-muted)">
                                    {award.awarder}
                                </p>
                            ) : null}
                            {award.summary ? (
                                <p className="mt-4 border-l-2 border-(--color-accent)/45 pl-4 text-base leading-7 text-(--color-foreground)">
                                    {award.summary}
                                </p>
                            ) : null}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
