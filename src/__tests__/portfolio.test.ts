import { describe, expect, it } from "vitest";
import {
    EDITABLE_PORTFOLIO_DATA_KEYS,
    formatPortfolioMonthRange,
    KNOWN_PORTFOLIO_DATA_KEYS,
    PRESERVED_LEGACY_DATA_KEYS,
    extractLegacyPortfolioGallery,
    groupPortfolioProjects,
    isValidPortfolioLinkUrl,
    isValidPortfolioMediaUrl,
    mergePortfolioDataPatch,
    normalizePortfolioCaseStudyContent,
    normalizePortfolioProject,
    validatePortfolioForPublish,
} from "@/lib/portfolio";
import type { PortfolioRawRow } from "@/types/portfolio";

const R2_URL = "https://portfolio-assets.example";

const createRow = (
    overrides: Partial<PortfolioRawRow> = {}
): PortfolioRawRow => ({
    slug: "project",
    title: "Project",
    description: "Description",
    tags: ["C++", "Game"],
    thumbnail: "/portfolio/project/cover.webp",
    content: "",
    data: {},
    featured: false,
    order_idx: 0,
    published: true,
    job_field: "game",
    ...overrides,
});

const validContent = `## Rendering
### 목표와 제약
Goal
### 내 역할
Contribution
### 핵심 구현
Build
### 게임 효과
Result

## Performance
### 목표와 제약
Goal
### 내 역할
Contribution
### 핵심 구현
Build
### 게임 효과
Result`;

const validV2Data = {
    caseStudyVersion: 2,
    oneLinePitch: "플레이 가능한 시스템을 구현했습니다",
    engine: "Custom C++ Engine",
    teamSize: 2,
    platforms: ["Windows"],
    ownership: ["Renderer와 gameplay loop 구현"],
    outcomes: [{ result: "Playable build 완성", evidence: "Demo 영상" }],
    gallery: [
        {
            type: "image",
            src: "/portfolio/project/result.webp",
            alt: "게임 실행 결과",
            caption: "Renderer 출력",
        },
    ],
    links: [{ kind: "demo", url: "https://example.com/demo", label: "Demo" }],
    devlogs: [{ title: "개발 기록", url: "/blog/project" }],
    credits: [{ name: "홍길동", role: "Programmer" }],
    teamComposition: "Programmer 1명(본인), Artist 1명",
};

describe("portfolio domain", () => {
    it("카드용 프로젝트 기간은 월까지만 표시", () => {
        expect(formatPortfolioMonthRange("2023-10-01", "2023-12-31")).toBe(
            "2023.10 - 2023.12"
        );
        expect(formatPortfolioMonthRange("2023-10-01", "")).toBe(
            "2023.10 - 진행 중"
        );
        expect(formatPortfolioMonthRange("", "")).toBe("기간 미정");
    });

    it("기존 Deep Dive heading을 포트폴리오 서사 heading으로 표시", () => {
        expect(
            normalizePortfolioCaseStudyContent(
                "### Problem\n### Decision\n### Implementation\n### Result\n### Trade-off",
                "web"
            )
        ).toBe(
            "### 배경과 목표\n### 담당 범위\n### 실행\n### 결과와 근거\n### 다음 단계"
        );
    });

    it("legacy와 malformed v2를 예외 없이 정규화", () => {
        const legacy = normalizePortfolioProject(
            createRow({
                data: {
                    role: "Gameplay Programmer",
                    accomplishments: ["완성", "완성", 3],
                    github: "https://github.com/example/project",
                },
            })
        );
        const malformed = normalizePortfolioProject(
            createRow({
                data: {
                    caseStudyVersion: 2,
                    gallery: [{ type: "video", src: "javascript:bad" }],
                    outcomes: "invalid",
                },
            })
        );

        expect(legacy.caseStudyVersion).toBe(1);
        expect(legacy.ownership).toEqual(["Gameplay Programmer"]);
        expect(legacy.outcomes).toEqual([{ result: "완성" }]);
        expect(legacy.links[0]?.kind).toBe("source");
        expect(malformed.caseStudyVersion).toBe(2);
        expect(malformed.gallery).toEqual([]);
    });

    it("row job_field와 row order를 우선하며 날짜와 무관하게 정렬", () => {
        const projects = [
            normalizePortfolioProject(
                createRow({
                    slug: "z-last",
                    featured: true,
                    order_idx: 2,
                    data: { startDate: "2030-01-01", jobField: "web" },
                })
            ),
            normalizePortfolioProject(
                createRow({
                    slug: "a-first",
                    featured: true,
                    order_idx: 1,
                    data: { startDate: "2020-01-01" },
                })
            ),
            normalizePortfolioProject(
                createRow({ slug: "other", featured: false, order_idx: 0 })
            ),
        ];

        const groups = groupPortfolioProjects(projects);
        expect(groups.selected.map((project) => project.slug)).toEqual([
            "a-first",
            "z-last",
        ]);
        expect(groups.other.map((project) => project.slug)).toEqual(["other"]);
        expect(projects[0].jobField).toEqual(["game", "web"]);
    });

    it("HTTPS link와 same-origin relative URL만 허용하고 media host를 제한", () => {
        expect(isValidPortfolioLinkUrl("/demo/project")).toBe(true);
        expect(isValidPortfolioLinkUrl("https://youtube.com/watch?v=1")).toBe(
            true
        );
        expect(isValidPortfolioLinkUrl("http://example.com")).toBe(false);
        expect(
            isValidPortfolioMediaUrl(
                "https://portfolio-assets.example/portfolio/a.webp",
                { r2PublicUrl: R2_URL }
            )
        ).toBe(true);
        expect(
            isValidPortfolioMediaUrl("https://youtube.com/embed/1", {
                r2PublicUrl: R2_URL,
            })
        ).toBe(false);
    });

    it("완전한 v2만 Published 검증을 통과", () => {
        const valid = validatePortfolioForPublish(
            createRow({ content: validContent, data: validV2Data }),
            { r2PublicUrl: R2_URL }
        );
        const invalid = validatePortfolioForPublish(
            createRow({
                content: "## Incomplete\n### Problem\nMissing",
                thumbnail: null,
                data: {
                    ...validV2Data,
                    engine: "",
                    gallery: [
                        {
                            type: "video",
                            src: "/portfolio/project/demo.mp4",
                            alt: "Demo",
                        },
                    ],
                },
            }),
            { r2PublicUrl: R2_URL }
        );

        expect(valid).toEqual({ valid: true, errors: [] });
        expect(invalid.valid).toBe(false);
        if (!invalid.valid) {
            expect(invalid.errors.join(" ")).toContain("Engine");
            expect(invalid.errors.join(" ")).toContain("Gallery");
            expect(invalid.errors.join(" ")).toContain("Deep Dive");
        }
    });

    it("두 명 이상 프로젝트에는 팀 구성이 필요", () => {
        const result = validatePortfolioForPublish(
            createRow({
                content: validContent,
                data: { ...validV2Data, teamComposition: "", credits: [] },
            }),
            { r2PublicUrl: R2_URL }
        );

        expect(result.errors).toContain(
            "두 명 이상인 프로젝트에는 팀 구성이 필요합니다."
        );
    });

    it("legacy HTML에서 alt가 있는 R2 image만 bounded gallery로 추출", () => {
        const gallery = extractLegacyPortfolioGallery(
            '<img src="/portfolio/a.webp" alt="A"><img src="https://evil.example/b.webp" alt="B"><img src="/portfolio/c.webp" alt="">',
            { r2PublicUrl: R2_URL }
        );
        expect(gallery).toEqual([
            { type: "image", src: "/portfolio/a.webp", alt: "A" },
        ]);
    });

    it("MCP data patch는 omitted와 unknown을 보존하고 known null만 삭제", () => {
        const current = {
            role: "Programmer",
            badges: [{ text: "Release" }],
            futureKey: { enabled: true },
        };
        expect(
            mergePortfolioDataPatch(current, {
                role: null,
                futureKey: null,
                oneLinePitch: "New pitch",
                featured: true,
            })
        ).toEqual({
            badges: [{ text: "Release" }],
            futureKey: { enabled: true },
            oneLinePitch: "New pitch",
        });
    });

    it("known key set은 editable과 preserved의 정확한 합집합", () => {
        const editable = new Set<string>(EDITABLE_PORTFOLIO_DATA_KEYS);
        const preserved = new Set<string>(PRESERVED_LEGACY_DATA_KEYS);
        expect([...editable].some((key) => preserved.has(key))).toBe(false);
        expect(new Set([...editable, ...preserved])).toEqual(
            new Set(KNOWN_PORTFOLIO_DATA_KEYS)
        );
    });
});
