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

export default async function ResumeClassic({ resume }: Props) {
    const basics = resume.basics ?? {};
    const sections = Object.entries(resume)
        .filter(([key]) => key !== "basics")
        .map(
            ([key, val]) =>
                [key, (val as any)?.entries ?? []] as [string, any[]]
        );
    const getLabel = (key: string) => {
        const sec = (resume as any)[key];
        const emoji = sec?.emoji || "➕";
        const label =
            defaultSectionLabels[key] ||
            key.charAt(0).toUpperCase() + key.slice(1);
        const showEmoji = sec?.showEmoji === true;
        return showEmoji ? `${emoji} ${label}` : label;
    };

    const workMarkdown = await Promise.all(
        (resume.work?.entries || []).map(async (w) => {
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
        (resume.projects?.entries || []).map(async (proj) => {
            if (!proj.sections) return [] as (string | null)[];
            return Promise.all(
                proj.sections.map(async (sec) =>
                    sec.markdown ? renderMarkdown(sec.content) : null
                )
            );
        })
    );

    return (
        <div className="max-tablet:grid-cols-1 grid min-h-full grid-cols-[220px_1fr] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Sidebar */}
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

            {/* Main */}
            <div className="max-tablet:p-6 p-[2rem_2rem_2rem_2.5rem]">
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                    {getLabel("skills")}
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {sectionValue.map((skill, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-0.5"
                                        >
                                            {skill.name ? (
                                                <strong className="flex items-center gap-2 text-base font-bold text-(--color-foreground)">
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
                                                </strong>
                                            ) : null}
                                            {skill.level ? (
                                                <span className="text-sm text-(--color-muted)">
                                                    {skill.level}
                                                </span>
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                    {getLabel("work")}
                                </h2>
                                {sectionValue.map((workItem, wIdx: number) => (
                                    <div
                                        key={wIdx}
                                        className="mb-7 border-b border-(--color-border) pb-7 last:mb-0 last:border-b-0 last:pb-0"
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
                                            {(workItem.startDate ||
                                                workItem.endDate) && (
                                                <div
                                                    className="text-sm text-(--color-muted)"
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
                                                </div>
                                            )}
                                        </div>
                                        {workItem.summary ? (
                                            workMarkdown[wIdx]?.summary ? (
                                                <div
                                                    className="resume-markdown my-2 text-base text-(--color-foreground)"
                                                    dangerouslySetInnerHTML={{
                                                        __html: workMarkdown[
                                                            wIdx
                                                        ].summary!,
                                                    }}
                                                />
                                            ) : (
                                                <p className="my-2 text-base text-(--color-foreground)">
                                                    {workItem.summary}
                                                </p>
                                            )
                                        ) : null}
                                        {workItem.highlights &&
                                        workItem.highlights.length > 0 ? (
                                            <ul className="mt-1.5 mb-0 pl-2 text-base text-(--color-foreground)">
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
                                                                className="resume-markdown mb-[0.25em]"
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
                                                                className="mb-[0.25em]"
                                                            >
                                                                {`• ${highlight}`}
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                    {getLabel("education")}
                                </h2>
                                {sectionValue.map((education, idx) => (
                                    <div
                                        key={idx}
                                        className="mb-5 border-b border-(--color-border) pb-5 last:mb-0 last:border-b-0 last:pb-0"
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
                                        {(education.studyType ||
                                            education.area) && (
                                            <div className="mb-0.5 text-base text-(--color-muted)">
                                                {`${education.studyType || ""} ${education.area ? " " + education.area : ""}`}
                                            </div>
                                        )}
                                        {(education.startDate ||
                                            education.endDate) && (
                                            <div
                                                className="mb-1 text-sm text-(--color-muted)"
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
                                            <div className="mt-1 text-sm text-(--color-muted)">
                                                GPA: {education.gpa.toFixed(2)}{" "}
                                                /{" "}
                                                {(
                                                    education.gpaMax ?? 4.5
                                                ).toFixed(2)}
                                            </div>
                                        ) : education.score ? (
                                            <div className="mt-1 text-sm text-(--color-muted)">
                                                GPA: {education.score}
                                            </div>
                                        ) : null}
                                        {education.courses &&
                                        education.courses.length > 0 ? (
                                            <div className="mt-1 text-sm text-(--color-muted)">
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                    {getLabel("projects")}
                                </h2>
                                {sectionValue.map((project, pIdx: number) => (
                                    <div
                                        key={pIdx}
                                        className="mb-5 border-b border-(--color-border) pb-5 last:mb-0 last:border-b-0 last:pb-0"
                                    >
                                        {project.name ? (
                                            <h3 className="m-0 mb-1 text-lg font-bold text-(--color-foreground)">
                                                {project.url ? (
                                                    <a
                                                        href={project.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-(--color-link) no-underline hover:underline hover:opacity-80"
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
                                                className="mb-2 text-sm text-(--color-muted)"
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
                                                            <p className="m-0 mb-0.5 text-base font-semibold tracking-widest text-(--color-muted) uppercase">
                                                                {sec.title}
                                                            </p>
                                                        ) : null}
                                                        {projectsMarkdown[
                                                            pIdx
                                                        ]?.[sIdx] ? (
                                                            <div
                                                                className="resume-markdown my-2 text-base leading-[1.6] text-(--color-foreground)"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: projectsMarkdown[
                                                                        pIdx
                                                                    ][sIdx]!,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="my-2 text-base leading-[1.6] text-(--color-foreground)">
                                                                {sec.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <>
                                                {project.description ? (
                                                    <p className="my-2 text-base leading-[1.6] text-(--color-foreground)">
                                                        {project.description}
                                                    </p>
                                                ) : null}
                                                {project.highlights &&
                                                project.highlights.length >
                                                    0 ? (
                                                    <ul className="my-2 pl-2 text-base text-(--color-foreground)">
                                                        {project.highlights.map(
                                                            (
                                                                highlight: string,
                                                                hIdx: number
                                                            ) => (
                                                                <li
                                                                    key={hIdx}
                                                                    className="mb-[0.25em]"
                                                                >
                                                                    {`• ${highlight}`}
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
                                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                    {sectionTitle}
                                </h2>
                                {sectionValue.map(
                                    (genericItem: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="mb-4 border-b border-(--color-border) pb-4 last:mb-0 last:border-b-0 last:pb-0"
                                        >
                                            {genericItem.name ||
                                            genericItem.title ||
                                            genericItem.organization ||
                                            genericItem.language ? (
                                                <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
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
                                                <div className="mb-0.5 text-base text-(--color-muted)">
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
                                                    className="mb-1 text-sm text-(--color-muted)"
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
                                                <p className="text-base text-(--color-foreground)">
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
                                                <ul className="pl-2 text-base text-(--color-foreground)">
                                                    {genericItem.highlights.map(
                                                        (
                                                            highlight: string,
                                                            hIdx: number
                                                        ) => (
                                                            <li key={hIdx}>
                                                                {`• ${highlight}`}
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
                                                    className="text-base break-all text-(--color-link) no-underline hover:underline hover:opacity-80"
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
