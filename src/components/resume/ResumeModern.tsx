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

export default async function ResumeModern({ resume }: Props) {
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
        <div className="mx-auto max-w-[760px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Header */}
            <header className="mb-8 border-b-2 border-(--color-border) pb-7">
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
                    <h1 className="m-0 mb-1 text-[2rem] leading-[1.15] font-[800] tracking-[-0.03em] text-(--color-foreground)">
                        {basics.name}
                    </h1>
                ) : null}
                {basics.label ? (
                    <p className="m-0 mb-3 text-[1.05rem] text-(--color-muted)">
                        {basics.label}
                    </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {basics.email ? (
                        <a
                            href={`mailto:${basics.email}`}
                            className="text-sm text-(--color-link) no-underline hover:opacity-80"
                        >
                            {basics.email}
                        </a>
                    ) : null}
                    {basics.phone ? (
                        <span className="text-sm text-(--color-link)">
                            {basics.phone}
                        </span>
                    ) : null}
                    {basics.url ? (
                        <a
                            href={basics.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-(--color-link) no-underline hover:opacity-80"
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
                                      className="text-sm text-(--color-link)"
                                  >
                                      {location}
                                  </span>
                              ))
                        : null}
                </div>
                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {basics.profiles.map((profile, idx) => (
                            <a
                                key={idx}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-(--color-link) no-underline hover:opacity-80"
                            >
                                {profile.network}
                            </a>
                        ))}
                    </div>
                ) : null}
                {basics.summary ? (
                    <p className="m-0 mt-3 text-[0.9375rem] leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
            </header>

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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-[1rem] font-bold tracking-[0.08em] text-(--color-accent) uppercase">
                                    {getLabel("skills")}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                                    {sectionValue.map((skill, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                                        >
                                            {skill.name ? (
                                                <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-(--color-foreground)">
                                                    {skill.iconSlug &&
                                                    getSimpleIcon(
                                                        skill.iconSlug
                                                    ) ? (
                                                        <svg
                                                            role="img"
                                                            viewBox="0 0 24 24"
                                                            className="h-4 w-4"
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
                                                </div>
                                            ) : null}
                                            {skill.level ? (
                                                <div className="mb-1.5 text-[0.78rem] text-(--color-muted)">
                                                    {skill.level}
                                                </div>
                                            ) : null}
                                            {skill.keywords &&
                                            skill.keywords.length > 0 ? (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-[1rem] font-bold tracking-[0.08em] text-(--color-accent) uppercase">
                                    {getLabel("work")}
                                </h2>
                                <div className="relative ml-2 flex flex-col gap-7 border-l-2 border-(--color-border) pl-6">
                                    {sectionValue.map(
                                        (workItem, wIdx: number) => (
                                            <div
                                                key={wIdx}
                                                className="relative"
                                            >
                                                <div
                                                    className="absolute h-2.5 w-2.5 rounded-full border-2 border-(--color-surface) bg-(--color-accent)"
                                                    style={{
                                                        left: "-1.825rem",
                                                        top: "0.4rem",
                                                        boxShadow:
                                                            "0 0 0 2px var(--color-accent)",
                                                    }}
                                                />
                                                <div>
                                                    {(workItem.startDate ||
                                                        workItem.endDate) && (
                                                        <p
                                                            className="m-0 mb-0.5 text-[0.78rem] text-(--color-muted)"
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
                                                        </p>
                                                    )}
                                                    {workItem.name ? (
                                                        <h3 className="m-0 mb-0.5 text-[1rem] font-bold text-(--color-foreground)">
                                                            {workItem.url ? (
                                                                <a
                                                                    href={
                                                                        workItem.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-inherit no-underline hover:text-(--color-link)"
                                                                >
                                                                    {
                                                                        workItem.name
                                                                    }
                                                                </a>
                                                            ) : (
                                                                workItem.name
                                                            )}
                                                        </h3>
                                                    ) : null}
                                                    {workItem.position ? (
                                                        <p className="m-0 mb-2 text-[0.9rem] text-(--color-muted)">
                                                            {workItem.position}
                                                        </p>
                                                    ) : null}
                                                    {workItem.summary ? (
                                                        workMarkdown[wIdx]
                                                            ?.summary ? (
                                                            <div
                                                                className="resume-markdown m-0 mb-2 text-[0.9rem] text-(--color-foreground)"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: workMarkdown[
                                                                        wIdx
                                                                    ].summary!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="m-0 mb-2 text-[0.9rem] text-(--color-foreground)">
                                                                {
                                                                    workItem.summary
                                                                }
                                                            </p>
                                                        )
                                                    ) : null}
                                                    {workItem.highlights &&
                                                    workItem.highlights.length >
                                                        0 ? (
                                                        <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                                                            {workItem.highlights.map(
                                                                (
                                                                    highlight: string,
                                                                    hIdx: number
                                                                ) => (
                                                                    <li
                                                                        key={
                                                                            hIdx
                                                                        }
                                                                        className="flex items-baseline gap-1.5 text-[0.9rem] text-(--color-foreground)"
                                                                    >
                                                                        <span
                                                                            className="relative top-[-0.05em] shrink-0 text-[0.55rem] text-(--color-accent)"
                                                                            aria-hidden="true"
                                                                        >
                                                                            &#9670;
                                                                        </span>
                                                                        {workMarkdown[
                                                                            wIdx
                                                                        ]
                                                                            ?.highlights?.[
                                                                            hIdx
                                                                        ] ? (
                                                                            <span
                                                                                className="resume-markdown"
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
                                                                            <span>
                                                                                {
                                                                                    highlight
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>
                        );
                    }

                    if (
                        sectionKey === "education" &&
                        Array.isArray(sectionValue)
                    ) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-[1rem] font-bold tracking-[0.08em] text-(--color-accent) uppercase">
                                    {getLabel("education")}
                                </h2>
                                <div>
                                    {sectionValue.map((education, idx) => (
                                        <div
                                            key={idx}
                                            className="mb-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4.5 py-3.5 last:mb-0"
                                        >
                                            {education.institution ? (
                                                <h3 className="m-0 mb-0.5 text-[1rem] font-bold text-(--color-foreground)">
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
                                                </h3>
                                            ) : null}
                                            {(education.studyType ||
                                                education.area) && (
                                                <div className="mb-0.5 text-[0.9rem] text-(--color-foreground)">
                                                    {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                                                </div>
                                            )}
                                            {(education.startDate ||
                                                education.endDate) && (
                                                <div
                                                    className="mb-1 text-[0.78rem] text-(--color-muted)"
                                                    style={{
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {formatDateRange(
                                                        education.startDate,
                                                        education.endDate
                                                    )}
                                                </div>
                                            )}
                                            {education.gpa != null ? (
                                                <div className="mb-1 text-[0.85rem] text-(--color-muted)">
                                                    GPA:{" "}
                                                    {education.gpa.toFixed(2)} /{" "}
                                                    {(
                                                        education.gpaMax ?? 4.5
                                                    ).toFixed(2)}
                                                </div>
                                            ) : education.score ? (
                                                <div className="mb-1 text-[0.85rem] text-(--color-muted)">
                                                    GPA: {education.score}
                                                </div>
                                            ) : null}
                                            {education.courses &&
                                            education.courses.length > 0 ? (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {education.courses.map(
                                                        (
                                                            course: string,
                                                            cIdx: number
                                                        ) => (
                                                            <span
                                                                key={cIdx}
                                                                className="inline-block rounded bg-(--color-tag-bg) px-[0.55em] py-[0.15em] text-[0.78rem] leading-[1.5] font-medium text-(--color-tag-fg)"
                                                            >
                                                                {course}
                                                            </span>
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

                    if (
                        sectionKey === "projects" &&
                        Array.isArray(sectionValue)
                    ) {
                        return (
                            <section key={sectionKey} className="mb-10">
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-[1rem] font-bold tracking-[0.08em] text-(--color-accent) uppercase">
                                    {getLabel("projects")}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                                    {sectionValue.map(
                                        (project, pIdx: number) => (
                                            <div
                                                key={pIdx}
                                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                                            >
                                                {project.name ? (
                                                    <h3 className="m-0 mb-1 text-[1rem] font-bold text-(--color-foreground)">
                                                        {project.url ? (
                                                            <a
                                                                href={
                                                                    project.url
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-(--color-link) no-underline hover:opacity-80"
                                                            >
                                                                {project.name}
                                                            </a>
                                                        ) : (
                                                            project.name
                                                        )}
                                                    </h3>
                                                ) : null}
                                                {(project.startDate ||
                                                    project.endDate) && (
                                                    <div
                                                        className="mb-2 text-[0.78rem] text-(--color-muted)"
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
                                                    </div>
                                                )}
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
                                                                        {
                                                                            sec.title
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                                {projectsMarkdown[
                                                                    pIdx
                                                                ]?.[sIdx] ? (
                                                                    <div
                                                                        className="resume-markdown m-0 text-sm leading-[1.6] text-(--color-foreground)"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: projectsMarkdown[
                                                                                pIdx
                                                                            ][
                                                                                sIdx
                                                                            ]!,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <p className="m-0 text-sm leading-[1.6] text-(--color-foreground)">
                                                                        {
                                                                            sec.content
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    )
                                                ) : (
                                                    <>
                                                        {project.description ? (
                                                            <p className="m-0 text-sm leading-[1.6] text-(--color-foreground)">
                                                                {
                                                                    project.description
                                                                }
                                                            </p>
                                                        ) : null}
                                                        {project.highlights &&
                                                        project.highlights
                                                            .length > 0 ? (
                                                            <ul className="mt-1 mb-0 pl-4.5 text-sm text-(--color-foreground)">
                                                                {project.highlights.map(
                                                                    (
                                                                        highlight: string,
                                                                        hIdx: number
                                                                    ) => (
                                                                        <li
                                                                            key={
                                                                                hIdx
                                                                            }
                                                                            className="mb-[0.2em]"
                                                                        >
                                                                            {
                                                                                highlight
                                                                            }
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        ) : null}
                                                    </>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-[1rem] font-bold tracking-[0.08em] text-(--color-accent) uppercase">
                                    {sectionTitle}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                                    {sectionValue.map(
                                        (genericItem: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                                            >
                                                {genericItem.name ||
                                                genericItem.title ||
                                                genericItem.organization ||
                                                genericItem.language ? (
                                                    <h3 className="m-0 mb-0.5 text-[0.9375rem] font-bold text-(--color-foreground)">
                                                        {genericItem.name ||
                                                            genericItem.title ||
                                                            genericItem.organization ||
                                                            genericItem.language}
                                                    </h3>
                                                ) : null}
                                                {genericItem.position ||
                                                genericItem.awarder ||
                                                genericItem.issuer ||
                                                genericItem.publisher ||
                                                genericItem.fluency ? (
                                                    <div className="mb-0.5 text-[0.85rem] text-(--color-muted)">
                                                        {genericItem.position ||
                                                            genericItem.awarder ||
                                                            genericItem.issuer ||
                                                            genericItem.publisher ||
                                                            genericItem.fluency}
                                                    </div>
                                                ) : null}
                                                {genericItem.startDate ||
                                                genericItem.date ||
                                                genericItem.releaseDate ? (
                                                    <div
                                                        className="mb-1 text-[0.78rem] text-(--color-muted)"
                                                        style={{
                                                            fontVariantNumeric:
                                                                "tabular-nums",
                                                        }}
                                                    >
                                                        {`${genericItem.startDate || genericItem.date || genericItem.releaseDate || ""}${genericItem.endDate ? " ~ " + genericItem.endDate : ""}`}
                                                    </div>
                                                ) : null}
                                                {genericItem.summary ||
                                                genericItem.description ? (
                                                    <p>
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
                                                    <ul>
                                                        {genericItem.highlights.map(
                                                            (
                                                                highlight: string,
                                                                hIdx: number
                                                            ) => (
                                                                <li key={hIdx}>
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
                                                genericItem.keywords.length >
                                                    0 ? (
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {genericItem.keywords.map(
                                                            (
                                                                keyword: string,
                                                                kIdx: number
                                                            ) => (
                                                                <span
                                                                    key={kIdx}
                                                                    className="inline-block rounded bg-(--color-tag-bg) px-[0.55em] py-[0.15em] text-[0.78rem] leading-[1.5] font-medium text-(--color-tag-fg)"
                                                                >
                                                                    {keyword}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                ) : null}
                                                {genericItem.url ? (
                                                    <a
                                                        href={genericItem.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm break-all text-(--color-link) no-underline hover:opacity-80"
                                                    >
                                                        {genericItem.url}
                                                    </a>
                                                ) : null}
                                                {genericItem.reference ? (
                                                    <p>
                                                        {genericItem.reference}
                                                    </p>
                                                ) : null}
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>
                        );
                    }

                    return null;
                })}
            </main>
        </div>
    );
}
