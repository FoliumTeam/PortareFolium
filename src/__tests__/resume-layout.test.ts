import { describe, it, expect } from "vitest";
import type { Resume } from "@/types/resume";
import {
    DEFAULT_RESUME_LAYOUT,
    ALL_RESUME_SECTION_KEYS,
    normalizeLayout,
    resolveSectionOrder,
} from "@/lib/resume-layout";

// 테스트용 resume 팩토리 (모든 섹션 entries 1개씩)
function makeFullResume(): Resume {
    const sec = <T>(entry: T) => ({
        emoji: "",
        showEmoji: false,
        entries: [entry],
    });
    return {
        basics: { name: "Test" },
        coreCompetencies: [{ title: "t", description: "d" }],
        careerPhases: sec({ name: "p1" }),
        work: sec({ name: "w1" }),
        projects: sec({ name: "pr1" }),
        skills: sec({ name: "s1" }),
        education: sec({ institution: "e1" }),
        volunteer: sec({ organization: "v1" }),
        awards: sec({ title: "a1" }),
        certificates: sec({ name: "c1" }),
        publications: sec({ name: "pub1" }),
        languages: sec({ language: "ko" }),
        interests: sec({ name: "i1" }),
        references: sec({ name: "r1" }),
    };
}

describe("DEFAULT_RESUME_LAYOUT", () => {
    it("order starts with the 5 default-enabled sections in spec sequence", () => {
        expect(DEFAULT_RESUME_LAYOUT.order.slice(0, 5)).toEqual([
            "coreCompetencies",
            "work",
            "projects",
            "education",
            "skills",
        ]);
    });

    it("contains all 13 controllable section keys in order", () => {
        expect(DEFAULT_RESUME_LAYOUT.order).toHaveLength(13);
        expect(new Set(DEFAULT_RESUME_LAYOUT.order)).toEqual(
            new Set(ALL_RESUME_SECTION_KEYS)
        );
    });

    it("disabled contains 8 non-default sections", () => {
        expect(DEFAULT_RESUME_LAYOUT.disabled).toHaveLength(8);
        expect(DEFAULT_RESUME_LAYOUT.disabled).toEqual(
            expect.arrayContaining([
                "careerPhases",
                "volunteer",
                "awards",
                "certificates",
                "publications",
                "languages",
                "interests",
                "references",
            ])
        );
    });
});

describe("normalizeLayout", () => {
    it("returns default when layout is null/undefined", () => {
        expect(normalizeLayout(null)).toEqual(DEFAULT_RESUME_LAYOUT);
        expect(normalizeLayout(undefined)).toEqual(DEFAULT_RESUME_LAYOUT);
    });

    it("appends missing keys to the end", () => {
        const partial = { order: ["work"], disabled: [] };
        const result = normalizeLayout(partial);
        expect(result.order[0]).toBe("work");
        expect(result.order).toHaveLength(13);
        expect(new Set(result.order)).toEqual(new Set(ALL_RESUME_SECTION_KEYS));
    });

    it("drops unknown keys from order and disabled", () => {
        const dirty = {
            order: ["work", "unknownKey", "projects"],
            disabled: ["skills", "anotherUnknown"],
        };
        const result = normalizeLayout(dirty);
        expect(result.order).not.toContain("unknownKey");
        expect(result.disabled).toEqual(["skills"]);
    });

    it("deduplicates repeated order keys", () => {
        const dup = { order: ["work", "work", "projects"], disabled: [] };
        const result = normalizeLayout(dup);
        const workOccurrences = result.order.filter((k) => k === "work").length;
        expect(workOccurrences).toBe(1);
    });
});

describe("resolveSectionOrder", () => {
    it("excludes disabled sections", () => {
        const resume = makeFullResume();
        const layout = {
            order: ["work", "projects", "skills"],
            disabled: ["projects"],
        };
        expect(resolveSectionOrder(resume, layout)).toEqual(
            expect.arrayContaining(["work", "skills"])
        );
        expect(resolveSectionOrder(resume, layout)).not.toContain("projects");
    });

    it("respects custom order", () => {
        const resume = makeFullResume();
        const layout = {
            order: ["skills", "work", "projects"],
            disabled: [
                "coreCompetencies",
                "education",
                "careerPhases",
                "volunteer",
                "awards",
                "certificates",
                "publications",
                "languages",
                "interests",
                "references",
            ],
        };
        expect(resolveSectionOrder(resume, layout)).toEqual([
            "skills",
            "work",
            "projects",
        ]);
    });

    it("skips sections with empty entries", () => {
        const resume: Resume = {
            basics: { name: "x" },
            work: { emoji: "", showEmoji: false, entries: [] },
            projects: {
                emoji: "",
                showEmoji: false,
                entries: [{ name: "p" }],
            },
        };
        const result = resolveSectionOrder(resume, DEFAULT_RESUME_LAYOUT);
        expect(result).not.toContain("work");
        expect(result).toContain("projects");
    });

    it("skips coreCompetencies when array is empty", () => {
        const resume: Resume = {
            basics: {},
            coreCompetencies: [],
            work: { emoji: "", showEmoji: false, entries: [{ name: "w" }] },
        };
        const result = resolveSectionOrder(resume, DEFAULT_RESUME_LAYOUT);
        expect(result).not.toContain("coreCompetencies");
        expect(result).toContain("work");
    });

    it("uses default layout when layout is null", () => {
        const resume = makeFullResume();
        const result = resolveSectionOrder(resume, null);
        expect(result).toEqual([
            "coreCompetencies",
            "work",
            "projects",
            "education",
            "skills",
        ]);
    });
});
