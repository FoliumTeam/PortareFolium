"use client";

import { Fragment } from "react";
import type {
    Resume,
    ResumeBasicsPresentation,
    ResumeCoreCompetency,
} from "@/types/resume";
import CoreCompetencyMarkdown from "@/components/resume/CoreCompetencyMarkdown";
import LanguagesSection from "@/components/resume/LanguagesSection";
import {
    getResumeSectionLabel,
    resolveSectionOrder,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";
import {
    formatResumeBirthDate,
    formatResumeMilitary,
} from "@/lib/resume-basics-presentation";

interface Props {
    resume: Resume;
    coreCompetencies?: ResumeCoreCompetency[];
    sectionLayout?: ResumeSectionLayout;
    basicsPresentation: ResumeBasicsPresentation;
    activeJobField?: string;
}

const formatDateRange = (
    startDate?: string,
    endDate?: string,
    hideDays?: boolean
): string => {
    const fmt = (d?: string) => (d && hideDays ? d.slice(0, 7) : d || "");
    return `${fmt(startDate)} ~ ${fmt(endDate) || "진행 중"}`;
};

// Layout editor 전용 sync preview — markdown 렌더링, portfolio fetch 스킵
export default function ResumeClassicPreview({
    resume,
    coreCompetencies = [],
    sectionLayout,
    basicsPresentation,
    activeJobField,
}: Props) {
    const basics = resume.basics ?? {};
    const visible = basicsPresentation.visibility;
    const resolvedOrder = resolveSectionOrder(resume, sectionLayout);

    const getLabel = (key: string) => {
        const sec = (resume as Record<string, unknown>)[key] as
            | { emoji?: string; showEmoji?: boolean }
            | undefined;
        return getResumeSectionLabel(key, sec);
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
                        className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                    >
                        <div className="flex items-start gap-4">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent)/12 text-base font-black text-(--color-accent)">
                                {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="m-0 text-lg leading-snug font-bold text-(--color-foreground)">
                                    {comp.title}
                                </h3>
                                {comp.description && comp.markdown !== false ? (
                                    <div className="mt-3 border-l-2 border-(--color-accent)/45 pl-4 text-base leading-7 text-(--color-muted)">
                                        <CoreCompetencyMarkdown
                                            description={comp.description}
                                        />
                                    </div>
                                ) : comp.description ? (
                                    <p className="mt-3 border-l-2 border-(--color-accent)/45 pl-4 text-base leading-7 text-(--color-muted)">
                                        {comp.description}
                                    </p>
                                ) : null}
                            </div>
                        </div>
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
            {sectionH2(
                `${activeJobField ? "대표 " : ""}${getLabel("projects")}`
            )}
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
        languages: () => (
            <LanguagesSection
                languages={resume.languages?.entries ?? []}
                label={getLabel("languages")}
            />
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
                {visible.image && basics.image ? (
                    <img
                        src={basics.image}
                        alt={basics.name || "Profile"}
                        className={`h-44 w-44 object-cover ${
                            basics.imageStyle === "rounded"
                                ? "rounded-full"
                                : basics.imageStyle === "squared"
                                  ? "rounded-none"
                                  : "rounded-md"
                        }`}
                    />
                ) : null}
                {visible.name && basics.name ? (
                    <h1 className="m-0 mb-1 text-[1.375rem] font-extrabold tracking-[-0.03em] text-(--color-foreground)">
                        {basics.name}
                    </h1>
                ) : null}
                {visible.headline && basics.label ? (
                    <p className="m-0 text-[1.05rem] text-(--color-muted)">
                        {basics.label}
                    </p>
                ) : null}
                {visible.summary && basics.summary ? (
                    <p className="m-0 text-base leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
                {visible.email && basics.email ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            Email
                        </strong>
                        <p className="mt-1 text-base break-all text-(--color-link)">
                            {basics.email}
                        </p>
                    </div>
                ) : null}
                {visible.phone && basics.phone ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            Phone
                        </strong>
                        <p className="mt-1 text-base text-(--color-link)">
                            {basics.phone}
                        </p>
                    </div>
                ) : null}
                {visible.url && basics.url ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            Website
                        </strong>
                        <p className="mt-1 text-base break-all text-(--color-link)">
                            {basics.url}
                        </p>
                    </div>
                ) : null}
                {visible.location && basics.location ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            Location
                        </strong>
                        <p className="mt-1 text-base text-(--color-foreground)">
                            {[
                                basics.location.city,
                                basics.location.region,
                                basics.location.countryCode === "KR"
                                    ? "대한민국"
                                    : basics.location.countryCode === "US"
                                      ? "미국"
                                      : basics.location.countryCode,
                            ]
                                .filter(Boolean)
                                .join(", ")}
                        </p>
                    </div>
                ) : null}
                {visible.birthDate && basics.birthDate ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            생년월일
                        </strong>
                        <p className="mt-1 text-base text-(--color-foreground)">
                            {formatResumeBirthDate(
                                basics.birthDate,
                                basicsPresentation.personalDetailPreset
                            )}
                        </p>
                    </div>
                ) : null}
                {visible.military && basics.military?.status ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            병역
                        </strong>
                        <p className="mt-1 text-base text-(--color-foreground)">
                            {formatResumeMilitary(
                                basics.military,
                                basicsPresentation.personalDetailPreset
                            )}
                        </p>
                    </div>
                ) : null}
                {visible.profiles && basics.profiles?.length ? (
                    <div>
                        <strong className="text-xs tracking-widest text-(--color-muted) uppercase">
                            Profiles
                        </strong>
                        <div className="mt-1 space-y-1">
                            {basics.profiles.map((profile, index) => (
                                <p
                                    key={`${profile.network}-${index}`}
                                    className="text-base break-all text-(--color-link)"
                                >
                                    {profile.network}: {profile.username}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
            {/* Main */}
            <div className="p-6">
                {resolvedOrder.map((key) => {
                    const render = rendererMap[key];
                    return render ? (
                        <Fragment key={key}>{render()}</Fragment>
                    ) : null;
                })}
            </div>
        </div>
    );
}
