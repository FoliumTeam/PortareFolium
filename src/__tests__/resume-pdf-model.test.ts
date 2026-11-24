import { describe, expect, it } from "vitest";
import { buildResumePdfModel } from "@/lib/resume-pdf/model";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import {
    buildJobFieldSource,
    buildProfileSource,
} from "@/lib/resume-pdf/source";
import type { ResumePdfModel } from "@/types/resume-pdf";
import {
    aboutRow,
    ASOF,
    configRows,
    portfolioRows,
    resumeRow,
} from "./resume-pdf-fixture";

const source = (
    over: Partial<Parameters<typeof buildJobFieldSource>[0]> = {}
) =>
    buildJobFieldSource({
        lang: "ko",
        jobField: "web",
        resume: resumeRow(),
        about: aboutRow(),
        portfolio: portfolioRows(),
        config: configRows(),
        ...over,
    });

const build = (raw: unknown = {}, src = source()) =>
    buildResumePdfModel(src, normalizePdfOptions(raw), ASOF);

const slugs = (m: ResumePdfModel) =>
    Object.fromEntries(
        Object.entries(m.projects).map(([k, list]) => [
            k,
            list.map((p) => p.slug),
        ])
    );

describe("이력서 PDF 모델 — 직무 필터와 기본값", () => {
    it("다른 직무와 직무 미지정 경력은 제외 (V3, D14)", () => {
        const m = build();
        expect(m.work.map((g) => g.name)).toEqual(["Acme"]);
        expect(JSON.stringify(m)).not.toContain("Globex");
        expect(JSON.stringify(m)).not.toContain("NoField");
        expect(m.skills[0].items.map((i) => i.name)).toEqual(["React"]);
    });

    it("같은 회사 연속 근무를 묶고 고용형태가 바뀌면 전환 표시 (D18)", () => {
        const [acme] = build().work;
        expect(acme.roles.map((r) => [r.position, r.converted])).toEqual([
            ["Engineer", true],
            ["Intern", false],
        ]);
        expect(acme.start).toBe("2023-01-01");
        expect(acme.end).toBeUndefined();
    });

    it("총 경력 = 회사별 표시값의 합", () => {
        const m = build();
        expect(m.totalMonths).toBe(m.work.reduce((n, g) => n + g.months, 0));
        expect(m.work[0].months).toBe(46);
    });

    it("기본 프로젝트 집합 = 사이트 대표 목록 + AI 항목, 미공개·다른 직무 제외", () => {
        const m = build();
        expect(slugs(m)).toEqual({
            work: ["proj-work"],
            ai: ["agent-kit", "agent-plan"],
            personal: ["proj-new", "proj-old"],
            other: ["no-type"],
        });
        expect(m.warnings).toContainEqual({
            code: "unknown-project-type",
            detail: "no-type",
        });
    });

    it("회사 프로젝트는 재직 기간 안 회사에 연결", () => {
        expect(build().projects.work[0].company).toBe("Acme");
    });

    it("이력서 프로젝트 항목이 포트폴리오 내용보다 우선 (D12)", () => {
        const p = build().projects.work[0];
        expect(p.name).toBe("Shop Revamp");
        expect(p.tech).toBe("React · Node");
        expect(p.team).toBe("FE 2, BE 1");
        expect(p.sections.map((s) => s.title)).toEqual(["Result", "Notes"]);
    });

    it("이력서 항목이 없으면 포트폴리오 성과로 섹션 생성", () => {
        const p = build().projects.personal.find((x) => x.slug === "proj-new")!;
        expect(p.sections).toEqual([
            { title: "주요 성과", content: "- Shipped — 1k users" },
        ]);
    });

    it("AI 항목: 구현 완료 먼저, 기획 단계 뒤, 요약 문구 우선", () => {
        const m = build();
        expect(m.projects.ai.map((p) => p.planned)).toEqual([false, true]);
        expect(m.aiRemarks).toEqual([
            {
                slug: "agent-kit",
                name: "Agent Kit",
                text: "Runs agents safely.",
            },
            {
                slug: "agent-plan",
                name: "agent-plan title",
                text: "agent-plan description.",
            },
        ]);
    });

    it("AI 카드는 첫 개인 프로젝트 관련 역량 앞에 삽입", () => {
        expect(build().core.map((c) => c.title)).toEqual([
            "Scaling web apps",
            "AI 에이전트 성과",
            "Side tooling",
        ]);
    });

    it("직무 소개 사용, 없으면 비우고 경고 (D8)", () => {
        expect(build().intro).toEqual({
            description: "Web intro.",
            descriptionSub: "Web sub.",
        });
        const m = build({}, source({ about: { description: "Generic" } }));
        expect(m.intro).toEqual({ description: "", descriptionSub: "" });
        expect(m.warnings).toContainEqual({
            code: "missing-introduction",
            detail: "web",
        });
    });

    it("인적사항: 사이트 표시 설정 + 직무 머리글, 나이·학력 상태 계산", () => {
        const m = build();
        expect(m.basics.headline).toBe("Web Engineer");
        expect(m.basics.age).toBe(30);
        expect(m.basics.military?.status).toBe("Completed");
        expect(m.education.map((e) => e.status)).toEqual([
            "graduated",
            "enrolled",
            "expected",
        ]);
        expect(m.education[0].gpa).toBe("3.9 / 4");
    });

    it("미지원 섹션 경고 (D9)", () => {
        expect(build().warnings).toContainEqual({
            code: "unsupported-section",
            detail: "volunteer",
        });
    });

    it("빈 입력도 실패하지 않음 (N1)", () => {
        const m = build(
            {},
            source({ resume: null, about: null, portfolio: null, config: [] })
        );
        expect(m.work).toEqual([]);
        expect(m.basics.name).toBe("");
    });
});

describe("이력서 PDF 모델 — PDF 덮어쓰기", () => {
    it("GPA·수강 과목 숨김", () => {
        const m = build({
            details: { educationGpa: false, educationCourses: false },
        });
        expect(m.education[0].gpa).toBeUndefined();
        expect(m.education[0].courses).toEqual([]);
        expect(JSON.stringify(m)).not.toContain("3.9");
    });

    it("섹션·인적사항 덮어쓰기는 이 PDF에만 적용", () => {
        const cfg = configRows();
        const before = JSON.stringify(cfg);
        const m = build(
            { sections: { work: false }, basics: { birthDate: false } },
            source({ config: cfg })
        );
        expect(m.work).toEqual([]);
        expect(m.sections).not.toContain("work");
        expect(m.basics.birthDate).toBeUndefined();
        expect(JSON.stringify(cfg)).toBe(before);
    });

    it("경력을 숨기면 회사 프로젝트는 회사 연결 없이 남음", () => {
        const p = build({ sections: { work: false } }).projects.work[0];
        expect(p.company).toBeUndefined();
    });

    it("바꾸지 않은 값은 사이트 설정 변경을 따라감", () => {
        const preset = { basics: { phone: false } };
        const cfg = configRows().map((r) =>
            r.key === "resume_basics_presentation"
                ? {
                      ...r,
                      value: { shared: { visibility: { birthDate: false } } },
                  }
                : r
        );
        const m = build(preset, source({ config: cfg }));
        expect(m.basics.birthDate).toBeUndefined();
        expect(m.basics.phone).toBeUndefined();
        expect(m.basics.email).toBe("person@example.test");
    });

    it("프로젝트 순서 지정은 같은 단 안에서만 적용, 회사가 항상 먼저", () => {
        const m = build({
            projects: {
                order: ["proj-old", "agent-kit", "proj-work", "proj-new"],
            },
        });
        expect(slugs(m)).toEqual({
            work: ["proj-work"],
            ai: ["agent-kit"],
            personal: ["proj-old", "proj-new"],
            other: [],
        });
    });

    it("순서 목록의 다른 직무·없는 항목은 제외하고 없는 항목은 경고", () => {
        const m = build({
            projects: { order: ["game-only", "ghost", "proj-new"] },
        });
        expect(slugs(m).personal).toEqual(["proj-new"]);
        expect(m.warnings).toContainEqual({
            code: "missing-project",
            detail: "ghost",
        });
    });

    it("프로젝트를 숨기면 AI 언급·AI 카드에서도 빠짐 (숨김 전파)", () => {
        const m = build({ projects: { order: ["proj-work", "proj-new"] } });
        expect(m.aiRemarks).toEqual([]);
        expect(m.core.some((c) => c.ai)).toBe(false);
        expect(JSON.stringify(m)).not.toContain("Runs agents safely");
    });

    it("하위 섹션 숨김과 개인 프로젝트 압축", () => {
        const m = build({
            projects: {
                hiddenSubsections: { "proj-work": ["Notes"] },
                compactPersonal: true,
            },
        });
        expect(m.projects.work[0].sections.map((s) => s.title)).toEqual([
            "Result",
        ]);
        expect(m.projects.personal.every((p) => p.sections.length === 0)).toBe(
            true
        );
    });

    it("핵심 역량 제외: pdfId 우선, 없으면 제목", () => {
        const m = build({
            details: { excludedCore: ["core-side", "Scaling web apps"] },
        });
        expect(m.core.map((c) => c.title)).toEqual(["AI 에이전트 성과"]);
    });

    it("기술 수준·성과 목록·프로젝트 링크 숨김", () => {
        const m = build({
            details: {
                skillLevel: false,
                workHighlights: false,
                projectLinks: false,
                projectTech: false,
            },
        });
        expect(m.skills[0].items[0].level).toBeUndefined();
        expect(m.work[0].roles.every((r) => r.highlights.length === 0)).toBe(
            true
        );
        expect(m.projects.work[0].links).toEqual([]);
        expect(m.projects.work[0].tech).toBe("");
    });
});

describe("이력서 PDF 모델 — 지원 프로필과 번역", () => {
    it("프로필 overrides가 프리셋보다 먼저 적용", () => {
        const src = buildProfileSource({
            lang: "ko",
            snapshot: {
                jobField: "web",
                resume: resumeRow(),
                about: aboutRow(),
                portfolio: portfolioRows(),
                posts: [],
                sourceHash: "x",
            },
            overrides: {
                excludedPortfolioSlugs: ["proj-old"],
                portfolioOrder: ["proj-new"],
                excludedPostSlugs: [],
                postOrder: [],
                headline: "Profile Headline",
                summary: "Profile summary.",
            },
            config: configRows(),
        });
        const m = build({}, src);
        expect(slugs(m).personal).toEqual(["proj-new"]);
        expect(m.basics.headline).toBe("Profile Headline");
        expect(m.intro.description).toBe("Profile summary.");
        // 프리셋 순서에 제외 항목을 넣어도 프로필 제외가 우선
        expect(
            slugs(build({ projects: { order: ["proj-old", "proj-new"] } }, src))
                .personal
        ).toEqual(["proj-new"]);
    });

    it("번역 행 글자 + ko 원본 구조 값", () => {
        const ja = portfolioRows().map((r) =>
            r.slug === "agent-kit"
                ? {
                      ...r,
                      title: "エージェントキット",
                      data: { aiAgentSummary: "安全に実行。" },
                  }
                : r
        );
        const m = build(
            {},
            source({
                lang: "ja",
                portfolio: ja,
                portfolioBase: portfolioRows(),
            })
        );
        const kit = m.projects.ai.find((p) => p.slug === "agent-kit")!;
        expect(kit.name).toBe("エージェントキット");
        expect(kit.start).toBe("2025-01");
        expect(m.aiRemarks[0].text).toBe("安全に実行。");
        expect(m.core.find((c) => c.ai)?.title).toBe("AIエージェント実績");
    });

    it("ja 주소: 일본 밖이면 국가명 앞에 표기, 표에 없으면 경고 (R4)", () => {
        expect(build({}, source({ lang: "ja" })).basics.address).toBe(
            "大韓民国 Seoul Mapo"
        );
        const r = resumeRow();
        r.basics!.location!.countryCode = "ZZ";
        expect(
            build({}, source({ lang: "ja", resume: r })).warnings
        ).toContainEqual({
            code: "unknown-country",
            detail: "ZZ",
        });
    });

    it("국제번호 뒤 0이 붙은 전화번호 경고", () => {
        const r = resumeRow();
        r.basics!.phone = "(+82) 010-0000-0000";
        expect(build({}, source({ resume: r })).warnings).toContainEqual({
            code: "phone-trunk-prefix",
        });
        expect(
            build().warnings.some((w) => w.code === "phone-trunk-prefix")
        ).toBe(false);
    });
});
