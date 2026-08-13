import type { Resume, ResumeCoreCompetency } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";
import CoreCompetencyMarkdown from "@/components/resume/CoreCompetencyMarkdown";
import LanguagesSection from "@/components/resume/LanguagesSection";
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
    portfolioBasePath?: string;
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

export default async function ResumeClassic({
    resume,
    coreCompetencies = [],
    sectionLayout,
    portfolioBasePath,
    activeJobField,
}: Props) {
    const basics = resume.basics ?? {};

    // layout 기반 right-side 섹션 순서 결정
    const resolvedOrder = resolveSectionOrder(resume, sectionLayout);

    const getLabel = (key: string, qualifier?: string) => {
        const sec = (resume as Record<string, unknown>)[key] as
            | { emoji?: string; showEmoji?: boolean }
            | undefined;
        return getResumeSectionLabel(key, sec, qualifier);
    };

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

    const renderCoreCompetencies = () => (
        <section key="coreCompetencies" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("coreCompetencies")}
            </h2>
            <div className="grid grid-cols-1 gap-4">
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
                                {comp.description && comp.markdown ? (
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

    const renderLanguages = () => (
        <LanguagesSection
            key="languages"
            languages={resume.languages?.entries ?? []}
            label={getLabel("languages")}
            dataPdfBlock
        />
    );

    const renderSkills = () => (
        <SkillsSection
            key="skills"
            skills={resume.skills?.entries ?? []}
            label={getLabel("skills")}
        />
    );

    const renderWork = () => (
        <section key="work" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("work")}
            </h2>
            {workEntries.map((workItem, wIdx) => (
                <div
                    key={wIdx}
                    className="mb-7 border-b border-(--color-border) pb-7 last:mb-0 last:border-b-0 last:pb-0"
                    data-pdf-block-item
                >
                    <div className="mb-2">
                        {workItem.name ? (
                            <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                {workItem.url ? (
                                    <a
                                        href={workItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-inherit no-underline hover:text-(--color-link) hover:underline"
                                    >
                                        {workItem.name}
                                    </a>
                                ) : (
                                    workItem.name
                                )}
                            </h3>
                        ) : null}
                        {workItem.position ? (
                            <div className="mb-0.5 text-base text-(--color-muted)">
                                {workItem.position}
                            </div>
                        ) : null}
                        {(workItem.startDate || workItem.endDate) && (
                            <div
                                className="text-sm text-(--color-muted)"
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {formatDateRange(
                                    workItem.startDate,
                                    workItem.endDate,
                                    workItem.hideDays
                                )}
                            </div>
                        )}
                    </div>
                    {workItem.summary ? (
                        workMarkdown[wIdx]?.summary ? (
                            <div
                                className="resume-markdown my-2 text-base text-(--color-foreground)"
                                dangerouslySetInnerHTML={{
                                    __html: workMarkdown[wIdx].summary!,
                                }}
                            />
                        ) : (
                            <p className="my-2 text-base text-(--color-foreground)">
                                {workItem.summary}
                            </p>
                        )
                    ) : null}
                    {workItem.highlights && workItem.highlights.length > 0 ? (
                        <ul className="mt-1.5 mb-0 pl-2 text-base text-(--color-foreground)">
                            {workItem.highlights.map((h, hIdx) =>
                                workMarkdown[wIdx]?.highlights?.[hIdx] ? (
                                    <li
                                        key={hIdx}
                                        className="resume-markdown mb-[0.25em]"
                                        dangerouslySetInnerHTML={{
                                            __html: workMarkdown[wIdx]
                                                .highlights![hIdx],
                                        }}
                                    />
                                ) : (
                                    <li key={hIdx} className="mb-[0.25em]">
                                        {`• ${h}`}
                                    </li>
                                )
                            )}
                        </ul>
                    ) : null}
                </div>
            ))}
        </section>
    );

    const renderEducation = () => (
        <section key="education" className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel("education")}
            </h2>
            {(resume.education?.entries ?? []).map((education, idx) => (
                <div
                    key={idx}
                    className="mb-5 border-b border-(--color-border) pb-5 last:mb-0 last:border-b-0 last:pb-0"
                    data-pdf-block-item
                >
                    {education.institution ? (
                        <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                            {education.url ? (
                                <a
                                    href={education.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-inherit no-underline hover:text-(--color-link) hover:underline"
                                >
                                    {education.institution}
                                </a>
                            ) : (
                                education.institution
                            )}
                        </h3>
                    ) : null}
                    {(education.studyType || education.area) && (
                        <div className="mb-0.5 text-base text-(--color-muted)">
                            {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                        </div>
                    )}
                    {(education.startDate || education.endDate) && (
                        <div
                            className="mb-1 text-sm text-(--color-muted)"
                            style={{
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {formatDateRange(
                                education.startDate,
                                education.endDate
                            )}
                        </div>
                    )}
                    {education.gpa != null ? (
                        <div className="mt-1 text-sm text-(--color-muted)">
                            GPA: {education.gpa.toFixed(2)} /{" "}
                            {(education.gpaMax ?? 4.5).toFixed(2)}
                        </div>
                    ) : education.score ? (
                        <div className="mt-1 text-sm text-(--color-muted)">
                            GPA: {education.score}
                        </div>
                    ) : null}
                    {education.courses && education.courses.length > 0 ? (
                        <div className="mt-1 text-sm text-(--color-muted)">
                            Courses: {education.courses.join(", ")}
                        </div>
                    ) : null}
                </div>
            ))}
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

    // 제네릭 카드 레이아웃 — volunteer, awards, certificates, publications, languages, interests, references
    const renderGeneric = (key: string, items: Record<string, unknown>[]) => (
        <section key={key} className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {getLabel(key)}
            </h2>
            {items.map((genericItem, idx) => (
                <div
                    key={idx}
                    className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                    data-pdf-block-item
                >
                    {((genericItem.name ||
                        genericItem.title ||
                        genericItem.organization ||
                        genericItem.language) as React.ReactNode) ? (
                        <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                            {
                                (genericItem.name ||
                                    genericItem.title ||
                                    genericItem.organization ||
                                    genericItem.language) as React.ReactNode
                            }
                        </h3>
                    ) : null}
                    {((genericItem.position ||
                        genericItem.awarder ||
                        genericItem.issuer ||
                        genericItem.publisher ||
                        genericItem.fluency) as React.ReactNode) ? (
                        <div className="mb-0.5 text-base text-(--color-muted)">
                            {
                                (genericItem.position ||
                                    genericItem.awarder ||
                                    genericItem.issuer ||
                                    genericItem.publisher ||
                                    genericItem.fluency) as React.ReactNode
                            }
                        </div>
                    ) : null}
                    {genericItem.startDate ||
                    genericItem.date ||
                    genericItem.releaseDate ? (
                        <div
                            className="mb-1 text-sm text-(--color-muted)"
                            style={{
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {`${genericItem.startDate || genericItem.date || genericItem.releaseDate || ""}${genericItem.endDate ? " ~ " + genericItem.endDate : ""}`}
                        </div>
                    ) : null}
                    {((genericItem.summary ||
                        genericItem.description) as React.ReactNode) ? (
                        <p className="text-base text-(--color-foreground)">
                            {
                                (genericItem.summary ||
                                    genericItem.description) as React.ReactNode
                            }
                        </p>
                    ) : null}
                    {Array.isArray(genericItem.highlights) &&
                    genericItem.highlights.length > 0 ? (
                        <ul className="pl-2 text-base text-(--color-foreground)">
                            {(genericItem.highlights as string[]).map(
                                (highlight, hIdx) => (
                                    <li key={hIdx}>{`• ${highlight}`}</li>
                                )
                            )}
                        </ul>
                    ) : null}
                    {Array.isArray(genericItem.keywords) &&
                    genericItem.keywords.length > 0 ? (
                        <div>
                            {(genericItem.keywords as string[]).join(", ")}
                        </div>
                    ) : null}
                    {genericItem.url ? (
                        <a
                            href={genericItem.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base break-all text-(--color-link) no-underline hover:underline hover:opacity-80"
                        >
                            {genericItem.url as string}
                        </a>
                    ) : null}
                    {genericItem.reference ? (
                        <p>{genericItem.reference as string}</p>
                    ) : null}
                </div>
            ))}
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
        languages: renderLanguages,
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
            {/* Sidebar — basics 고정 */}
            <div className="max-tablet:border-r-0 max-tablet:border-b max-tablet:border-(--color-border) max-tablet:p-6 flex flex-col gap-5 border-r border-(--color-border) bg-(--color-surface-subtle) p-[2rem_1.5rem]">
                {basics.image && basics.image.trim() ? (
                    <div className="mb-4">
                        <img
                            src={
                                basics.image.startsWith("http") ||
                                basics.image.startsWith("/")
                                    ? basics.image
                                    : `/${basics.image}`
                            }
                            alt={basics.name || "Profile"}
                            className={`block h-48 w-48 object-cover ${
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
                    <h1 className="m-0 mb-1 text-[1.375rem] leading-[1.15] font-extrabold tracking-[-0.03em] text-(--color-foreground)">
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

                {/* Contact */}
                {basics.email || basics.phone || basics.url ? (
                    <div className="flex flex-col gap-1.5">
                        {basics.email ? (
                            <div className="flex flex-col gap-0.5">
                                <strong className="text-[0.75rem] font-bold tracking-widest text-(--color-muted) uppercase">
                                    Email
                                </strong>
                                <a
                                    href={`mailto:${basics.email}`}
                                    className="text-base break-all text-(--color-link) no-underline hover:underline hover:opacity-80"
                                >
                                    {basics.email}
                                </a>
                            </div>
                        ) : null}
                        {basics.phone ? (
                            <div className="flex flex-col gap-0.5">
                                <strong className="text-[0.75rem] font-bold tracking-widest text-(--color-muted) uppercase">
                                    Phone
                                </strong>
                                <span className="text-base break-all text-(--color-link)">
                                    {basics.phone}
                                </span>
                            </div>
                        ) : null}
                        {basics.url ? (
                            <div className="flex flex-col gap-0.5">
                                <strong className="text-[0.75rem] font-bold tracking-widest text-(--color-muted) uppercase">
                                    Website
                                </strong>
                                <a
                                    href={basics.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-base break-all text-(--color-link) no-underline hover:underline hover:opacity-80"
                                >
                                    {basics.url}
                                </a>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {/* Location */}
                {basics.location ? (
                    <div className="flex flex-col gap-0.5">
                        <strong className="text-[0.75rem] font-bold tracking-widest text-(--color-muted) uppercase">
                            Location
                        </strong>
                        <div className="text-base text-(--color-foreground)">
                            {[
                                basics.location.address,
                                basics.location.city,
                                basics.location.region,
                                basics.location.postalCode,
                                basics.location.countryCode,
                            ]
                                .filter(Boolean)
                                .join(", ")}
                        </div>
                    </div>
                ) : null}

                {/* Profiles */}
                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        <strong className="mb-0.5 block text-[0.75rem] font-bold tracking-widest text-(--color-muted) uppercase">
                            Profiles
                        </strong>
                        {basics.profiles.map((profile, idx) => (
                            <div
                                key={idx}
                                className="text-base text-(--color-foreground)"
                            >
                                {profile.network}:{" "}
                                {profile.url ? (
                                    <a
                                        href={profile.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-(--color-link) no-underline hover:underline hover:opacity-80"
                                    >
                                        {profile.username || profile.url}
                                    </a>
                                ) : (
                                    profile.username
                                )}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Main — layout 기반 순서 */}
            <div className="max-tablet:p-6 p-[2rem_2rem_2rem_2.5rem]">
                {resolvedOrder.map((key) => {
                    const render = rendererMap[key];
                    return render ? render() : null;
                })}
            </div>
        </div>
    );
}
