import { Fragment, type ReactNode } from "react";
import { Figma, Github, Gitlab, Link, Linkedin, Package } from "lucide-react";
import type {
    Resume,
    ResumeBasicsPresentation,
    ResumeCoreCompetency,
    ResumeProfilePreset,
} from "@/types/resume";
import { formatResumeBirthDate } from "@/lib/resume-basics-presentation";
import { getResumeProfileBrand } from "@/lib/resume-profile-preset";
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
    basicsPresentation: ResumeBasicsPresentation;
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
    basicsPresentation,
}: Props) {
    const basics = resume.basics ?? {};
    const visible = basicsPresentation.visibility;

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

    const metadataItems: Array<{
        key: string;
        label: string;
        value: ReactNode;
    }> = [];
    if (visible.email && basics.email) {
        metadataItems.push({
            key: "email",
            label: "이메일",
            value: (
                <a
                    href={`mailto:${basics.email}`}
                    className="inline-flex rounded-md bg-(--color-accent)/12 px-2 py-1 font-semibold break-all text-(--color-link) no-underline hover:bg-(--color-accent)/18 hover:underline"
                >
                    {basics.email}
                </a>
            ),
        });
    }
    if (visible.phone && basics.phone) {
        metadataItems.push({
            key: "phone",
            label: "전화번호",
            value: (
                <a
                    href={`tel:${basics.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex rounded-md bg-(--color-accent)/12 px-2 py-1 font-semibold text-(--color-link) no-underline hover:bg-(--color-accent)/18 hover:underline"
                >
                    {basics.phone}
                </a>
            ),
        });
    }
    if (visible.url && basics.url) {
        metadataItems.push({
            key: "url",
            label: "웹사이트",
            value: (
                <a
                    href={basics.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-(--color-link) no-underline hover:underline"
                >
                    {basics.url}
                </a>
            ),
        });
    }
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
    if (visible.location && location) {
        metadataItems.push({
            key: "location",
            label: "위치",
            value: <span>{location}</span>,
        });
    }
    if (visible.birthDate && basics.birthDate) {
        metadataItems.push({
            key: "birthDate",
            label: "생년월일",
            value: (
                <span>
                    {formatResumeBirthDate(
                        basics.birthDate,
                        basicsPresentation.personalDetailPreset
                    )}
                </span>
            ),
        });
    }
    if (visible.military && basics.military?.status) {
        metadataItems.push({
            key: "militaryStatus",
            label: "병역 상태",
            value: <span>{basics.military.status}</span>,
        });
        const militaryPeriod =
            basicsPresentation.personalDetailPreset === "detailed"
                ? [basics.military.startDate, basics.military.endDate]
                      .filter(Boolean)
                      .map((value) => value?.replace("-", "."))
                      .join(" – ")
                : "";
        if (militaryPeriod) {
            metadataItems.push({
                key: "militaryPeriod",
                label: "복무 기간",
                value: <span>{militaryPeriod}</span>,
            });
        }
    }
    if (visible.profiles && basics.profiles?.length) {
        metadataItems.push({
            key: "profiles",
            label: "프로필",
            value: (
                <span className="flex flex-wrap gap-2">
                    {basics.profiles.map((profile, index) => {
                        const brand = getResumeProfileBrand(profile);
                        return profile.url ? (
                            <a
                                key={index}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${brand.label} 프로필 열기`}
                                style={{
                                    backgroundColor: brand.backgroundColor,
                                    color: brand.foregroundColor,
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold no-underline shadow-sm transition-opacity hover:opacity-85"
                            >
                                <ProfileIcon preset={brand.preset} />
                                {profile.username ||
                                    profile.network ||
                                    brand.label}
                            </a>
                        ) : (
                            <span key={index}>
                                {profile.username || profile.network}
                            </span>
                        );
                    })}
                </span>
            ),
        });
    }

    const renderImage = (sizeClass: string) =>
        visible.image && basics.image?.trim() ? (
            <img
                src={
                    basics.image.startsWith("http") ||
                    basics.image.startsWith("/")
                        ? basics.image
                        : `/${basics.image}`
                }
                alt={basics.name || "Profile"}
                className={`${sizeClass} shrink-0 border border-(--color-border) object-cover ${
                    basics.imageStyle === "rounded"
                        ? "rounded-full"
                        : basics.imageStyle === "squared"
                          ? "rounded-none"
                          : "rounded-xl"
                }`}
            />
        ) : null;

    const renderIdentity = (centered = false) => (
        <div className={centered ? "text-center" : "text-left"}>
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
    );

    const renderMetadata = (className: string) =>
        metadataItems.length > 0 ? (
            <div className={className}>
                {metadataItems.map((item) => (
                    <div
                        key={item.key}
                        className={`min-w-0 ${
                            [
                                "location",
                                "birthDate",
                                "militaryStatus",
                                "militaryPeriod",
                            ].includes(item.key)
                                ? "border-l-2 border-(--color-accent)/45 pl-3"
                                : ""
                        }`}
                    >
                        <p
                            className={`text-xs font-bold tracking-[0.14em] uppercase ${
                                [
                                    "location",
                                    "birthDate",
                                    "militaryStatus",
                                    "militaryPeriod",
                                ].includes(item.key)
                                    ? "text-(--color-accent)"
                                    : "text-(--color-muted)"
                            }`}
                        >
                            {item.label}
                        </p>
                        <div
                            className={`mt-1 text-base text-(--color-foreground) ${
                                ["birthDate", "militaryPeriod"].includes(
                                    item.key
                                )
                                    ? "font-semibold tabular-nums"
                                    : ""
                            }`}
                        >
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>
        ) : null;

    const renderSummary = (className: string) =>
        visible.summary && basics.summary ? (
            <p
                className={`m-0 max-w-[72ch] text-lg leading-[1.75] whitespace-pre-line text-(--color-foreground) ${className}`}
            >
                {basics.summary}
            </p>
        ) : null;

    const renderHeader = () => {
        const image = renderImage(
            "h-52 w-52 object-top max-tablet:h-36 max-tablet:w-36"
        );
        if (basicsPresentation.headerPreset === "profileCard") {
            return (
                <header
                    className="tablet:grid-cols-[11rem_minmax(0,1fr)] tablet:p-8 mb-10 grid gap-6 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                    data-pdf-block
                >
                    <div className="flex flex-col items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
                        {renderImage(
                            "h-44 w-44 max-tablet:h-28 max-tablet:w-28"
                        )}
                        <div className="mt-4">{renderIdentity(true)}</div>
                    </div>
                    <div className="min-w-0">
                        {renderMetadata(
                            "grid grid-cols-1 gap-x-8 gap-y-4 tablet:grid-cols-2"
                        )}
                        {renderSummary(
                            "mt-6 border-t border-(--color-border) pt-5"
                        )}
                    </div>
                </header>
            );
        }
        if (basicsPresentation.headerPreset === "compact") {
            return (
                <header
                    className="mb-10 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                    data-pdf-block
                >
                    <div className="max-tablet:flex-col max-tablet:items-center flex flex-wrap items-center gap-4">
                        {renderImage(
                            "h-24 w-24 max-tablet:h-20 max-tablet:w-20"
                        )}
                        {renderIdentity()}
                    </div>
                    {renderMetadata(
                        "mt-5 grid grid-cols-1 gap-x-8 gap-y-4 tablet:grid-cols-2"
                    )}
                    {renderSummary(
                        "mt-5 border-t border-(--color-border) pt-5"
                    )}
                </header>
            );
        }
        return (
            <header
                className="tablet:p-8 mb-10 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                data-pdf-block
            >
                <div
                    className={`grid items-start gap-6 ${
                        image
                            ? "tablet:grid-cols-[13rem_minmax(0,1fr)]"
                            : "grid-cols-1"
                    } max-tablet:justify-items-center`}
                >
                    {image}
                    <div className="max-tablet:w-full min-w-0">
                        <div className="max-tablet:text-center">
                            {renderIdentity()}
                        </div>
                        {renderMetadata(
                            "mt-5 grid grid-cols-1 gap-x-8 gap-y-4 tablet:grid-cols-2 max-tablet:text-left"
                        )}
                    </div>
                </div>
                {renderSummary("mt-6 border-t border-(--color-border) pt-5")}
            </header>
        );
    };

    return (
        <div className="mx-auto max-w-[1050px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {renderHeader()}

            {/* Main content — layout 기반 순서 */}
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

const ProfileIcon = ({ preset }: { preset: ResumeProfilePreset }) => {
    if (preset === "github") return <Github className="h-4 w-4" />;
    if (preset === "gitlab") return <Gitlab className="h-4 w-4" />;
    if (preset === "linkedin") return <Linkedin className="h-4 w-4" />;
    if (preset === "figma") return <Figma className="h-4 w-4" />;
    if (preset === "npm") return <Package className="h-4 w-4" />;
    return <Link className="h-4 w-4" />;
};
