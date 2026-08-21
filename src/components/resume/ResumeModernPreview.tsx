"use client";

import { Fragment, type ReactNode } from "react";
import type {
    Resume,
    ResumeBasicsPresentation,
    ResumeCoreCompetency,
} from "@/types/resume";
import CoreCompetencyMarkdown from "@/components/resume/CoreCompetencyMarkdown";
import EducationMetadata from "@/components/resume/EducationMetadata";
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
import { getResumeProfileBrand } from "@/lib/resume-profile-preset";
import { ResumeProfileIcon } from "@/components/resume/ResumeProfileIcon";

interface Props {
    resume: Resume;
    coreCompetencies?: ResumeCoreCompetency[];
    sectionLayout?: ResumeSectionLayout;
    basicsPresentation: ResumeBasicsPresentation;
    activeJobField?: string;
}

// 날짜 포맷
const formatDateRange = (
    startDate?: string,
    endDate?: string,
    hideDays?: boolean
): string => {
    const fmt = (d?: string) => (d && hideDays ? d.slice(0, 7) : d || "");
    return `${fmt(startDate)} ~ ${fmt(endDate) || "진행 중"}`;
};

// Layout editor 전용 sync preview — markdown 렌더링, portfolio fetch 스킵
export default function ResumeModernPreview({
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
            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
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
        const sorted = [...phases].sort(
            (a, b) => (a.phase ?? 0) - (b.phase ?? 0)
        );
        return (
            <section key="careerPhases" className="mb-10">
                {sectionH2(getLabel("careerPhases"))}
                <div
                    className="grid divide-x divide-(--color-border)"
                    style={{
                        gridTemplateColumns: `repeat(${sorted.length}, 1fr)`,
                    }}
                >
                    {sorted.map((phase, idx) => (
                        <div
                            key={idx}
                            className={`${idx === 0 ? "pr-4" : idx === sorted.length - 1 ? "pl-4" : "px-4"}`}
                        >
                            <p className="mb-0.5 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                                PHASE {phase.phase}
                            </p>
                            {phase.name ? (
                                <h3 className="mb-1 text-base font-bold text-(--color-foreground)">
                                    {phase.name}
                                </h3>
                            ) : null}
                            {phase.description ? (
                                <p className="text-sm whitespace-pre-line text-(--color-muted)">
                                    {phase.description}
                                </p>
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
            <div className="relative ml-2 flex flex-col gap-7 border-l-2 border-(--color-border) pl-6">
                {(resume.work?.entries ?? []).map((w, wIdx) => (
                    <div key={wIdx} className="relative">
                        <div
                            className="absolute h-2.5 w-2.5 rounded-full border-2 border-(--color-surface) bg-(--color-accent)"
                            style={{
                                left: "-1.825rem",
                                top: "0.4rem",
                                boxShadow: "0 0 0 2px var(--color-accent)",
                            }}
                        />
                        <div>
                            {(w.startDate || w.endDate) && (
                                <p className="m-0 mb-0.5 text-sm text-(--color-muted)">
                                    {formatDateRange(
                                        w.startDate,
                                        w.endDate,
                                        w.hideDays
                                    )}
                                </p>
                            )}
                            {w.name ? (
                                <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                    {w.name}
                                </h3>
                            ) : null}
                            {w.position ? (
                                <p className="m-0 mb-2 text-base text-(--color-muted)">
                                    {w.position}
                                </p>
                            ) : null}
                            {w.summary ? (
                                <p className="m-0 mb-2 text-base text-(--color-foreground)">
                                    {w.summary}
                                </p>
                            ) : null}
                            {w.highlights && w.highlights.length > 0 ? (
                                <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                                    {w.highlights.map((h, hIdx) => (
                                        <li
                                            key={hIdx}
                                            className="mb-1 text-base text-(--color-foreground)"
                                        >
                                            {`• ${h}`}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
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
            <div className="grid grid-cols-1 gap-4">
                {(resume.projects?.entries ?? []).map((p, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                    >
                        {p.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {p.name}
                            </h3>
                        ) : null}
                        {(p.startDate || p.endDate) && (
                            <p className="mb-1 text-sm text-(--color-muted)">
                                {formatDateRange(p.startDate, p.endDate)}
                            </p>
                        )}
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

    const renderSkills = () => (
        <section key="skills" className="mb-10">
            {sectionH2(getLabel("skills"))}
            <div className="flex flex-col gap-2">
                {(resume.skills?.entries ?? []).map((skill, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                        {skill.name ? (
                            <strong className="text-base font-bold text-(--color-foreground)">
                                {skill.name}
                            </strong>
                        ) : null}
                        {skill.keywords && skill.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
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

    const renderEducation = () => (
        <section key="education" className="mb-10">
            {sectionH2(getLabel("education"))}
            <div>
                {(resume.education?.entries ?? []).map((edu, idx) => (
                    <div
                        key={idx}
                        className="mb-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3 last:mb-0"
                    >
                        {edu.institution ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {edu.institution}
                            </h3>
                        ) : null}
                        <EducationMetadata
                            items={[
                                edu.studyType,
                                edu.area,
                                edu.startDate || edu.endDate
                                    ? formatDateRange(
                                          edu.startDate,
                                          edu.endDate
                                      )
                                    : null,
                                edu.gpa != null
                                    ? `GPA ${edu.gpa.toFixed(2)} / ${(edu.gpaMax ?? 4.5).toFixed(2)}`
                                    : edu.score
                                      ? `GPA ${edu.score}`
                                      : null,
                            ]}
                        />
                    </div>
                ))}
            </div>
        </section>
    );

    const renderGrid = (
        key: string,
        items: Record<string, unknown>[],
        fields: {
            title?: string[];
            subtitle?: string[];
            date?: string[];
            body?: string[];
        }
    ) => (
        <section key={key} className="mb-10">
            {sectionH2(getLabel(key))}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {items.map((item, idx) => {
                    const getField = (names: string[] | undefined) => {
                        if (!names) return undefined;
                        for (const n of names) {
                            const v = item[n];
                            if (typeof v === "string" && v) return v;
                        }
                        return undefined;
                    };
                    const title = getField(fields.title);
                    const subtitle = getField(fields.subtitle);
                    const date = getField(fields.date);
                    const body = getField(fields.body);
                    return (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
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
            </div>
        </section>
    );

    const rendererMap: Record<string, () => React.ReactNode> = {
        coreCompetencies: renderCoreCompetencies,
        careerPhases: renderCareerPhases,
        work: renderWork,
        projects: renderProjects,
        skills: renderSkills,
        education: renderEducation,
        volunteer: () =>
            renderGrid(
                "volunteer",
                (resume.volunteer?.entries ?? []) as Record<string, unknown>[],
                {
                    title: ["organization"],
                    subtitle: ["position"],
                    date: ["startDate"],
                    body: ["summary"],
                }
            ),
        awards: () =>
            renderGrid(
                "awards",
                (resume.awards?.entries ?? []) as Record<string, unknown>[],
                {
                    title: ["title"],
                    subtitle: ["awarder"],
                    date: ["date"],
                    body: ["summary"],
                }
            ),
        certificates: () =>
            renderGrid(
                "certificates",
                (resume.certificates?.entries ?? []) as Record<
                    string,
                    unknown
                >[],
                {
                    title: ["name"],
                    subtitle: ["issuer"],
                    date: ["date"],
                }
            ),
        publications: () =>
            renderGrid(
                "publications",
                (resume.publications?.entries ?? []) as Record<
                    string,
                    unknown
                >[],
                {
                    title: ["name"],
                    subtitle: ["publisher"],
                    date: ["releaseDate"],
                    body: ["summary"],
                }
            ),
        languages: () => (
            <LanguagesSection
                languages={resume.languages?.entries ?? []}
                label={getLabel("languages")}
            />
        ),
        interests: () =>
            renderGrid(
                "interests",
                (resume.interests?.entries ?? []) as Record<string, unknown>[],
                {
                    title: ["name"],
                }
            ),
        references: () =>
            renderGrid(
                "references",
                (resume.references?.entries ?? []) as Record<string, unknown>[],
                {
                    title: ["name"],
                    body: ["reference"],
                }
            ),
    };

    const location = basics.location
        ? [
              basics.location.address,
              basics.location.addressDetail,
              basics.location.city,
              basics.location.region,
              basics.location.postalCode,
              basics.location.countryCode === "KR"
                  ? "대한민국"
                  : basics.location.countryCode === "US"
                    ? "미국"
                    : basics.location.countryCode,
          ]
              .filter(Boolean)
              .join(", ")
        : "";
    const metadataItems: { label: string; value: ReactNode }[] = [];
    if (visible.email && basics.email) {
        metadataItems.push({ label: "이메일", value: basics.email });
    }
    if (visible.phone && basics.phone) {
        metadataItems.push({ label: "전화번호", value: basics.phone });
    }
    if (visible.url && basics.url) {
        metadataItems.push({ label: "웹사이트", value: basics.url });
    }
    if (visible.location && location) {
        metadataItems.push({ label: "위치", value: location });
    }
    if (visible.birthDate && basics.birthDate) {
        metadataItems.push({
            label: "생년월일",
            value: formatResumeBirthDate(
                basics.birthDate,
                basicsPresentation.personalDetailPreset
            ),
        });
    }
    if (visible.military && basics.military?.status) {
        metadataItems.push({
            label: "병역",
            value: formatResumeMilitary(
                basics.military,
                basicsPresentation.personalDetailPreset
            ),
        });
    }

    return (
        <div className="mx-auto max-w-[1050px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            <header className="mb-10 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-8">
                <div
                    className={`grid items-center gap-6 ${visible.image && basics.image ? "grid-cols-[13rem_minmax(0,1fr)]" : "grid-cols-1"}`}
                >
                    {visible.image && basics.image ? (
                        <img
                            src={basics.image}
                            alt={basics.name || "Profile"}
                            className={`h-52 w-52 shrink-0 border border-(--color-border) object-cover object-top ${
                                basics.imageStyle === "rounded"
                                    ? "rounded-full"
                                    : basics.imageStyle === "squared"
                                      ? "rounded-none"
                                      : "rounded-xl"
                            }`}
                        />
                    ) : null}
                    <div className="min-w-0 text-left">
                        {visible.name && basics.name ? (
                            <h1 className="m-0 text-3xl leading-tight font-extrabold tracking-[-0.03em] text-(--color-foreground)">
                                {basics.name}
                            </h1>
                        ) : null}
                        {visible.headline && basics.label ? (
                            <p className="mt-1 text-lg font-medium text-(--color-muted)">
                                {basics.label}
                            </p>
                        ) : null}
                    </div>
                </div>
                {metadataItems.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
                        {metadataItems.map((item) => (
                            <div key={item.label} className="min-w-0">
                                <p className="text-xs font-bold tracking-[0.14em] text-(--color-muted) uppercase">
                                    {item.label}
                                </p>
                                <div className="mt-1 text-base break-words text-(--color-foreground)">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
                {visible.profiles && basics.profiles?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {basics.profiles.map((profile, index) => {
                            const brand = getResumeProfileBrand(profile);
                            return (
                                <span
                                    key={`${brand.preset}-${index}`}
                                    style={{
                                        backgroundColor: brand.backgroundColor,
                                        color: brand.foregroundColor,
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm"
                                >
                                    <ResumeProfileIcon preset={brand.preset} />
                                    {profile.username ||
                                        profile.network ||
                                        brand.label}
                                </span>
                            );
                        })}
                    </div>
                ) : null}
                {visible.summary && basics.summary ? (
                    <p className="m-0 mt-6 max-w-[72ch] border-t border-(--color-border) pt-5 text-lg leading-[1.75] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
            </header>
            <main>
                {resolvedOrder.map((key) => {
                    const render = rendererMap[key];
                    return render ? (
                        <Fragment key={key}>{render()}</Fragment>
                    ) : null;
                })}
            </main>
        </div>
    );
}
