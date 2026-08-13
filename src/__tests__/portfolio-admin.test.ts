import { describe, expect, it } from "vitest";
import {
    buildPortfolioSavePayload,
    createPortfolioTemplateForm,
    itemToPortfolioForm,
    type PortfolioAdminItem,
} from "@/lib/portfolio-admin";
import {
    EDITABLE_PORTFOLIO_DATA_KEYS,
    KNOWN_PORTFOLIO_DATA_KEYS,
} from "@/types/portfolio";

const item: PortfolioAdminItem = {
    id: "item-1",
    slug: "project",
    title: "Project",
    description: "Description",
    tags: ["C++", "Game"],
    thumbnail: "/portfolio/project/cover.webp",
    content: "## One",
    data: {
        startDate: "2025-01-01",
        endDate: "2025-02-01",
        goal: "Goal",
        role: "Programmer",
        teamSize: 2,
        github: "https://github.com/example/project",
        liveUrl: "https://example.com/demo",
        accomplishments: ["Result"],
        jobField: ["game"],
        badges: [{ text: "Release", nested: { order: [2, 1] } }],
        keywords: ["One", { nested: true }, "Two"],
        caseStudyVersion: 2,
        oneLinePitch: "Pitch",
        ownership: ["System owner"],
        outcomes: [{ result: "Done", evidence: "Video" }],
        gallery: [
            {
                type: "image",
                src: "/portfolio/project/proof.webp",
                alt: "Proof",
                caption: "Result",
            },
        ],
        links: [
            {
                kind: "release",
                url: "https://example.com/release",
                label: "Release",
            },
        ],
        devlogs: [{ title: "Log", url: "/blog/log" }],
        engine: "Custom Engine",
        platforms: ["Windows"],
        credits: [{ name: "Member", role: "Artist", url: "/about" }],
        projectType: "personal",
        teamComposition: "Programmer 1명(본인), Artist 1명",
        futureKey: { nested: ["keep", { order: 2 }] },
    },
    featured: true,
    order_idx: 3,
    published: false,
    job_field: "game",
    meta_title: "Meta",
    meta_description: "Meta Description",
    og_image: "/portfolio/project/og.webp",
};

describe("portfolio admin projection", () => {
    it("unchanged round-trip에서 known, preserved, unknown data를 유지", () => {
        const form = itemToPortfolioForm(item);
        const payload = buildPortfolioSavePayload(form, item.data);

        for (const key of KNOWN_PORTFOLIO_DATA_KEYS.filter(
            (key) =>
                ![
                    "caseStudyStyle",
                    "featuredByJobField",
                    "featuredOrderByJobField",
                ].includes(key)
        )) {
            expect(payload.data).toHaveProperty(key);
        }
        expect(payload.data.badges).toEqual(item.data.badges);
        expect(payload.data.keywords).toEqual(item.data.keywords);
        expect(payload.data.futureKey).toEqual(item.data.futureKey);
        expect(payload.featured).toBe(true);
        expect(payload.order_idx).toBe(3);
        expect(payload.job_field).toEqual(["game"]);
    });

    it("row job_field를 legacy data.jobField보다 우선", () => {
        const form = itemToPortfolioForm({
            ...item,
            job_field: "game",
            data: { ...item.data, jobField: ["web"] },
        });

        expect(form.jobField).toEqual(["game"]);
        expect(buildPortfolioSavePayload(form, item.data).job_field).toEqual([
            "game",
        ]);
    });

    it.each([
        "startDate",
        "endDate",
        "goal",
        "role",
        "github",
        "liveUrl",
        "oneLinePitch",
        "engine",
    ] as const)("빈 string은 저장 시 %s key를 제거", (key) => {
        const form = { ...itemToPortfolioForm(item), [key]: "" };
        const payload = buildPortfolioSavePayload(form, item.data);
        expect(payload.data).not.toHaveProperty(key);
    });

    it("v2 template은 unpublished이며 autosave 전 insert가 필요 없는 form만 생성", () => {
        const form = createPortfolioTemplateForm(7, ["game"]);
        expect(form.caseStudyVersion).toBe(2);
        expect(form.published).toBe(false);
        expect(form.order_idx).toBe(7);
        expect(form.content.split("{/*")[0].match(/^## /gm)).toHaveLength(2);
        expect(form.content).toContain("### 목표와 제약");
        expect(form.gallery).toEqual([]);
    });

    it("복수 직무 v2 항목은 web 사례 계약을 기본으로 저장", () => {
        const form = createPortfolioTemplateForm(7, ["web", "game"]);
        const payload = buildPortfolioSavePayload(form, {});

        expect(form.content).toContain("### 배경과 목표");
        expect(payload.data.caseStudyStyle).toBe("web");
        expect(payload.job_field).toEqual(["web", "game"]);
    });

    it("미완성 v2 Draft 편집 행을 저장 후에도 유지", () => {
        const form = {
            ...createPortfolioTemplateForm(7, ["game"]),
            outcomes: [{ result: "", evidence: "" }],
            gallery: [
                {
                    type: "video" as const,
                    src: "/portfolio/project/demo.mp4",
                    poster: "",
                    alt: "",
                    caption: "",
                },
            ],
            links: [{ kind: "demo" as const, url: "", label: "" }],
            devlogs: [{ title: "", url: "" }],
            credits: [{ name: "", role: "", url: "" }],
        };

        const payload = buildPortfolioSavePayload(form, {});
        const reloaded = itemToPortfolioForm({
            ...item,
            published: false,
            data: payload.data,
        });

        expect(reloaded.outcomes).toEqual(form.outcomes);
        expect(reloaded.gallery).toEqual(form.gallery);
        expect(reloaded.links).toEqual(form.links);
        expect(reloaded.devlogs).toEqual(form.devlogs);
        expect(reloaded.credits).toEqual(form.credits);
    });

    it("editable key를 제거한 뒤 현재 form만 재구성", () => {
        const form = itemToPortfolioForm(item);
        const cleared = {
            ...form,
            caseStudyVersion: 1 as const,
            accomplishments: "",
            jobField: [],
            teamSize: "",
        };
        const payload = buildPortfolioSavePayload(cleared, item.data);

        expect(payload.data).not.toHaveProperty("caseStudyVersion");
        expect(payload.data).not.toHaveProperty("accomplishments");
        expect(payload.data).not.toHaveProperty("jobField");
        expect(payload.data).not.toHaveProperty("teamSize");
        expect(payload.data.badges).toEqual(item.data.badges);
        expect(payload.data.keywords).toEqual(item.data.keywords);
        expect(new Set(EDITABLE_PORTFOLIO_DATA_KEYS).has("badges")).toBe(false);
    });

    it("Legacy 항목도 프로젝트 구분을 저장", () => {
        const form = {
            ...itemToPortfolioForm(item),
            caseStudyVersion: 1 as const,
            projectType: "work" as const,
        };

        const payload = buildPortfolioSavePayload(form, item.data);

        expect(payload.data.projectType).toBe("work");
        expect(payload.data).not.toHaveProperty("caseStudyVersion");
    });
});
