"use client";

import type { Resume } from "@/types/resume";
import { defaultSectionLabels } from "@/types/resume";
import type { CoreValue } from "@/types/about";
import {
    resolveSectionOrder,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";

interface Props {
    resume: Resume;
    coreCompetencies?: CoreValue[];
    sectionLayout?: ResumeSectionLayout;
}

const formatDateRange = (
    startDate?: string,
    endDate?: string,
    hideDays?: boolean
): string => {
    const fmt = (d?: string) => (d && hideDays ? d.slice(0, 7) : d || "");
    return `${fmt(startDate)} ~ ${fmt(endDate) || "Present"}`;
};

// Layout editor 전용 sync preview — markdown 렌더링, portfolio fetch 스킵
export default function ResumeClassicPreview({
    resume,
    coreCompetencies = [],
    sectionLayout,
}: Props) {
    const basics = resume.basics ?? {};
    const resolvedOrder = resolveSectionOrder(resume, sectionLayout);

    const getLabel = (key: string) => {
        const sec = (resume as Record<string, unknown>)[key] as
            | { emoji?: string; showEmoji?: boolean }
            | undefined;
        const emoji = sec?.emoji || "➕";
        const label =
            defaultSectionLabels[key] ||
            key.charAt(0).toUpperCase() + key.slice(1);
        const showEmoji = sec?.showEmoji === true;
        return showEmoji ? `${emoji} ${label}` : label;
    };

    const sectionH2 = (title: string) => (
        <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
            {title}
        </h2>
    );

    const renderCoreCompetencies = () => (
        <section key="coreCompetencies" className="mb-10">
            {sectionH2(getLabel("coreCompetencies"))}
            <div className="grid grid-cols-1 gap-4">
                {coreCompetencies.map((comp, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-5 py-4"
                    >
                        <div className="mb-1.5 flex items-center gap-2.5">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                {idx + 1}
                            </span>
                            <h3 className="m-0 text-base font-bold text-(--color-foreground)">
                                {comp.title}
                            </h3>
                        </div>
                        {comp.description && (
                            <p className="m-0 text-sm text-(--color-muted)">
                                {comp.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderCareerPhases = () => {
        const phases = resume.careerPhases?.entries ?? [];
        if (phases.length === 0) return null;
        return (
            <section key="careerPhases" className="mb-10">
                {sectionH2(getLabel("careerPhases"))}
                <div className="flex flex-col gap-3">
                    {phases.map((phase, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        >
                            <p className="mb-0.5 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                                PHASE {phase.phase}
                            </p>
                            {phase.name ? (
                                <h3 className="mb-1 text-base font-bold text-(--color-foreground)">
                                    {phase.name}
                                </h3>
                            ) : null}
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderWork = () => (
        <section key="work" className="mb-10">
            {sectionH2(getLabel("work"))}
            {(resume.work?.entries ?? []).map((w, wIdx) => (
                <div
                    key={wIdx}
                    className="mb-7 border-b border-(--color-border) pb-7 last:mb-0 last:border-b-0 last:pb-0"
                >
                    <div className="mb-2">
                        {w.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {w.name}
                            </h3>
                        ) : null}
                        {w.position ? (
                            <div className="mb-0.5 text-base text-(--color-muted)">
                                {w.position}
                            </div>
                        ) : null}
                        {(w.startDate || w.endDate) && (
                            <div className="text-sm text-(--color-muted)">
                                {formatDateRange(
                                    w.startDate,
                                    w.endDate,
                                    w.hideDays
                                )}
                            </div>
                        )}
                    </div>
                    {w.summary ? (
                        <p className="my-2 text-base text-(--color-foreground)">
                            {w.summary}
                        </p>
                    ) : null}
                </div>
            ))}
        </section>
    );

    const renderEducation = () => (
        <section key="education" className="mb-10">
            {sectionH2(getLabel("education"))}
            {(resume.education?.entries ?? []).map((edu, idx) => (
                <div
                    key={idx}
                    className="mb-5 border-b border-(--color-border) pb-5 last:mb-0 last:border-b-0 last:pb-0"
                >
                    {edu.institution ? (
                        <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                            {edu.institution}
                        </h3>
                    ) : null}
                    {(edu.studyType || edu.area) && (
                        <div className="mb-0.5 text-base text-(--color-muted)">
                            {`${edu.studyType || ""} ${edu.area ? " " + edu.area : ""}`}
                        </div>
                    )}
                    {(edu.startDate || edu.endDate) && (
                        <div className="text-sm text-(--color-muted)">
                            {formatDateRange(edu.startDate, edu.endDate)}
                        </div>
                    )}
                </div>
            ))}
        </section>
    );

    const renderSkills = () => (
        <section key="skills" className="mb-10">
            {sectionH2(getLabel("skills"))}
            <div className="flex flex-col gap-3">
                {(resume.skills?.entries ?? []).map((skill, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                        {skill.name ? (
                            <strong className="text-base font-bold text-(--color-foreground)">
                                {skill.name}
                            </strong>
                        ) : null}
                        {skill.keywords && skill.keywords.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {skill.keywords.map((kw, kIdx) => (
                                    <span
                                        key={kIdx}
                                        className="inline-block rounded bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
                                    >
                                        {kw.name}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderProjects = () => (
        <section key="projects" className="mb-10">
            {sectionH2(getLabel("projects"))}
            <div className="flex flex-col gap-4">
                {(resume.projects?.entries ?? []).map((p, idx) => (
                    <div
                        key={idx}
                        className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                    >
                        {p.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {p.name}
                            </h3>
                        ) : null}
                        {p.description ? (
                            <p className="text-base text-(--color-foreground)">
                                {p.description}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderGeneric = (key: string, items: Record<string, unknown>[]) => (
        <section key={key} className="mb-10">
            {sectionH2(getLabel(key))}
            {items.map((item, idx) => {
                const title =
                    (item.name as string) ||
                    (item.title as string) ||
                    (item.organization as string) ||
                    (item.language as string) ||
                    "";
                const subtitle =
                    (item.position as string) ||
                    (item.awarder as string) ||
                    (item.issuer as string) ||
                    (item.publisher as string) ||
                    (item.fluency as string) ||
                    "";
                const date =
                    (item.startDate as string) ||
                    (item.date as string) ||
                    (item.releaseDate as string) ||
                    "";
                const body =
                    (item.summary as string) ||
                    (item.description as string) ||
                    (item.reference as string) ||
                    "";
                return (
                    <div
                        key={idx}
                        className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                    >
                        {title ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {title}
                            </h3>
                        ) : null}
                        {subtitle ? (
                            <div className="mb-0.5 text-base text-(--color-muted)">
                                {subtitle}
                            </div>
                        ) : null}
                        {date ? (
                            <div className="mb-1 text-sm text-(--color-muted)">
                                {date}
                            </div>
                        ) : null}
                        {body ? (
                            <p className="text-base text-(--color-foreground)">
                                {body}
                            </p>
                        ) : null}
                    </div>
                );
            })}
        </section>
    );

    const rendererMap: Record<string, () => React.ReactNode> = {
        coreCompetencies: renderCoreCompetencies,
        careerPhases: renderCareerPhases,
        skills: renderSkills,
        work: renderWork,
        education: renderEducation,
        projects: renderProjects,
        volunteer: () =>
            renderGeneric(
                "volunteer",
                (resume.volunteer?.entries ?? []) as Record<string, unknown>[]
            ),
        awards: () =>
            renderGeneric(
                "awards",
                (resume.awards?.entries ?? []) as Record<string, unknown>[]
            ),
        certificates: () =>
            renderGeneric(
                "certificates",
                (resume.certificates?.entries ?? []) as Record<
                    string,
                    unknown
                >[]
            ),
        publications: () =>
            renderGeneric(
                "publications",
                (resume.publications?.entries ?? []) as Record<
                    string,
                    unknown
                >[]
            ),
        languages: () =>
            renderGeneric(
                "languages",
                (resume.languages?.entries ?? []) as Record<string, unknown>[]
            ),
        interests: () =>
            renderGeneric(
                "interests",
                (resume.interests?.entries ?? []) as Record<string, unknown>[]
            ),
        references: () =>
            renderGeneric(
                "references",
                (resume.references?.entries ?? []) as Record<string, unknown>[]
            ),
    };

    return (
        <div className="max-tablet:grid-cols-1 grid min-h-full grid-cols-[220px_1fr] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Sidebar */}
            <div className="flex flex-col gap-5 border-r border-(--color-border) bg-(--color-surface-subtle) p-6">
                {basics.name ? (
                    <h1 className="m-0 mb-1 text-[1.375rem] font-extrabold tracking-[-0.03em] text-(--color-foreground)">
                        {basics.name}
                    </h1>
                ) : null}
                {basics.label ? (
                    <p className="m-0 text-[1.05rem] text-(--color-muted)">
                        {basics.label}
                    </p>
                ) : null}
                {basics.summary ? (
                    <p className="m-0 text-base leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
            </div>
            {/* Main */}
            <div className="p-6">
                {resolvedOrder.map((key) => {
                    const render = rendererMap[key];
                    return render ? render() : null;
                })}
            </div>
        </div>
    );
}
