import { serverT } from "@/lib/server-i18n";
import { Search } from "lucide-react";
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
            className="resume-award-media mb-10"
            data-pdf-block={dataPdfBlock ? true : undefined}
        >
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {serverT(label)}
            </h2>
            <div className="space-y-4">
                {awards.map((award, index) => {
                    const { title, position } = splitAwardTitle(award);
                    const image =
                        award.image || "/images/sample-award-certificate.png";

                    return (
                        <article
                            key={`${award.title ?? "award"}-${award.date ?? "date"}-${index}`}
                            className="flex min-w-0 items-start gap-5 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                            data-pdf-block-item={
                                dataPdfBlock ? true : undefined
                            }
                        >
                            <div className="group relative aspect-[210/297] w-16 shrink-0 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface)">
                                <img
                                    src={image}
                                    alt={
                                        award.image
                                            ? serverT("{0} 증서", [
                                                  title || { text: "수상" },
                                              ])
                                            : serverT("수상 증서 예시")
                                    }
                                    width={210}
                                    height={297}
                                    className="h-full w-full object-cover"
                                />
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/55 group-hover:opacity-100">
                                    <Search
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                    />
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                {title ? (
                                    <h3 className="m-0 text-lg leading-snug font-bold text-(--color-foreground)">
                                        {title}
                                    </h3>
                                ) : null}
                                <EducationMetadata
                                    items={[
                                        position,
                                        award.awarder,
                                        award.date,
                                    ]}
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
