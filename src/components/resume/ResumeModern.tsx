import type { Resume, ResumeCoreCompetency } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";
import CoreCompetencyMarkdown from "@/components/resume/CoreCompetencyMarkdown";
import EducationMetadata from "@/components/resume/EducationMetadata";
import LanguagesSection from "@/components/resume/LanguagesSection";
import AwardsSection from "@/components/resume/AwardsSection";
import SkillsSection from "@/components/resume/SkillsSection";
import CareerPhasesSection from "@/components/resume/CareerPhasesSection";
import ProjectsSection from "@/components/resume/ProjectsSection";
import {
    getResumeSectionLabel,
    resolveSectionOrder,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";

interface Props {
    resume: Resume;
    coreCompetencies?: ResumeCoreCompetency[];
    sectionLayout?: ResumeSectionLayout;
    activeJobField?: string;
    portfolioBasePath?: string;
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

export default async function ResumeModern({
    resume,
    coreCompetencies = [],
    sectionLayout,
    activeJobField,
    portfolioBasePath,
}: Props) {
    const basics = resume.basics ?? {};

    // layout 기반 섹션 순서 결정
    const resolvedOrder = resolveSectionOrder(resume, sectionLayout);

    const getLabel = (key: string, qualifier?: string) => {
        const sec = (resume as Record<string, unknown>)[key] as
            | { emoji?: string; showEmoji?: boolean }
            | undefined;
        return getResumeSectionLabel(key, sec, qualifier);
    };

    // work markdown 렌더링
    const workEntries = resume.work?.entries ?? [];
    const workMarkdown = await Promise.all(
        workEntries.map(async (w) => {
            if (!w.markdown) return { summary: null, highlights: null };
            return {
                summary: w.summary ? await renderMarkdown(w.summary) : null,
                highlights: w.highlights
                    ? await Promise.all(
                          w.highlights.map((h) => renderMarkdown(h))
                      )
                    : null,
            };
        })
    );

    // 개별 섹션 renderer
    const renderCoreCompetencies = () => (
        <section key="coreCompetencies" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("coreCompetencies")}
            </h2>
            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                {coreCompetencies.map((comp, idx) => (
                    <div
                        key={idx}
                        className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                        data-pdf-block-item
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

    const renderCareerPhases = () => (
        <CareerPhasesSection
            key="careerPhases"
            phases={resume.careerPhases?.entries ?? []}
            label={getLabel("careerPhases")}
        />
    );

    const renderWork = () => (
        <section key="work" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("work")}
            </h2>
            <div className="relative ml-2 flex flex-col gap-7 border-l-2 border-(--color-border) pl-6">
                {workEntries.map((workItem, wIdx) => (
                    <div key={wIdx} className="relative" data-pdf-block-item>
                        <div
                            className="absolute h-2.5 w-2.5 rounded-full border-2 border-(--color-surface) bg-(--color-accent)"
                            style={{
                                left: "-1.825rem",
                                top: "0.4rem",
                                boxShadow: "0 0 0 2px var(--color-accent)",
                            }}
                        />
                        <div>
                            {(workItem.startDate || workItem.endDate) && (
                                <p
                                    className="m-0 mb-0.5 text-sm text-(--color-muted)"
                                    style={{
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {formatDateRange(
                                        workItem.startDate,
                                        workItem.endDate,
                                        workItem.hideDays
                                    )}
                                </p>
                            )}
                            {workItem.name ? (
                                <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                    {workItem.url ? (
                                        <a
                                            href={workItem.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-inherit no-underline hover:text-(--color-link)"
                                        >
                                            {workItem.name}
                                        </a>
                                    ) : (
                                        workItem.name
                                    )}
                                </h3>
                            ) : null}
                            {[
                                workItem.position,
                                workItem.employmentType,
                                workItem.location,
                            ].filter(Boolean).length > 0 ? (
                                <p className="m-0 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-(--color-muted)">
                                    {[
                                        workItem.position,
                                        workItem.employmentType,
                                        workItem.location,
                                    ]
                                        .filter(Boolean)
                                        .map((detail, detailIndex) => (
                                            <span
                                                key={`${detail}-${detailIndex}`}
                                            >
                                                {detailIndex > 0 ? (
                                                    <span className="mr-2 text-(--color-border)">
                                                        |
                                                    </span>
                                                ) : null}
                                                <span
                                                    className={
                                                        detailIndex === 0
                                                            ? "font-semibold text-(--color-accent)"
                                                            : "font-medium"
                                                    }
                                                >
                                                    {detail}
                                                </span>
                                            </span>
                                        ))}
                                </p>
                            ) : null}
                            {workItem.summary ? (
                                workMarkdown[wIdx]?.summary ? (
                                    <div
                                        className="resume-markdown m-0 mb-2 text-base text-(--color-foreground)"
                                        dangerouslySetInnerHTML={{
                                            __html: workMarkdown[wIdx].summary!,
                                        }}
                                    />
                                ) : (
                                    <p className="m-0 mb-2 text-base text-(--color-foreground)">
                                        {workItem.summary}
                                    </p>
                                )
                            ) : null}
                            {workItem.highlights &&
                            workItem.highlights.length > 0 ? (
                                <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                                    {workItem.highlights.map((h, hIdx) => (
                                        <li
                                            key={hIdx}
                                            className="mb-1 text-base text-(--color-foreground)"
                                        >
                                            {workMarkdown[wIdx]?.highlights?.[
                                                hIdx
                                            ] ? (
                                                <span
                                                    className="resume-markdown"
                                                    dangerouslySetInnerHTML={{
                                                        __html: workMarkdown[
                                                            wIdx
                                                        ].highlights![hIdx],
                                                    }}
                                                />
                                            ) : (
                                                `• ${h}`
                                            )}
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
        <ProjectsSection
            key="projects"
            projects={resume.projects?.entries ?? []}
            label={getLabel("projects", activeJobField ? "대표" : undefined)}
            portfolioBasePath={portfolioBasePath}
            compact={Boolean(activeJobField)}
            activeJobField={activeJobField}
        />
    );

    const renderSkills = () => (
        <SkillsSection
            key="skills"
            skills={resume.skills?.entries ?? []}
            label={getLabel("skills")}
        />
    );

    const renderEducation = () => (
        <section key="education" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("education")}
            </h2>
            <div>
                {(resume.education?.entries ?? []).map((education, idx) => (
                    <div
                        key={idx}
                        className="mb-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4.5 py-3.5 last:mb-0"
                        data-pdf-block-item
                    >
                        {education.institution ? (
                            <h3 className="m-0 text-lg font-bold text-(--color-foreground)">
                                {education.url ? (
                                    <a
                                        href={education.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inherit no-underline hover:text-(--color-link)"
                                    >
                                        {education.institution}
                                    </a>
                                ) : (
                                    education.institution
                                )}
                                {education.location ? (
                                    <span className="ml-2 text-sm font-medium text-(--color-muted)">
                                        {education.location}
                                    </span>
                                ) : null}
                            </h3>
                        ) : null}
                        <EducationMetadata
                            items={[
                                education.studyType,
                                education.area,
                                education.startDate || education.endDate
                                    ? formatDateRange(
                                          education.startDate,
                                          education.endDate
                                      )
                                    : null,
                                education.gpa != null
                                    ? `GPA ${education.gpa.toFixed(2)} / ${(education.gpaMax ?? 4.5).toFixed(2)}`
                                    : education.score
                                      ? `GPA ${education.score}`
                                      : null,
                            ]}
                        />
                        {education.courses && education.courses.length > 0 ? (
                            <div className="mt-2 text-sm leading-relaxed text-(--color-muted)">
                                주요 과목: {education.courses.join(" · ")}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderVolunteer = () => (
        <section key="volunteer" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("volunteer")}
            </h2>
            <div className="flex flex-col gap-4">
                {(resume.volunteer?.entries ?? []).map((v, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4.5 py-3.5"
                        data-pdf-block-item
                    >
                        {v.organization ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {v.url ? (
                                    <a
                                        href={v.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inherit no-underline hover:text-(--color-link)"
                                    >
                                        {v.organization}
                                    </a>
                                ) : (
                                    v.organization
                                )}
                            </h3>
                        ) : null}
                        {v.position ? (
                            <p className="m-0 mb-0.5 text-base text-(--color-muted)">
                                {v.position}
                            </p>
                        ) : null}
                        {(v.startDate || v.endDate) && (
                            <p
                                className="m-0 mb-1 text-sm text-(--color-muted)"
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {formatDateRange(v.startDate, v.endDate)}
                            </p>
                        )}
                        {v.summary ? (
                            <p className="m-0 mb-1 text-base text-(--color-foreground)">
                                {v.summary}
                            </p>
                        ) : null}
                        {v.highlights && v.highlights.length > 0 ? (
                            <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                                {v.highlights.map((h, hIdx) => (
                                    <li
                                        key={hIdx}
                                        className="text-base text-(--color-foreground)"
                                    >
                                        {`• ${h}`}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderAwards = () => (
        <AwardsSection
            key="awards"
            awards={resume.awards?.entries ?? []}
            label={getLabel("awards")}
            dataPdfBlock
        />
    );

    const renderCertificates = () => (
        <section key="certificates" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("certificates")}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {(resume.certificates?.entries ?? []).map((cert, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        data-pdf-block-item
                    >
                        {cert.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {cert.name}
                            </h3>
                        ) : null}
                        {cert.issuer ? (
                            <div className="mb-0.5 text-base text-(--color-muted)">
                                {cert.issuer}
                            </div>
                        ) : null}
                        {cert.date ? (
                            <div
                                className="mb-1 text-sm text-(--color-muted)"
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {cert.date}
                            </div>
                        ) : null}
                        {cert.url ? (
                            <a
                                href={cert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base break-all text-(--color-link) no-underline hover:underline hover:opacity-80"
                            >
                                {cert.url}
                            </a>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderPublications = () => (
        <section key="publications" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("publications")}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {(resume.publications?.entries ?? []).map((pub, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        data-pdf-block-item
                    >
                        {pub.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {pub.url ? (
                                    <a
                                        href={pub.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inherit no-underline hover:text-(--color-link)"
                                    >
                                        {pub.name}
                                    </a>
                                ) : (
                                    pub.name
                                )}
                            </h3>
                        ) : null}
                        {pub.publisher ? (
                            <div className="mb-0.5 text-base text-(--color-muted)">
                                {pub.publisher}
                            </div>
                        ) : null}
                        {pub.releaseDate ? (
                            <div
                                className="mb-1 text-sm text-(--color-muted)"
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {pub.releaseDate}
                            </div>
                        ) : null}
                        {pub.summary ? (
                            <p className="text-base text-(--color-foreground)">
                                {pub.summary}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderLanguages = () => (
        <LanguagesSection
            key="languages"
            languages={resume.languages?.entries ?? []}
            label={getLabel("languages")}
            dataPdfBlock
        />
    );

    const renderInterests = () => (
        <section key="interests" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("interests")}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {(resume.interests?.entries ?? []).map((it, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        data-pdf-block-item
                    >
                        {it.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {it.name}
                            </h3>
                        ) : null}
                        {it.keywords && it.keywords.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {it.keywords.map((kw, kIdx) => (
                                    <span
                                        key={kIdx}
                                        className="inline-block rounded bg-(--color-tag-bg) px-[0.55em] py-[0.15em] text-sm leading-normal font-medium text-(--color-tag-fg)"
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    const renderReferences = () => (
        <section key="references" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("references")}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {(resume.references?.entries ?? []).map((ref, idx) => (
                    <div
                        key={idx}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        data-pdf-block-item
                    >
                        {ref.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {ref.name}
                            </h3>
                        ) : null}
                        {ref.reference ? (
                            <p className="text-base text-(--color-foreground)">
                                {ref.reference}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );

    // key별 renderer map
    const rendererMap: Record<string, () => React.ReactNode> = {
        coreCompetencies: renderCoreCompetencies,
        careerPhases: renderCareerPhases,
        work: renderWork,
        projects: renderProjects,
        skills: renderSkills,
        education: renderEducation,
        volunteer: renderVolunteer,
        awards: renderAwards,
        certificates: renderCertificates,
        publications: renderPublications,
        languages: renderLanguages,
        interests: renderInterests,
        references: renderReferences,
    };

    return (
        <div className="mx-auto max-w-[1050px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Header */}
            <header
                className="mb-8 border-b-2 border-(--color-border) pb-7"
                data-pdf-block
            >
                {basics.image && basics.image.trim() ? (
                    <div className="mb-4 flex justify-center">
                        <img
                            src={
                                basics.image.startsWith("http") ||
                                basics.image.startsWith("/")
                                    ? basics.image
                                    : `/${basics.image}`
                            }
                            alt={basics.name || "Profile"}
                            className={`block h-56 w-56 object-cover ${
                                basics.imageStyle === "rounded"
                                    ? "rounded-full"
                                    : basics.imageStyle === "squared"
                                      ? "rounded-none"
                                      : "rounded-md"
                            }`}
                        />
                    </div>
                ) : null}
                {basics.name ? (
                    <h1 className="m-0 mb-1 text-center text-4xl leading-[1.15] font-extrabold tracking-[-0.03em] text-(--color-foreground)">
                        {basics.name}
                    </h1>
                ) : null}
                {basics.label ? (
                    <p className="m-0 mb-3 text-center text-lg text-(--color-muted)">
                        {basics.label}
                    </p>
                ) : null}
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                    {basics.email ? (
                        <a
                            href={`mailto:${basics.email}`}
                            className="text-base text-(--color-link) no-underline hover:opacity-80"
                        >
                            {basics.email}
                        </a>
                    ) : null}
                    {basics.phone ? (
                        <span className="text-base text-(--color-link)">
                            {basics.phone}
                        </span>
                    ) : null}
                    {basics.url ? (
                        <a
                            href={basics.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-(--color-link) no-underline hover:opacity-80"
                        >
                            {basics.url}
                        </a>
                    ) : null}
                    {basics.location
                        ? [
                              basics.location.city,
                              basics.location.region,
                              basics.location.countryCode,
                          ]
                              .filter(Boolean)
                              .map((location, idx) => (
                                  <span
                                      key={idx}
                                      className="text-base text-(--color-link)"
                                  >
                                      {location}
                                  </span>
                              ))
                        : null}
                </div>
                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
                        {basics.profiles.map((profile, idx) => (
                            <a
                                key={idx}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-base font-medium text-(--color-link) no-underline hover:opacity-80"
                            >
                                {profile.network}
                            </a>
                        ))}
                    </div>
                ) : null}
                {basics.summary ? (
                    <p className="m-0 mt-3 text-center text-base leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
            </header>

            {/* Main content — layout 기반 순서 */}
            <main>
                {resolvedOrder.map((key) => {
                    const render = rendererMap[key];
                    return render ? render() : null;
                })}
            </main>
        </div>
    );
}
