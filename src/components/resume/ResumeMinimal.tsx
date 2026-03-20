import type { Resume } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";
import { SkillBadge, getSimpleIcon } from "@/components/resume/SkillBadge";

interface Props {
    resume: Resume;
}

const defaultSectionLabels: Record<string, string> = {
    work: "경력",
    skills: "기술",
    education: "학력",
    projects: "프로젝트",
    volunteer: "봉사 활동",
    awards: "수상",
    certificates: "자격증",
    publications: "출판물",
    languages: "언어",
    interests: "관심사",
    references: "추천인",
};

const formatDateRange = (
    startDate?: string,
    endDate?: string,
    hideDays?: boolean
): string => {
    const fmt = (d?: string) => (d && hideDays ? d.slice(0, 7) : d || "");
    return `${fmt(startDate)} ~ ${fmt(endDate) || "Present"}`;
};

export default async function ResumeMinimal({ resume }: Props) {
    const basics = resume.basics ?? {};
    const sections = Object.entries(resume).filter(
        ([key]) => key !== "basics" && key !== "$schema"
    );
    const getLabel = (key: string) =>
        (resume.sectionLabels ?? {})[key] ||
        defaultSectionLabels[key] ||
        key.charAt(0).toUpperCase() + key.slice(1);

    const workMarkdown = await Promise.all(
        (resume.work || []).map(async (w) => {
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
    const projectsMarkdown = await Promise.all(
        (resume.projects || []).map(async (proj) => {
            if (!proj.sections) return [] as (string | null)[];
            return Promise.all(
                proj.sections.map(async (sec) =>
                    sec.markdown ? renderMarkdown(sec.content) : null
                )
            );
        })
    );

    return (
        <div className="mx-auto max-w-[680px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Header */}
            <header className="mb-5 border-b-2 border-(--color-foreground) pb-4">
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
                            className={`block h-20 w-20 object-cover ${
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
                    <h1 className="m-0 mb-1 text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.03em] text-(--color-foreground)">
                        {basics.name}
                    </h1>
                ) : null}
                {basics.label ? (
                    <div className="mb-3 text-[1.05rem] text-(--color-muted)">
                        {basics.label}
                    </div>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.85rem] text-(--color-foreground)">
                    {basics.email ? (
                        <span>
                            <a
                                href={`mailto:${basics.email}`}
                                className="text-(--color-link) no-underline hover:opacity-80"
                            >
                                {basics.email}
                            </a>
                        </span>
                    ) : null}
                    {basics.phone ? <span>{basics.phone}</span> : null}
                    {basics.url ? (
                        <span>
                            <a
                                href={basics.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-(--color-link) no-underline hover:opacity-80"
                            >
                                {basics.url}
                            </a>
                        </span>
                    ) : null}
                    {basics.location
                        ? [
                              basics.location.city,
                              basics.location.region,
                              basics.location.countryCode,
                          ]
                              .filter(Boolean)
                              .join(", ")
                        : null}
                </div>
                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="mt-1 text-[0.85rem] text-(--color-foreground)">
                        {basics.profiles.map((profile, index) => (
                            <span key={index}>
                                {index > 0 ? " \u2022 " : ""}
                                {profile.url ? (
                                    <a
                                        href={profile.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-(--color-link) no-underline hover:opacity-80"
                                    >
                                        {profile.network}
                                    </a>
                                ) : (
                                    profile.network
                                )}
                            </span>
                        ))}
                    </div>
                ) : null}
            </header>

            {/* Summary */}
            {basics.summary ? (
                <section className="mb-6">
                    <p className="m-0 text-[0.9375rem] leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                </section>
            ) : null}

            {/* Main content */}
            <main>
                {sections.map(([sectionKey, sectionValue]) => {
                    if (
                        !sectionValue ||
                        (Array.isArray(sectionValue) &&
                            sectionValue.length === 0)
                    )
                        return null;

                    if (
                        sectionKey === "skills" &&
                        Array.isArray(sectionValue)
                    ) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-3 border-b border-(--color-border) pb-2 text-[0.8rem] font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    {getLabel("skills")}
                                </h2>
                                <div className="text-sm leading-[1.75] text-(--color-foreground)">
                                    {sectionValue.map((skill, skillIndex) => (
                                        <div
                                            key={skillIndex}
                                            className="mb-3 flex flex-wrap items-center gap-2 last:mb-0"
                                        >
                                            {skill.name ? (
                                                <strong className="flex items-center gap-1.5">
                                                    {skill.iconSlug &&
                                                    getSimpleIcon(
                                                        skill.iconSlug
                                                    ) ? (
                                                        <svg
                                                            role="img"
                                                            viewBox="0 0 24 24"
                                                            className="h-3.5 w-3.5"
                                                            style={{
                                                                fill:
                                                                    skill.iconColor ||
                                                                    `#${getSimpleIcon(skill.iconSlug)!.hex}`,
                                                            }}
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <title>
                                                                {
                                                                    getSimpleIcon(
                                                                        skill.iconSlug
                                                                    )!.title
                                                                }
                                                            </title>
                                                            <path
                                                                d={
                                                                    getSimpleIcon(
                                                                        skill.iconSlug
                                                                    )!.path
                                                                }
                                                            />
                                                        </svg>
                                                    ) : null}
                                                    {skill.name}
                                                </strong>
                                            ) : null}
                                            {skill.keywords &&
                                            skill.keywords.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {skill.keywords.map(
                                                        (
                                                            keyword: string,
                                                            kIdx: number
                                                        ) => (
                                                            <SkillBadge
                                                                key={kIdx}
                                                                name={keyword}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    }

                    if (sectionKey === "work" && Array.isArray(sectionValue)) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-3 border-b border-(--color-border) pb-2 text-[0.8rem] font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    {getLabel("work")}
                                </h2>
                                {sectionValue.map((workItem, wIdx: number) => (
                                    <div
                                        key={wIdx}
                                        className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                                    >
                                        <div className="max-tablet:flex-col max-tablet:items-start mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                            {workItem.position ? (
                                                <span className="text-[0.9375rem] font-bold text-(--color-foreground)">
                                                    {workItem.position}
                                                </span>
                                            ) : null}
                                            {workItem.name ? (
                                                <span className="text-sm text-(--color-muted)">
                                                    {workItem.url ? (
                                                        <a
                                                            href={workItem.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-(--color-link) no-underline"
                                                        >
                                                            {workItem.name}
                                                        </a>
                                                    ) : (
                                                        workItem.name
                                                    )}
                                                </span>
                                            ) : null}
                                            {(workItem.startDate ||
                                                workItem.endDate) && (
                                                <span
                                                    className="max-tablet:ml-0 ml-auto text-[0.78rem] whitespace-nowrap text-(--color-muted)"
                                                    style={{
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {formatDateRange(
                                                        workItem.startDate,
                                                        workItem.endDate,
                                                        workItem.hideDays
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {workItem.summary ? (
                                            workMarkdown[wIdx]?.summary ? (
                                                <div
                                                    className="resume-markdown m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)"
                                                    dangerouslySetInnerHTML={{
                                                        __html: workMarkdown[
                                                            wIdx
                                                        ].summary!,
                                                    }}
                                                />
                                            ) : (
                                                <p className="m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)">
                                                    {workItem.summary}
                                                </p>
                                            )
                                        ) : null}
                                        {workItem.highlights &&
                                        workItem.highlights.length > 0 ? (
                                            <ul className="mt-1 mb-0 pl-4.5 text-sm text-(--color-foreground)">
                                                {workItem.highlights.map(
                                                    (
                                                        highlight: string,
                                                        hIdx: number
                                                    ) =>
                                                        workMarkdown[wIdx]
                                                            ?.highlights?.[
                                                            hIdx
                                                        ] ? (
                                                            <li
                                                                key={hIdx}
                                                                className="resume-markdown mb-[0.2em]"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: workMarkdown[
                                                                        wIdx
                                                                    ]
                                                                        .highlights![
                                                                        hIdx
                                                                    ],
                                                                }}
                                                            />
                                                        ) : (
                                                            <li
                                                                key={hIdx}
                                                                className="mb-[0.2em]"
                                                            >
                                                                {highlight}
                                                            </li>
                                                        )
                                                )}
                                            </ul>
                                        ) : null}
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (
                        sectionKey === "education" &&
                        Array.isArray(sectionValue)
                    ) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-3 border-b border-(--color-border) pb-2 text-[0.8rem] font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    {getLabel("education")}
                                </h2>
                                {sectionValue.map((education, idx) => (
                                    <div
                                        key={idx}
                                        className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                                    >
                                        <div className="max-tablet:flex-col max-tablet:items-start mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                            {education.institution ? (
                                                <span className="text-[0.9375rem] font-bold text-(--color-foreground)">
                                                    {education.url ? (
                                                        <a
                                                            href={education.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-inherit no-underline hover:text-(--color-link)"
                                                        >
                                                            {
                                                                education.institution
                                                            }
                                                        </a>
                                                    ) : (
                                                        education.institution
                                                    )}
                                                </span>
                                            ) : null}
                                            {(education.studyType ||
                                                education.area) && (
                                                <span className="text-sm text-(--color-muted)">
                                                    {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                                                </span>
                                            )}
                                            {(education.startDate ||
                                                education.endDate) && (
                                                <span
                                                    className="max-tablet:ml-0 ml-auto text-[0.78rem] whitespace-nowrap text-(--color-muted)"
                                                    style={{
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {formatDateRange(
                                                        education.startDate,
                                                        education.endDate
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {education.gpa != null ? (
                                            <div className="my-0.5 text-[0.82rem] text-(--color-muted)">
                                                GPA: {education.gpa.toFixed(2)}{" "}
                                                /{" "}
                                                {(
                                                    education.gpaMax ?? 4.5
                                                ).toFixed(2)}
                                            </div>
                                        ) : education.score ? (
                                            <div className="my-0.5 text-[0.82rem] text-(--color-muted)">
                                                GPA: {education.score}
                                            </div>
                                        ) : null}
                                        {education.courses &&
                                        education.courses.length > 0 ? (
                                            <div className="my-0.5 text-[0.82rem] text-(--color-muted)">
                                                Courses:{" "}
                                                {education.courses.join(", ")}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (
                        sectionKey === "projects" &&
                        Array.isArray(sectionValue)
                    ) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-3 border-b border-(--color-border) pb-2 text-[0.8rem] font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    {getLabel("projects")}
                                </h2>
                                {sectionValue.map((project, pIdx: number) => (
                                    <div
                                        key={pIdx}
                                        className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                                    >
                                        <div className="max-tablet:flex-col max-tablet:items-start mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                            {project.name ? (
                                                <span className="text-[0.9375rem] font-bold text-(--color-foreground)">
                                                    {project.url ? (
                                                        <a
                                                            href={project.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-inherit no-underline hover:text-(--color-link)"
                                                        >
                                                            {project.name}
                                                        </a>
                                                    ) : (
                                                        project.name
                                                    )}
                                                </span>
                                            ) : null}
                                            {(project.startDate ||
                                                project.endDate) && (
                                                <span
                                                    className="max-tablet:ml-0 ml-auto text-[0.78rem] whitespace-nowrap text-(--color-muted)"
                                                    style={{
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {formatDateRange(
                                                        project.startDate,
                                                        project.endDate,
                                                        project.hideDays
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {project.sections &&
                                        project.sections.length > 0 ? (
                                            project.sections.map(
                                                (
                                                    sec: {
                                                        title: string;
                                                        content: string;
                                                        markdown?: boolean;
                                                    },
                                                    sIdx: number
                                                ) => (
                                                    <div
                                                        key={sIdx}
                                                        className="mt-2"
                                                    >
                                                        {sec.title ? (
                                                            <p className="m-0 mb-0.5 text-[0.8rem] font-semibold tracking-[0.05em] text-(--color-muted) uppercase">
                                                                {sec.title}
                                                            </p>
                                                        ) : null}
                                                        {projectsMarkdown[
                                                            pIdx
                                                        ]?.[sIdx] ? (
                                                            <div
                                                                className="resume-markdown m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: projectsMarkdown[
                                                                        pIdx
                                                                    ][sIdx]!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)">
                                                                {sec.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <>
                                                {project.description ? (
                                                    <p className="m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)">
                                                        {project.description}
                                                    </p>
                                                ) : null}
                                                {project.highlights &&
                                                project.highlights.length >
                                                    0 ? (
                                                    <ul className="mt-1 mb-0 pl-4.5 text-sm text-(--color-foreground)">
                                                        {project.highlights.map(
                                                            (
                                                                highlight: string,
                                                                hIdx: number
                                                            ) => (
                                                                <li
                                                                    key={hIdx}
                                                                    className="mb-[0.2em]"
                                                                >
                                                                    {highlight}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (
                        Array.isArray(sectionValue) &&
                        sectionValue.length > 0
                    ) {
                        const sectionTitle = getLabel(sectionKey);
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-3 border-b border-(--color-border) pb-2 text-[0.8rem] font-bold tracking-[0.1em] text-(--color-accent) uppercase">
                                    {sectionTitle}
                                </h2>
                                {sectionValue.map(
                                    (genericItem: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                                        >
                                            <div className="max-tablet:flex-col max-tablet:items-start mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                {genericItem.name ||
                                                genericItem.title ||
                                                genericItem.organization ||
                                                genericItem.language ? (
                                                    <span className="text-[0.9375rem] font-bold text-(--color-foreground)">
                                                        {genericItem.name ||
                                                            genericItem.title ||
                                                            genericItem.organization ||
                                                            genericItem.language}
                                                    </span>
                                                ) : null}
                                                {genericItem.position ||
                                                genericItem.awarder ||
                                                genericItem.issuer ||
                                                genericItem.publisher ||
                                                genericItem.fluency ? (
                                                    <span className="text-sm text-(--color-muted)">
                                                        {genericItem.position ||
                                                            genericItem.awarder ||
                                                            genericItem.issuer ||
                                                            genericItem.publisher ||
                                                            genericItem.fluency}
                                                    </span>
                                                ) : null}
                                                {(genericItem.startDate ||
                                                    genericItem.date ||
                                                    genericItem.releaseDate) && (
                                                    <span
                                                        className="max-tablet:ml-0 ml-auto text-[0.78rem] whitespace-nowrap text-(--color-muted)"
                                                        style={{
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {genericItem.startDate ||
                                                            genericItem.date ||
                                                            genericItem.releaseDate}
                                                        {genericItem.endDate
                                                            ? " ~ " +
                                                              genericItem.endDate
                                                            : ""}
                                                    </span>
                                                )}
                                            </div>
                                            {genericItem.summary ||
                                            genericItem.description ? (
                                                <p className="m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)">
                                                    {genericItem.summary ||
                                                        genericItem.description}
                                                </p>
                                            ) : null}
                                            {genericItem.highlights &&
                                            Array.isArray(
                                                genericItem.highlights
                                            ) &&
                                            genericItem.highlights.length >
                                                0 ? (
                                                <ul className="mt-1 mb-0 pl-4.5 text-sm text-(--color-foreground)">
                                                    {genericItem.highlights.map(
                                                        (
                                                            highlight: string,
                                                            hIdx: number
                                                        ) => (
                                                            <li
                                                                key={hIdx}
                                                                className="mb-[0.2em]"
                                                            >
                                                                {highlight}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            ) : null}
                                            {genericItem.keywords &&
                                            Array.isArray(
                                                genericItem.keywords
                                            ) &&
                                            genericItem.keywords.length > 0 ? (
                                                <div className="my-0.5 text-[0.82rem] text-(--color-muted)">
                                                    {genericItem.keywords.join(
                                                        ", "
                                                    )}
                                                </div>
                                            ) : null}
                                            {genericItem.url ? (
                                                <div className="my-0.5 text-[0.82rem] text-(--color-muted)">
                                                    <a
                                                        href={genericItem.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-(--color-link) no-underline hover:opacity-80"
                                                    >
                                                        {genericItem.url}
                                                    </a>
                                                </div>
                                            ) : null}
                                            {genericItem.reference ? (
                                                <p className="m-0 mb-1 text-sm leading-[1.6] text-(--color-foreground)">
                                                    {genericItem.reference}
                                                </p>
                                            ) : null}
                                        </div>
                                    )
                                )}
                            </section>
                        );
                    }

                    return null;
                })}
            </main>
        </div>
    );
}
