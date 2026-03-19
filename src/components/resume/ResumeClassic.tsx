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

export default async function ResumeClassic({ resume }: Props) {
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
        <div className="resume-classic">
            {/* 왼쪽 사이드바: 기본 정보 */}
            <div className="resume-classic-sidebar">
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
                {basics.summary ? (
                    <p className="resume-summary">{basics.summary}</p>
                ) : null}

                {basics.email || basics.phone || basics.url ? (
                    <div className="resume-contact">
                        {basics.email ? (
                            <div>
                                <strong>Email</strong>
                                <a href={`mailto:${basics.email}`}>
                                    {basics.email}
                                </a>
                            </div>
                        ) : null}
                        {basics.phone ? (
                            <div>
                                <strong>Phone</strong>
                                <span>{basics.phone}</span>
                            </div>
                        ) : null}
                        {basics.url ? (
                            <div>
                                <strong>Website</strong>
                                <a
                                    href={basics.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {basics.url}
                                </a>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {basics.location ? (
                    <div className="resume-location">
                        <strong>Location</strong>
                        <div>
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

                {basics.profiles && basics.profiles.length > 0 ? (
                    <div className="resume-profiles">
                        <strong>Profiles</strong>
                        {basics.profiles.map((profile, idx) => (
                            <div key={idx}>
                                {profile.network}:{" "}
                                {profile.url ? (
                                    <a
                                        href={profile.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
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

            {/* 오른쪽 메인 */}
            <div className="resume-classic-main">
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
                                <div className="resume-skills">
                                    {sectionValue.map((skill, idx) => (
                                        <div
                                            key={idx}
                                            className="resume-skill-item"
                                        >
                                            {skill.name ? (
                                                <strong>{skill.name}</strong>
                                            ) : null}
                                            {skill.level ? (
                                                <span className="resume-skill-level">
                                                    {skill.level}
                                                </span>
                                            ) : null}
                                            {skill.keywords &&
                                            skill.keywords.length > 0 ? (
                                                <div className="resume-skill-keywords">
                                                    {skill.keywords.join(", ")}
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
                                {sectionValue.map((workItem, wIdx: number) => (
                                    <div
                                        key={wIdx}
                                        className="resume-work-item"
                                    >
                                        <div className="resume-work-header">
                                            {workItem.name ? (
                                                <h3 className="resume-work-company">
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
                                                </h3>
                                            ) : null}
                                            {workItem.position ? (
                                                <div className="resume-work-position">
                                                    {workItem.position}
                                                </div>
                                            ) : null}
                                            {(workItem.startDate ||
                                                workItem.endDate) && (
                                                <div className="resume-work-dates">
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
                                                    className="resume-work-summary resume-markdown"
                                                    dangerouslySetInnerHTML={{
                                                        __html: workMarkdown[
                                                            wIdx
                                                        ].summary!,
                                                    }}
                                                />
                                            ) : (
                                                <p className="resume-work-summary">
                                                    {workItem.summary}
                                                </p>
                                            )
                                        ) : null}
                                        {workItem.highlights &&
                                        workItem.highlights.length > 0 ? (
                                            <ul className="resume-work-highlights">
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
                                        className="resume-education-item"
                                    >
                                        {education.institution ? (
                                            <h3 className="resume-education-institution">
                                                {education.url ? (
                                                    <a
                                                        href={education.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {education.institution}
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
                                                GPA: {education.gpa.toFixed(2)}{" "}
                                                /{" "}
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
                                        className="resume-project-item"
                                    >
                                        {project.name ? (
                                            <h3 className="resume-project-name">
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
                                                                {sec.title}
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
                                                                    ][sIdx]!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="resume-project-description">
                                                                {sec.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <>
                                                {project.description ? (
                                                    <p className="resume-project-description">
                                                        {project.description}
                                                    </p>
                                                ) : null}
                                                {project.highlights &&
                                                project.highlights.length >
                                                    0 ? (
                                                    <ul className="resume-project-highlights">
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
                                            className="resume-generic-item"
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
                                            genericItem.keywords.length > 0 ? (
                                                <div>
                                                    {genericItem.keywords.join(
                                                        ", "
                                                    )}
                                                </div>
                                            ) : null}
                                            {genericItem.url ? (
                                                <a
                                                    href={genericItem.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {genericItem.url}
                                                </a>
                                            ) : null}
                                            {genericItem.reference ? (
                                                <p>{genericItem.reference}</p>
                                            ) : null}
                                        </div>
                                    )
                                )}
                            </section>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
