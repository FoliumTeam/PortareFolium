import type { Resume } from "@/types/resume";
import { defaultSectionLabels } from "@/types/resume";
import { renderMarkdown } from "@/lib/markdown";
import SkillsSection from "@/components/resume/SkillsSection";
import CareerPhasesSection from "@/components/resume/CareerPhasesSection";
import ProjectsSection from "@/components/resume/ProjectsSection";

interface Props {
    resume: Resume;
    activeJobField?: string;
}

// 핵심역량 (포트폴리오 기반 추출)
const CORE_COMPETENCIES = [
    {
        title: "C++ 게임 로직 설계 & 엔진 아키텍처",
        situation:
            "콘솔 엔진 프로젝트 2개 (턴제 전술 게임, Fruit Ninja 아케이드)",
        action: "엔진 DLL 분리, 전투·AI·물리 시스템, ANSI 트루컬러 렌더러, Quadtree 충돌 판정 직접 구현",
        result: "5일 내 완성도 높은 게임 프로토타입 2개 독립 개발",
    },
    {
        title: "게이머 커뮤니티 풀스택 서비스 기획·개발",
        situation:
            "카트라이더 러쉬플러스 공략 사이트, 메이플스토리 경매장 사이트",
        action: "Next.js + MongoDB/Nexon API 기반 서비스 설계·배포, MDX 자동 포스트 생성",
        result: "게임 유저 니즈를 직접 파악하고 기획~배포까지 독립 수행",
    },
    {
        title: "게임 모딩 — 상용 엔진 분석 & 커스터마이징",
        situation: "몬스터 헌터 와일즈/라이즈 SFX 커스텀 모드",
        action: "RE Engine 기반 사운드 에셋 분석·교체, Nexus Mods 배포",
        result: "고유 다운로드 8,000명 이상, 상용 엔진 내부 구조 이해 입증",
    },
    {
        title: "대규모 시스템 리드 개발 & DevOps",
        situation: "인천 ITS 디지털 트윈 API 서버 (Global Bridge)",
        action: "FastAPI + DLR SUMO 기반 시간당 500만 건(일 약 1.2억 건) 데이터 처리 서버 리드 개발",
        result: "Docker 원클릭 배포 파이프라인 구축, 테스트 시간 50~70% 단축",
    },
];

// 날짜 포맷
const formatDateRange = (
    startDate?: string,
    endDate?: string,
    hideDays?: boolean
): string => {
    const fmt = (d?: string) => (d && hideDays ? d.slice(0, 7) : d || "");
    return `${fmt(startDate)} ~ ${fmt(endDate) || "Present"}`;
};

// jobField가 특정 phase에 해당하는지 확인
function matchesPhase(
    jobField: string | string[] | undefined,
    phase: "web" | "game"
): boolean {
    if (!jobField) return phase === "game";
    const fields = Array.isArray(jobField) ? jobField : [jobField];
    return fields.includes(phase);
}

export default async function ResumePhases({ resume, activeJobField }: Props) {
    const basics = resume.basics ?? {};
    const getLabel = (key: string) => {
        const sec = (resume as any)[key];
        const emoji = sec?.emoji || "➕";
        const label =
            defaultSectionLabels[key] ||
            key.charAt(0).toUpperCase() + key.slice(1);
        const showEmoji = sec?.showEmoji === true;
        return showEmoji ? `${emoji} ${label}` : label;
    };

    // Phase 1: web 경력
    const webWork = (resume.work?.entries ?? []).filter((w) =>
        matchesPhase(w.jobField, "web")
    );

    // Phase 2: game 프로젝트
    const gameProjects = (resume.projects?.entries ?? []).filter((p) =>
        matchesPhase(p.jobField, "game")
    );

    const hasSkills = (resume.skills?.entries ?? []).some(
        (s) => (s.keywords?.length ?? 0) > 0
    );

    const education = resume.education?.entries ?? [];
    const awards = resume.awards?.entries ?? [];
    const certificates = resume.certificates?.entries ?? [];
    const languages = resume.languages?.entries ?? [];

    // work markdown 렌더링
    const workMarkdown = await Promise.all(
        webWork.map(async (w) => {
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

    const hasWebWork = webWork.length > 0;
    const hasEducation = education.length > 0;
    const hasLanguages = languages.length > 0;
    const hasAwards = awards.length > 0;
    const hasCertificates = certificates.length > 0;

    return (
        <div className="mx-auto max-w-[1050px] text-[0.9375rem] leading-[1.6] text-(--color-foreground)">
            {/* Header */}
            <header className="mb-10 border-b-2 border-(--color-border) pb-8">
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
                    <h1 className="m-0 mb-1 text-center text-4xl font-extrabold tracking-[-0.03em] text-(--color-foreground)">
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
                    {basics.profiles?.map((profile, idx) => (
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
                {basics.summary ? (
                    <p className="m-0 mt-4 text-center text-base leading-[1.65] whitespace-pre-line text-(--color-foreground)">
                        {basics.summary}
                    </p>
                ) : null}
            </header>

            {/* 핵심역량 */}
            <section className="mb-10">
                <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                    핵심역량
                </h2>
                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                    {CORE_COMPETENCIES.map((comp, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-5 py-4"
                        >
                            <div className="mb-2 flex items-center gap-2.5">
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                    {idx + 1}
                                </span>
                                <h3 className="m-0 text-base font-bold text-(--color-foreground)">
                                    {comp.title}
                                </h3>
                            </div>
                            <p className="m-0 mb-1 text-sm text-(--color-muted)">
                                <span className="font-semibold text-(--color-foreground)">
                                    경험:
                                </span>{" "}
                                {comp.situation}
                            </p>
                            <p className="m-0 mb-1 text-sm text-(--color-muted)">
                                <span className="font-semibold text-(--color-foreground)">
                                    액션:
                                </span>{" "}
                                {comp.action}
                            </p>
                            <p className="m-0 text-sm text-(--color-muted)">
                                <span className="font-semibold text-(--color-foreground)">
                                    결과:
                                </span>{" "}
                                {comp.result}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <CareerPhasesSection
                phases={resume.careerPhases?.entries ?? []}
                label={getLabel("careerPhases")}
            />

            {/* 게임 프로젝트 */}
            <ProjectsSection
                projects={gameProjects}
                label={getLabel("projects")}
                badge="게임 개발 전환"
            />

            {/* 웹 경력 */}
            {hasWebWork && (
                <section className="mb-10">
                    <div className="grid grid-cols-1 divide-y divide-(--color-border)">
                        <div className="pt-8">
                            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                                {getLabel("work")}
                            </h2>
                            <div className="relative ml-2 flex flex-col gap-7 border-l-2 border-(--color-border) pl-6">
                                {webWork.map((w, wIdx) => (
                                    <div key={wIdx} className="relative">
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
                                            {w.startDate || w.endDate ? (
                                                <p
                                                    className="m-0 mb-0.5 text-sm text-(--color-muted)"
                                                    style={{
                                                        fontVariantNumeric:
                                                            "tabular-nums",
                                                    }}
                                                >
                                                    {formatDateRange(
                                                        w.startDate,
                                                        w.endDate,
                                                        w.hideDays
                                                    )}
                                                </p>
                                            ) : null}
                                            {w.name ? (
                                                <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                                    {w.url ? (
                                                        <a
                                                            href={w.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-inherit no-underline hover:text-(--color-link)"
                                                        >
                                                            {w.name}
                                                        </a>
                                                    ) : (
                                                        w.name
                                                    )}
                                                </h3>
                                            ) : null}
                                            {w.position ? (
                                                <p className="m-0 mb-2 text-base text-(--color-muted)">
                                                    {w.position}
                                                </p>
                                            ) : null}
                                            {w.summary ? (
                                                workMarkdown[wIdx]?.summary ? (
                                                    <div
                                                        className="resume-markdown m-0 mb-2 text-base text-(--color-foreground)"
                                                        dangerouslySetInnerHTML={{
                                                            __html: workMarkdown[
                                                                wIdx
                                                            ].summary!,
                                                        }}
                                                    />
                                                ) : (
                                                    <p className="m-0 mb-2 text-base text-(--color-foreground)">
                                                        {w.summary}
                                                    </p>
                                                )
                                            ) : null}
                                            {w.highlights &&
                                            w.highlights.length > 0 ? (
                                                <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                                                    {w.highlights.map(
                                                        (h, hIdx) => (
                                                            <li
                                                                key={hIdx}
                                                                className="mb-1 text-base text-(--color-foreground)"
                                                            >
                                                                {workMarkdown[
                                                                    wIdx
                                                                ]?.highlights?.[
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
                                                                    `• ${h}`
                                                                )}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* 기술 스택 */}
            {hasSkills ? (
                <SkillsSection
                    skills={resume.skills?.entries ?? []}
                    activeJobField={activeJobField}
                    works={resume.work?.entries ?? []}
                    projects={resume.projects?.entries ?? []}
                    label={getLabel("skills")}
                    defaultView={
                        (resume.skills?.defaultView ?? "by-job-field") as any
                    }
                />
            ) : null}

            {/* 학력 — ResumeModern 카드 스타일 */}
            {hasEducation ? (
                <section className="mb-10">
                    <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                        {getLabel("education")}
                    </h2>
                    <div>
                        {education.map((edu, idx) => (
                            <div
                                key={idx}
                                className="mb-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4.5 py-3.5 last:mb-0"
                            >
                                {edu.institution ? (
                                    <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                        {edu.url ? (
                                            <a
                                                href={edu.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-inherit no-underline hover:text-(--color-link)"
                                            >
                                                {edu.institution}
                                            </a>
                                        ) : (
                                            edu.institution
                                        )}
                                    </h3>
                                ) : null}
                                {edu.studyType || edu.area ? (
                                    <div className="mb-0.5 text-base text-(--color-foreground)">
                                        {`${edu.studyType || ""}${edu.area ? " " + edu.area : ""}`}
                                    </div>
                                ) : null}
                                {edu.startDate || edu.endDate ? (
                                    <div
                                        className="mb-1 text-sm text-(--color-muted)"
                                        style={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatDateRange(
                                            edu.startDate,
                                            edu.endDate
                                        )}
                                    </div>
                                ) : null}
                                {edu.gpa != null ? (
                                    <div className="mb-1 text-sm text-(--color-muted)">
                                        GPA: {edu.gpa.toFixed(2)} /{" "}
                                        {(edu.gpaMax ?? 4.5).toFixed(2)}
                                    </div>
                                ) : edu.score ? (
                                    <div className="mb-1 text-sm text-(--color-muted)">
                                        GPA: {edu.score}
                                    </div>
                                ) : null}
                                {edu.courses && edu.courses.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {edu.courses.map((course, cIdx) => (
                                            <span
                                                key={cIdx}
                                                className="inline-block rounded bg-(--color-tag-bg) px-[0.55em] py-[0.15em] text-sm leading-normal font-medium text-(--color-tag-fg)"
                                            >
                                                {course}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {/* 언어 — ResumeModern 제네릭 그리드 스타일 */}
            {hasLanguages ? (
                <section className="mb-10">
                    <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                        {getLabel("languages")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                        {languages.map((lang, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                            >
                                {lang.language ? (
                                    <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                        {lang.language}
                                    </h3>
                                ) : null}
                                {lang.fluency ? (
                                    <div className="mb-0.5 text-base text-(--color-muted)">
                                        {lang.fluency}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {/* 수상 — ResumeModern 제네릭 그리드 스타일 */}
            {hasAwards ? (
                <section className="mb-10">
                    <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                        {getLabel("awards")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                        {awards.map((award, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                            >
                                {award.title ? (
                                    <h3 className="m-0 mb-0.5 text-lg font-bold text-(--color-foreground)">
                                        {award.title}
                                    </h3>
                                ) : null}
                                {award.awarder ? (
                                    <div className="mb-0.5 text-base text-(--color-muted)">
                                        {award.awarder}
                                    </div>
                                ) : null}
                                {award.date ? (
                                    <div
                                        className="mb-1 text-sm text-(--color-muted)"
                                        style={{
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {award.date}
                                    </div>
                                ) : null}
                                {award.summary ? (
                                    <p className="text-base text-(--color-foreground)">
                                        {award.summary}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {/* 자격증 — ResumeModern 제네릭 그리드 스타일 */}
            {hasCertificates ? (
                <section className="mb-10">
                    <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                        {getLabel("certificates")}
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                        {certificates.map((cert, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
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
            ) : null}
        </div>
    );
}
