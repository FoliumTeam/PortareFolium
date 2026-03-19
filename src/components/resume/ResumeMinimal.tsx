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
        <div className="resume-minimal">
            <header className="resume-minimal-header">
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
                    <div className="resume-label">{basics.label}</div>
                ) : null}
                <div className="resume-minimal-meta">
                    {basics.email ? (
                        <span>
                            <a href={`mailto:${basics.email}`}>
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
                    <div className="resume-minimal-profiles">
                        {basics.profiles.map((profile, index) => (
                            <span key={index}>
                                {index > 0 ? " \u2022 " : ""}
                                {profile.url ? (
                                    <a
                                        href={profile.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
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

            {basics.summary ? (
                <section className="resume-summary-section">
                    <p className="resume-summary">{basics.summary}</p>
                </section>
            ) : null}

            <main className="resume-minimal-main">
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
                                <div className="resume-skills-compact">
                                    {sectionValue.map((skill, skillIndex) => (
                                        <span key={skillIndex}>
                                            {skill.name ? (
                                                <strong>{skill.name}</strong>
                                            ) : null}
                                            {skill.keywords &&
                                            skill.keywords.length > 0
                                                ? `: ${skill.keywords.join(", ")}`
                                                : ""}
                                            {skillIndex <
                                            sectionValue.length - 1
                                                ? " \u2022 "
                                                : ""}
                                        </span>
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
                                {sectionValue.map((workItem, wIdx: number) => (
                                    <div
                                        key={wIdx}
                                        className="resume-item-compact"
                                    >
                                        <div className="resume-item-header-compact">
                                            {workItem.position ? (
                                                <span className="resume-item-title">
                                                    {workItem.position}
                                                </span>
                                            ) : null}
                                            {workItem.name ? (
                                                <span className="resume-item-org">
                                                    {workItem.url ? (
                                                        <a
                                                            href={workItem.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
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
                                                <span className="resume-item-date">
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
                                                    className="resume-item-summary resume-markdown"
                                                    dangerouslySetInnerHTML={{
                                                        __html: workMarkdown[
                                                            wIdx
                                                        ].summary!,
                                                    }}
                                                />
                                            ) : (
                                                <p className="resume-item-summary">
                                                    {workItem.summary}
                                                </p>
                                            )
                                        ) : null}
                                        {workItem.highlights &&
                                        workItem.highlights.length > 0 ? (
                                            <ul className="resume-item-highlights">
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
                                                            <li key={hIdx}>
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("education")}
                                </h2>
                                {sectionValue.map((education, idx) => (
                                    <div
                                        key={idx}
                                        className="resume-item-compact"
                                    >
                                        <div className="resume-item-header-compact">
                                            {education.institution ? (
                                                <span className="resume-item-title">
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
                                                </span>
                                            ) : null}
                                            {(education.studyType ||
                                                education.area) && (
                                                <span className="resume-item-org">
                                                    {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                                                </span>
                                            )}
                                            {(education.startDate ||
                                                education.endDate) && (
                                                <span className="resume-item-date">
                                                    {formatDateRange(
                                                        education.startDate,
                                                        education.endDate
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        {education.gpa != null ? (
                                            <div className="resume-item-meta">
                                                GPA: {education.gpa.toFixed(2)}{" "}
                                                /{" "}
                                                {(
                                                    education.gpaMax ?? 4.5
                                                ).toFixed(2)}
                                            </div>
                                        ) : education.score ? (
                                            <div className="resume-item-meta">
                                                GPA: {education.score}
                                            </div>
                                        ) : null}
                                        {education.courses &&
                                        education.courses.length > 0 ? (
                                            <div className="resume-item-meta">
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {getLabel("projects")}
                                </h2>
                                {sectionValue.map((project, pIdx: number) => (
                                    <div
                                        key={pIdx}
                                        className="resume-item-compact"
                                    >
                                        <div className="resume-item-header-compact">
                                            {project.name ? (
                                                <span className="resume-item-title">
                                                    {project.url ? (
                                                        <a
                                                            href={project.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
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
                                                <span className="resume-item-date">
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
                                                        className="resume-project-section"
                                                    >
                                                        {sec.title ? (
                                                            <p className="resume-project-section-title">
                                                                {sec.title}
                                                            </p>
                                                        ) : null}
                                                        {projectsMarkdown[
                                                            pIdx
                                                        ]?.[sIdx] ? (
                                                            <div
                                                                className="resume-item-summary resume-markdown"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: projectsMarkdown[
                                                                        pIdx
                                                                    ][sIdx]!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="resume-item-summary">
                                                                {sec.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <>
                                                {project.description ? (
                                                    <p className="resume-item-summary">
                                                        {project.description}
                                                    </p>
                                                ) : null}
                                                {project.highlights &&
                                                project.highlights.length >
                                                    0 ? (
                                                    <ul className="resume-item-highlights">
                                                        {project.highlights.map(
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
                            <section
                                key={sectionKey}
                                className="resume-section"
                            >
                                <h2 className="resume-section-title">
                                    {sectionTitle}
                                </h2>
                                {sectionValue.map(
                                    (genericItem: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="resume-item-compact"
                                        >
                                            <div className="resume-item-header-compact">
                                                {genericItem.name ||
                                                genericItem.title ||
                                                genericItem.organization ||
                                                genericItem.language ? (
                                                    <span className="resume-item-title">
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
                                                    <span className="resume-item-org">
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
                                                    <span className="resume-item-date">
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
                                                <p className="resume-item-summary">
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
                                                <ul className="resume-item-highlights">
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
                                            genericItem.keywords.length > 0 ? (
                                                <div className="resume-item-meta">
                                                    {genericItem.keywords.join(
                                                        ", "
                                                    )}
                                                </div>
                                            ) : null}
                                            {genericItem.url ? (
                                                <div className="resume-item-meta">
                                                    <a
                                                        href={genericItem.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {genericItem.url}
                                                    </a>
                                                </div>
                                            ) : null}
                                            {genericItem.reference ? (
                                                <p className="resume-item-summary">
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
