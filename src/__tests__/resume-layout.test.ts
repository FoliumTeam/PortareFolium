import { describe, it, expect, vi } from "vitest";
import type { Resume } from "@/types/resume";
import {
    DEFAULT_RESUME_LAYOUT,
    ALL_RESUME_SECTION_KEYS,
    normalizeLayout,
    resolveSectionOrder,
    getResumeSectionLabel,
} from "@/lib/resume-layout";

describe("getResumeSectionLabel", () => {
    it("qualifier보다 emoji를 항상 앞에 둔다", () => {
        expect(
            getResumeSectionLabel(
                "projects",
                { emoji: "🚀", showEmoji: true },
                "대표"
            )
        ).toBe("🚀 대표 프로젝트");
    });

    it("emoji가 비활성이면 qualifier와 label만 표시한다", () => {
        expect(
            getResumeSectionLabel(
                "projects",
                { emoji: "🚀", showEmoji: false },
                "대표"
            )
        ).toBe("대표 프로젝트");
    });

    it("일반 section도 emoji prefix 계약을 유지한다", () => {
        expect(
            getResumeSectionLabel("skills", {
                emoji: "💻",
                showEmoji: true,
            })
        ).toBe("💻 기술");
    });

    it("교육 섹션 이름을 관리자 설정으로 바꿀 수 있다", () => {
        expect(getResumeSectionLabel("training", { label: "직무 교육" })).toBe(
            "직무 교육"
        );
    });

    it.each([
        ["en", "Training", "Save"],
        ["ja", "研修", "保存"],
    ])(
        "%s 기본 교육 이름만 번역하고 사용자 지정 이름 보존",
        (_locale, training, save) => {
            const messages: Record<string, string> = {
                교육: training,
                저장: save,
            };
            const translate = vi.fn((text: string) => messages[text] ?? text);

            expect(
                getResumeSectionLabel(
                    "training",
                    undefined,
                    undefined,
                    translate
                )
            ).toBe(training);
            expect(
                getResumeSectionLabel(
                    "training",
                    { label: "저장" },
                    undefined,
                    translate
                )
            ).toBe("저장");
            expect(translate).not.toHaveBeenCalledWith("저장");
        }
    );

    it("빈 사용자 지정 이름은 번역된 기본 교육 이름으로 복구", () => {
        const translate = (text: string) =>
            text === "교육" ? "Training" : text;
        expect(
            getResumeSectionLabel(
                "training",
                { label: "  " },
                undefined,
                translate
            )
        ).toBe("Training");
    });

    it("비어 있지 않은 사용자 지정 이름의 양끝 공백까지 원문 보존", () => {
        expect(
            getResumeSectionLabel(
                "training",
                { label: "  저장  " },
                undefined,
                () => "Save"
            )
        ).toBe("  저장  ");
    });

    it("사용자 지정 이름에 qualifier 번역과 emoji 순서만 적용", () => {
        const messages: Record<string, string> = {
            대표: "Featured",
            저장: "Save",
        };
        expect(
            getResumeSectionLabel(
                "training",
                { label: "저장", emoji: "📚", showEmoji: true },
                "대표",
                (text) => messages[text] ?? text
            )
        ).toBe("📚 Featured 저장");
    });
});

// 테스트용 resume 팩토리 (모든 섹션 entries 1개씩)
function makeFullResume(): Resume {
    const sec = <T>(entry: T) => ({
        emoji: "",
        showEmoji: false,
        entries: [entry],
    });
    return {
        basics: { name: "Test" },
        coreCompetencies: {
            emoji: "",
            showEmoji: false,
            entries: [{ title: "t", description: "d" }],
        },
        careerPhases: sec({ name: "p1" }),
        work: sec({ name: "w1" }),
        projects: sec({ name: "pr1" }),
        skills: sec({ name: "s1" }),
        education: sec({ institution: "e1" }),
        training: sec({
            title: "t1",
            organizer: "o1",
            startMonth: "2026-01",
            endMonth: "2026-07",
            jobField: "game",
        }),
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
    it("order starts with the default-enabled sections in spec sequence", () => {
        expect(DEFAULT_RESUME_LAYOUT.order.slice(0, 6)).toEqual([
            "coreCompetencies",
            "work",
            "projects",
            "education",
            "training",
            "skills",
        ]);
    });

    it("contains all 14 controllable section keys in order", () => {
        expect(DEFAULT_RESUME_LAYOUT.order).toHaveLength(14);
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
        expect(result.order).toHaveLength(14);
        expect(new Set(result.order)).toEqual(new Set(ALL_RESUME_SECTION_KEYS));
    });

    it("기존 레이아웃에는 교육 섹션을 학력 바로 뒤에 배치한다", () => {
        const result = normalizeLayout({
            order: ["education", "skills"],
            disabled: [],
        });
        expect(result.order.slice(0, 3)).toEqual([
            "education",
            "training",
            "skills",
        ]);
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
                "training",
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
        const resume = {
            basics: {},
            coreCompetencies: [],
            work: { emoji: "", showEmoji: false, entries: [{ name: "w" }] },
        } as unknown as Resume;
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
            "training",
            "skills",
        ]);
    });
});
