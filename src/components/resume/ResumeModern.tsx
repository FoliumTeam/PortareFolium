import type { Resume } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";

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
        <div className="resume-modern">
            <header className="resume-modern-header">
                {basics.image && basics.image.trim() ? (
                    <div className="resume-profile-image">
                        <img
                            src={
                                basics.image.startsWith("http") ||
                                basics.image.startsWith("/")
                                    ? basics.image
                                    : `/${basics.image}`
                            }
                            alt={basics.name || "Profile"}
                            className={`profile-photo profile-photo-${basics.imageStyle || "standard"}`}
                        />
                    </div>
                ) : null}
                {basics.name ? (
                    <h1 className="resume-name">{basics.name}</h1>
                ) : null}
                {basics.label ? (
                    <p className="resume-label">{basics.label}</p>
                ) : null}
                <div className="resume-modern-contact">
                    {basics.email ? (
                        <a
                            href={`mailto:${basics.email}`}
                            className="resume-contact-link"
                        >
                            {basics.email}
                        </a>
                    ) : null}
                    {basics.phone ? (
                        <span className="resume-contact-link">
                            {basics.phone}
                        </span>
                    ) : null}
                    {basics.url ? (
                        <a
                            href={basics.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-contact-link"
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
                                      className="resume-contact-link"
                                  >
                                      {location}
                                  </span>
                              ))
                        : null}
                </div>
                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="resume-modern-profiles">
                        {basics.profiles.map((profile, idx) => (
                            <a
                                key={idx}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resume-profile-link"
                            >
                                {profile.network}
                            </a>
                        ))}
                    </div>
                ) : null}
                {basics.summary ? (
                    <p className="resume-summary">{basics.summary}</p>
                ) : null}
            </header>

            <main className="resume-modern-main">
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("skills")}
                                </h2>
                                <div className="resume-skills-grid">
                                    {sectionValue.map((skill, idx) => (
                                        <div
                                            key={idx}
                                            className="resume-skill-card"
                                        >
                                            {skill.name ? (
                                                <div className="resume-skill-name">
                                                    {skill.name}
                                                </div>
                                            ) : null}
                                            {skill.level ? (
                                                <div className="resume-skill-level">
                                                    {skill.level}
                                                </div>
                                            ) : null}
                                            {skill.keywords &&
                                            skill.keywords.length > 0 ? (
                                                <div className="resume-skill-keywords">
                                                    {skill.keywords.map(
                                                        (
                                                            keyword: string,
                                                            kIdx: number
                                                        ) => (
                                                            <span
                                                                key={kIdx}
                                                                className="resume-skill-tag"
                                                            >
                                                                {keyword}
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

                    if (sectionKey === "work" && Array.isArray(sectionValue)) {
                        return (
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("work")}
                                </h2>
                                <div className="resume-timeline">
                                    {sectionValue.map(
                                        (workItem, wIdx: number) => (
                                            <div
                                                key={wIdx}
                                                className="resume-timeline-item"
                                            >
                                                <div className="resume-timeline-dot" />
                                                <div className="resume-timeline-body">
                                                    {(workItem.startDate ||
                                                        workItem.endDate) && (
                                                        <p className="resume-timeline-date">
                                                            {formatDateRange(
                                                                workItem.startDate,
                                                                workItem.endDate,
                                                                workItem.hideDays
                                                            )}
                                                        </p>
                                                    )}
                                                    {workItem.name ? (
                                                        <h3 className="resume-timeline-org">
                                                            {workItem.url ? (
                                                                <a
                                                                    href={
                                                                        workItem.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
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
                                                        <p className="resume-timeline-position">
                                                            {workItem.position}
                                                        </p>
                                                    ) : null}
                                                    {workItem.summary ? (
                                                        workMarkdown[wIdx]
                                                            ?.summary ? (
                                                            <div
                                                                className="resume-timeline-summary resume-markdown"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: workMarkdown[
                                                                        wIdx
                                                                    ].summary!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="resume-timeline-summary">
                                                                {
                                                                    workItem.summary
                                                                }
                                                            </p>
                                                        )
                                                    ) : null}
                                                    {workItem.highlights &&
                                                    workItem.highlights.length >
                                                        0 ? (
                                                        <ul className="resume-timeline-highlights">
                                                            {workItem.highlights.map(
                                                                (
                                                                    highlight: string,
                                                                    hIdx: number
                                                                ) => (
                                                                    <li
                                                                        key={
                                                                            hIdx
                                                                        }
                                                                    >
                                                                        <span
                                                                            className="resume-bullet"
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("education")}
                                </h2>
                                <div>
                                    {sectionValue.map((education, idx) => (
                                        <div
                                            key={idx}
                                            className="resume-education-card"
                                        >
                                            {education.institution ? (
                                                <h3 className="resume-education-institution">
                                                    {education.url ? (
                                                        <a
                                                            href={education.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
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
                                                <div className="resume-education-degree">
                                                    {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                                                </div>
                                            )}
                                            {(education.startDate ||
                                                education.endDate) && (
                                                <div className="resume-education-dates">
                                                    {formatDateRange(
                                                        education.startDate,
                                                        education.endDate
                                                    )}
                                                </div>
                                            )}
                                            {education.gpa != null ? (
                                                <div className="resume-education-score">
                                                    GPA:{" "}
                                                    {education.gpa.toFixed(2)} /{" "}
                                                    {(
                                                        education.gpaMax ?? 4.5
                                                    ).toFixed(2)}
                                                </div>
                                            ) : education.score ? (
                                                <div className="resume-education-score">
                                                    GPA: {education.score}
                                                </div>
                                            ) : null}
                                            {education.courses &&
                                            education.courses.length > 0 ? (
                                                <div className="resume-education-courses">
                                                    {education.courses.map(
                                                        (
                                                            course: string,
                                                            cIdx: number
                                                        ) => (
                                                            <span
                                                                key={cIdx}
                                                                className="resume-course-tag"
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("projects")}
                                </h2>
                                <div className="resume-projects-grid">
                                    {sectionValue.map(
                                        (project, pIdx: number) => (
                                            <div
                                                key={pIdx}
                                                className="resume-project-card"
                                            >
                                                {project.name ? (
                                                    <h3 className="resume-project-name">
                                                        {project.url ? (
                                                            <a
                                                                href={
                                                                    project.url
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
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
                                                    <div className="resume-project-dates">
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
                                                                className="resume-project-section"
                                                            >
                                                                {sec.title ? (
                                                                    <p className="resume-project-section-title">
                                                                        {
                                                                            sec.title
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                                {projectsMarkdown[
                                                                    pIdx
                                                                ]?.[sIdx] ? (
                                                                    <div
                                                                        className="resume-project-description resume-markdown"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: projectsMarkdown[
                                                                                pIdx
                                                                            ][
                                                                                sIdx
                                                                            ]!,
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <p className="resume-project-description">
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
                                                            <p className="resume-project-description">
                                                                {
                                                                    project.description
                                                                }
                                                            </p>
                                                        ) : null}
                                                        {project.highlights &&
                                                        project.highlights
                                                            .length > 0 ? (
                                                            <ul className="resume-project-highlights">
                                                                {project.highlights.map(
                                                                    (
                                                                        highlight: string,
                                                                        hIdx: number
                                                                    ) => (
                                                                        <li
                                                                            key={
                                                                                hIdx
                                                                            }
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {sectionTitle}
                                </h2>
                                <div className="resume-generic-grid">
                                    {sectionValue.map(
                                        (genericItem: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="resume-generic-card"
                                            >
                                                {genericItem.name ||
                                                genericItem.title ||
                                                genericItem.organization ||
                                                genericItem.language ? (
                                                    <h3>
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
                                                    <div className="resume-generic-meta">
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
                                                    <div className="resume-generic-date">
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
                                                    <div className="resume-keywords">
                                                        {genericItem.keywords.map(
                                                            (
                                                                keyword: string,
                                                                kIdx: number
                                                            ) => (
                                                                <span
                                                                    key={kIdx}
                                                                    className="resume-keyword-tag"
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
                                                        className="resume-link"
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
