import type { ResumeAward } from "@/types/resume";
import EducationMetadata from "@/components/resume/EducationMetadata";

type AwardsSectionProps = {
    awards: ResumeAward[];
    label: string;
    dataPdfBlock?: boolean;
};

const splitAwardTitle = (award: ResumeAward) => {
    if (award.position?.trim()) {
        return { title: award.title, position: award.position };
    }

    const separatorIndex = award.title?.lastIndexOf(" - ") ?? -1;
    return separatorIndex > 0
        ? {
              title: award.title?.slice(0, separatorIndex),
              position: award.title?.slice(separatorIndex + 3),
          }
        : { title: award.title, position: undefined };
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
            <div className="space-y-4">
                {awards.map((award, index) => {
                    const { title, position } = splitAwardTitle(award);

                    return (
                        <article
                            key={`${award.title ?? "award"}-${award.date ?? "date"}-${index}`}
                            className="flex min-w-0 items-start gap-5 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                            data-pdf-block-item={
                                dataPdfBlock ? true : undefined
                            }
                        >
                            <div className="aspect-[210/297] w-16 shrink-0 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface)">
                                <img
                                    src="/images/sample-award-certificate.png"
                                    alt=""
                                    width={210}
                                    height={297}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                    {title ? (
                                        <h3 className="m-0 text-lg leading-snug font-bold text-(--color-foreground)">
                                            {title}
                                        </h3>
                                    ) : null}
                                    {award.date ? (
                                        <time className="shrink-0 text-sm font-semibold text-(--color-muted) tabular-nums">
                                            {award.date}
                                        </time>
                                    ) : null}
                                </div>
                                <EducationMetadata
                                    items={[position, award.awarder]}
                                />
                                {award.summary ? (
                                    <p className="mt-4 border-l-2 border-(--color-accent)/45 pl-4 text-base leading-7 text-(--color-foreground)">
                                        {award.summary}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
