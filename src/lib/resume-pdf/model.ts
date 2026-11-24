import { normalizePortfolioProject } from "@/lib/portfolio";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import {
    ageOn,
    educationStatus,
    endOf,
    nextDay,
    startOf,
    tenureMonths,
} from "@/lib/resume-pdf/dates";
import { PDF_LABELS } from "@/lib/resume-pdf/labels";
import { resolveEffectiveOptions } from "@/lib/resume-pdf/options";
import { firstSentence } from "@/lib/resume-pdf/text";
import { isAiAgentRow, selectProjectSlugs } from "@/lib/resume-pdf/visibility";
import {
    createWarnings,
    hasTrunkPrefixAfterCountryCode,
    UNSUPPORTED_PDF_SECTIONS,
} from "@/lib/resume-pdf/warnings";
import type { PortfolioRawRow } from "@/types/portfolio";
import type {
    Resume,
    ResumeCoreCompetency,
    ResumeProject,
    ResumeWork,
} from "@/types/resume";
import type {
    PdfProject,
    PdfWorkGroup,
    ResumePdfModel,
    ResumePdfOptions,
    ResumePdfSource,
} from "@/types/resume-pdf";

// 번역 행에 덮어쓸 구조 값: 언어와 무관한 기간·종류·링크·인원·AI 표시
const STRUCT_KEYS = [
    "projectType",
    "startDate",
    "endDate",
    "teamSize",
    "github",
    "links",
    "jobField",
    "aiAgentAchievement",
    "aiAgentStatus",
];

const mergeStruct = (
    row: PortfolioRawRow,
    base: PortfolioRawRow | undefined
): PortfolioRawRow => {
    if (!base || base === row) return row;
    const struct = Object.fromEntries(
        STRUCT_KEYS.filter((k) => k in (base.data ?? {})).map((k) => [
            k,
            base.data?.[k],
        ])
    );
    return {
        ...row,
        thumbnail: row.thumbnail ?? base.thumbnail,
        job_field: base.job_field ?? row.job_field,
        data: { ...row.data, ...struct },
    };
};

// 같은 회사 연속 근무 묶기: 다음 역할 시작 ≤ 직전 종료 다음날
const groupWork = (entries: ResumeWork[], asOf: string): PdfWorkGroup[] => {
    const sorted = entries
        .filter((w) => w.startDate)
        .sort((a, b) =>
            startOf(a.startDate!).localeCompare(startOf(b.startDate!))
        );
    const groups: { name: string; roles: ResumeWork[] }[] = [];
    for (const w of sorted) {
        const last = groups.at(-1);
        const prev = last?.roles.at(-1);
        const joined =
            last &&
            last.name === (w.name ?? "") &&
            prev?.endDate &&
            startOf(w.startDate!) <= nextDay(endOf(prev.endDate));
        if (joined) last.roles.push(w);
        else groups.push({ name: w.name ?? "", roles: [w] });
    }
    return groups
        .map((g) => {
            const first = g.roles[0];
            const last = g.roles.at(-1)!;
            return {
                name: g.name,
                location: last.location ?? "",
                start: first.startDate!,
                ...(last.endDate ? { end: last.endDate } : {}),
                months: tenureMonths(first.startDate!, last.endDate, asOf),
                roles: g.roles
                    .map((r, i) => ({
                        position: r.position ?? "",
                        employmentType: r.employmentType ?? "",
                        start: r.startDate!,
                        ...(r.endDate ? { end: r.endDate } : {}),
                        summary: r.summary ?? "",
                        highlights: r.highlights ?? [],
                        // D18: 고용형태가 바뀔 때만 전환
                        converted:
                            i > 0 &&
                            (r.employmentType ?? "") !==
                                (g.roles[i - 1].employmentType ?? ""),
                    }))
                    .reverse(),
            };
        })
        .reverse();
};

const ym7 = (value?: string) => (value ?? "").slice(0, 7);

// 공식 §4 정렬 순서: 지정 순서(같은 단 안) → 최신순
const byRankThenDate =
    (rank: Map<string, number>) => (a: PdfProject, b: PdfProject) =>
        (rank.get(a.slug) ?? Infinity) - (rank.get(b.slug) ?? Infinity) ||
        b.start.localeCompare(a.start);

const shortName = (name: string) => name.split(" — ")[0];

export const buildResumePdfModel = (
    source: ResumePdfSource,
    options: ResumePdfOptions,
    asOf: string
): ResumePdfModel => {
    const L = PDF_LABELS[source.lang];
    const eff = resolveEffectiveOptions(source, options);
    const warnings = createWarnings();
    const on = (key: string) => eff.sections.has(key);
    const jf = source.jobField;

    // 직무 필터: 사이트 함수 그대로 (D14). 소개는 공통 글로 대체하지 않음 (D8)
    const rawCore = source.resume.coreCompetencies as unknown;
    const resume: Resume = {
        ...source.resume,
        coreCompetencies: Array.isArray(rawCore)
            ? { entries: rawCore as ResumeCoreCompetency[] }
            : source.resume.coreCompetencies,
    };
    const view = createJobFieldResumeView(resume, jf);
    const introduction = source.about.introductions?.[jf];
    const override = source.profileOverrides;
    let intro = {
        description: introduction?.description ?? "",
        descriptionSub: introduction?.descriptionSub ?? "",
    };
    if (override?.summary)
        intro = { description: override.summary, descriptionSub: "" };
    if (!intro.description && !intro.descriptionSub)
        warnings.add("missing-introduction", jf);
    if (!eff.basics.summary) intro = { description: "", descriptionSub: "" };

    // 인적사항
    const vis = eff.basics;
    const raw = view.basics ?? {};
    const headline =
        override?.headline ||
        source.jobFields.find((f) => f.id === jf)?.headerTitle ||
        raw.label ||
        "";
    const loc = raw.location;
    let country: string | undefined;
    if (loc?.countryCode && loc.countryCode !== L.homeCountry) {
        country = L.countryNames[loc.countryCode];
        if (!country) warnings.add("unknown-country", loc.countryCode);
    }
    const address = [
        country,
        loc?.region,
        loc?.city,
        loc?.address,
        loc?.addressDetail,
    ]
        .filter(Boolean)
        .join(" ");
    if (vis.phone && raw.phone && hasTrunkPrefixAfterCountryCode(raw.phone))
        warnings.add("phone-trunk-prefix");
    const basics: ResumePdfModel["basics"] = {
        name: vis.name ? (raw.name ?? "") : "",
        headline: vis.headline ? headline : "",
        ...(vis.image && raw.image ? { image: raw.image } : {}),
        ...(vis.email && raw.email ? { email: raw.email } : {}),
        ...(vis.phone && raw.phone ? { phone: raw.phone } : {}),
        ...(vis.url && raw.url ? { url: raw.url } : {}),
        ...(vis.location && address ? { address } : {}),
        ...(vis.birthDate && raw.birthDate
            ? { birthDate: raw.birthDate, age: ageOn(raw.birthDate, asOf) }
            : {}),
        ...(vis.military && raw.military?.status
            ? {
                  military: {
                      status: raw.military.status,
                      start: raw.military.startDate,
                      end: raw.military.endDate,
                  },
              }
            : {}),
        profiles: vis.profiles
            ? (raw.profiles ?? [])
                  .filter((p) => p.url)
                  .map((p) => ({ network: p.network ?? "", url: p.url! }))
            : [],
    };

    // 경력
    const work = on("work")
        ? groupWork(view.work?.entries ?? [], asOf).map((g) => ({
              ...g,
              roles: g.roles.map((r) =>
                  eff.details.workHighlights ? r : { ...r, highlights: [] }
              ),
          }))
        : [];
    const groupsForCompany = groupWork(view.work?.entries ?? [], asOf);

    // 프로젝트: 사이트 기본 집합 또는 프리셋 순서 (D12). 내용은 이력서 항목 우선
    // 번역 행에 구조 값을 먼저 보충한 뒤 집합 선택 (AI 표시·직무가 구조 값)
    const base = new Map(source.portfolioBase.map((r) => [r.slug, r]));
    const merged = source.portfolio.map((r) =>
        mergeStruct(r, base.get(r.slug))
    );
    const { slugs, rank, missing } = selectProjectSlugs(
        { ...source, portfolio: merged },
        eff.projects.order
    );
    for (const slug of missing) warnings.add("missing-project", slug);
    const rows = new Map(merged.map((r) => [r.slug, r]));
    const resumeBySlug = new Map(
        (view.projects?.entries ?? [])
            .filter((r): r is ResumeProject & { portfolioSlug: string } =>
                Boolean(r.portfolioSlug)
            )
            .map((r) => [r.portfolioSlug, r])
    );
    const projects: PdfProject[] = on("projects")
        ? slugs.map((slug) => {
              const row = rows.get(slug)!;
              const p = normalizePortfolioProject(row);
              const r = resumeBySlug.get(slug);
              const rawType = r?.projectType ?? row.data?.projectType;
              const type =
                  rawType === "work" || rawType === "personal"
                      ? rawType
                      : "unknown";
              if (type === "unknown")
                  warnings.add("unknown-project-type", slug);
              const start = ym7(r?.startDate ?? p.startDate);
              const end = ym7(r?.endDate ?? p.endDate) || undefined;
              const hidden = new Set(
                  eff.projects.hiddenSubsections[slug] ?? []
              );
              let sections =
                  r?.sections?.map((s) => ({
                      title: s.title,
                      content: s.content,
                  })) ??
                  (p.outcomes.length
                      ? [
                            {
                                title: L.outcomes,
                                content: p.outcomes
                                    .map(
                                        (o) =>
                                            `- ${o.result}${o.evidence ? ` — ${o.evidence}` : ""}`
                                    )
                                    .join("\n"),
                            },
                        ]
                      : []);
              sections = sections.filter((s) => !hidden.has(s.title));
              if (eff.projects.compactPersonal && type !== "work")
                  sections = [];
              // 인원: 이력서 항목 구성 → 포트폴리오 인원 수 (시제품과 동일. 포트폴리오 구성 글은 길어 제외)
              const team = r?.teamComposition || p.teamSize || undefined;
              const links = [
                  ...new Set(
                      [r?.url, ...p.links.map((l) => l.url)].filter(Boolean)
                  ),
              ] as string[];
              const company =
                  type === "work" && on("work")
                      ? groupsForCompany.find(
                            (g) =>
                                start >= ym7(g.start) &&
                                (end ?? "9999") <= (g.end ? ym7(g.end) : "9999")
                        )?.name
                      : undefined;
              return {
                  slug,
                  name: r?.name ?? p.title,
                  start,
                  ...(end ? { end } : {}),
                  type,
                  description: r?.description ?? p.description,
                  sections,
                  tech: eff.details.projectTech
                      ? r?.keywords?.join(" · ") ||
                        p.engine ||
                        p.keywords.join(" · ")
                      : "",
                  role: p.role,
                  ...(eff.details.projectTeam && team ? { team } : {}),
                  ...(p.thumbnail ? { thumb: p.thumbnail } : {}),
                  links: eff.details.projectLinks ? links : [],
                  ...(company ? { company } : {}),
                  ai: isAiAgentRow(row),
                  planned: row.data?.aiAgentStatus === "planned",
              };
          })
        : [];
    const sort = byRankThenDate(rank);
    // 3단: 회사 → AI 에이전트(개인) → 개인. 회사 AI 항목은 회사 단에 남음
    const tiers = {
        work: projects.filter((x) => x.type === "work").sort(sort),
        ai: projects
            .filter((x) => x.type !== "work" && x.ai)
            .sort(
                (a, b) => Number(a.planned) - Number(b.planned) || sort(a, b)
            ),
        personal: projects
            .filter((x) => x.type === "personal" && !x.ai)
            .sort(sort),
        other: projects.filter((x) => x.type === "unknown" && !x.ai).sort(sort),
    };

    // AI 언급: aiAgentSummary → 없으면 설명 첫 문장 (원문만)
    const aiRemarks = tiers.ai.map((x) => ({
        slug: x.slug,
        name: shortName(x.name),
        text:
            (typeof rows.get(x.slug)?.data?.aiAgentSummary === "string"
                ? (rows.get(x.slug)!.data!.aiAgentSummary as string)
                : "") || firstSentence(x.description),
    }));

    // 핵심 역량: 제외 적용 후 첫 개인 프로젝트 관련 항목 앞에 AI 카드
    const coreBase = on("coreCompetencies")
        ? (view.coreCompetencies?.entries ?? []).filter(
              (c) => !eff.excludedCore.has(c.pdfId ?? c.title)
          )
        : [];
    const personalNames = [...tiers.personal, ...tiers.other, ...tiers.ai].map(
        (x) => shortName(x.name)
    );
    const core: ResumePdfModel["core"] = coreBase.map((c) => ({
        title: c.title,
        description: c.description,
    }));
    if (on("coreCompetencies") && aiRemarks.length) {
        const at = core.findIndex((c) =>
            personalNames.some((n) => `${c.title} ${c.description}`.includes(n))
        );
        core.splice(at === -1 ? core.length : at, 0, {
            title: L.ai,
            description: aiRemarks
                .map((a) => `- ${a.name}: ${a.text}`)
                .join("\n"),
            ai: true,
        });
    }

    for (const key of UNSUPPORTED_PDF_SECTIONS) {
        const sec = (view as Record<string, unknown>)[key] as
            | { entries?: unknown[] }
            | undefined;
        if (on(key) && sec?.entries?.length)
            warnings.add("unsupported-section", key);
    }

    const d = eff.details;
    return {
        lang: source.lang,
        asOf,
        sections: eff.sectionOrder.filter(on),
        shokumuSelfPr: d.shokumuSelfPr,
        basics,
        intro,
        aiRemarks,
        core,
        work,
        totalMonths: work.reduce((n, g) => n + g.months, 0),
        projects: tiers,
        skills: on("skills")
            ? (view.skills?.entries ?? []).map((s) => ({
                  name: s.name ?? "",
                  items: (s.keywords ?? []).map((k) => ({
                      name: k.name,
                      ...(d.skillLevel && k.level ? { level: k.level } : {}),
                  })),
              }))
            : [],
        education: on("education")
            ? (view.education?.entries ?? [])
                  .filter((e) => e.startDate)
                  .map((e) => ({
                      institution: e.institution ?? "",
                      ...(d.educationArea && e.area ? { area: e.area } : {}),
                      ...(e.studyType ? { studyType: e.studyType } : {}),
                      ...(e.location ? { location: e.location } : {}),
                      start: e.startDate!,
                      ...(e.endDate ? { end: e.endDate } : {}),
                      status: educationStatus(e.endDate, asOf),
                      ...(d.educationGpa && e.gpa != null
                          ? { gpa: `${e.gpa} / ${e.gpaMax ?? 4.5}` }
                          : {}),
                      courses: d.educationCourses ? (e.courses ?? []) : [],
                  }))
            : [],
        training: on("training")
            ? (view.training?.entries ?? []).map((t) => ({
                  title: t.title,
                  organizer: t.organizer,
                  start: t.startMonth,
                  end: t.endMonth,
              }))
            : [],
        certificates: on("certificates")
            ? (view.certificates?.entries ?? [])
                  .filter((c) => c.name)
                  .map((c) => ({
                      name: c.name!,
                      issuer: c.issuer,
                      date: c.date,
                  }))
            : [],
        awards: on("awards")
            ? (view.awards?.entries ?? [])
                  .filter((a) => a.title)
                  .map((a) => ({
                      title: a.title!,
                      awarder: a.awarder,
                      date: a.date,
                  }))
            : [],
        languages: on("languages")
            ? (view.languages?.entries ?? []).map((l) => ({
                  language: l.language ?? "",
                  fluency: l.fluency ?? "",
              }))
            : [],
        warnings: warnings.list,
    };
};
