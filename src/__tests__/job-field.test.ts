import { describe, it, expect } from "vitest";
import {
    filterByJobField,
    matchesJobField,
    dedupeJobFieldsById,
    normalizeJobFieldValue,
    normalizeJobFieldList,
    normalizeUniqueJobFieldList,
    getInitialJobFieldSelection,
} from "@/lib/job-field";
import {
    createJobFieldResumeView,
    inheritResumeJobField,
    removeResumeJobField,
} from "@/lib/resume-job-field";

// ─────────────────────────────────────────────
// filterByJobField
// ─────────────────────────────────────────────
// 이력서 페이지(resume/page.tsx)에서 사용.
// 활성 직무 분야(jobField)와 일치하는 항목만 남긴다.
// jobField 없음 / 빈 배열 → 제외 (=프런트엔드 미노출).
// ─────────────────────────────────────────────

describe("filterByJobField", () => {
    const items = [
        { name: "A", jobField: "game" },
        { name: "B", jobField: ["game", "web"] },
        { name: "C", jobField: "web" },
        { name: "D", jobField: [] as string[] },
        { name: "E" }, // jobField 없음
        { name: "F", jobField: null as unknown as string },
    ];

    it("활성 직무 분야(game)와 문자열이 일치하는 항목 포함", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).toContain("A");
    });

    it("배열에 활성 직무 분야가 포함된 항목 포함", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).toContain("B");
    });

    it("다른 직무 분야(web 전용) 항목 제외", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).not.toContain("C");
    });

    it("빈 배열(jobField: []) 항목 제외", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).not.toContain("D");
    });

    it("jobField 필드 자체가 없는 항목 제외", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).not.toContain("E");
    });

    it("jobField가 null인 항목 제외", () => {
        const result = filterByJobField(items, "game");
        expect(result.map((i) => i.name)).not.toContain("F");
    });

    it("빈 배열 입력 시 빈 배열 반환", () => {
        expect(filterByJobField([], "game")).toEqual([]);
    });

    it("undefined 입력 시 빈 배열 반환", () => {
        expect(filterByJobField(undefined, "game")).toEqual([]);
    });
});

// ─────────────────────────────────────────────
// matchesJobField
// ─────────────────────────────────────────────
// ResumePanel의 리스트 필터에서 사용.
// 단일 항목의 jobField가 필터 값과 일치하는지 확인.
// ─────────────────────────────────────────────

describe("matchesJobField", () => {
    it("문자열 jobField가 필터와 일치하면 true", () => {
        expect(matchesJobField("game", "game")).toBe(true);
    });

    it("문자열 jobField가 필터와 다르면 false", () => {
        expect(matchesJobField("web", "game")).toBe(false);
    });

    it("배열 jobField에 필터가 포함되면 true", () => {
        expect(matchesJobField(["game", "web"], "game")).toBe(true);
    });

    it("배열 jobField에 필터가 없으면 false", () => {
        expect(matchesJobField(["web", "design"], "game")).toBe(false);
    });

    it("undefined이면 false", () => {
        expect(matchesJobField(undefined, "game")).toBe(false);
    });

    it("빈 배열이면 false", () => {
        expect(matchesJobField([], "game")).toBe(false);
    });

    it("빈 문자열 jobField이면 false", () => {
        expect(matchesJobField("", "game")).toBe(false);
    });
});

// ─────────────────────────────────────────────
// normalize / initial selection helpers (v0.12.9)
// ─────────────────────────────────────────────
// 잘못 저장된 `"game"` (JSON.stringify 결과) 형태의 값이
// `game`으로 정규화되고, 신규 생성 기본값이 `["game"]`이 되는지 검증.

describe("normalizeJobFieldValue", () => {
    it("이중 문자열화된 값을 원래 문자열로 복원", () => {
        expect(normalizeJobFieldValue('"game"')).toBe("game");
    });

    it("정상 문자열은 그대로 반환", () => {
        expect(normalizeJobFieldValue("game")).toBe("game");
    });

    it("null/undefined/빈 문자열은 빈 문자열 반환", () => {
        expect(normalizeJobFieldValue(null)).toBe("");
        expect(normalizeJobFieldValue(undefined)).toBe("");
        expect(normalizeJobFieldValue("")).toBe("");
    });
});

describe("normalizeJobFieldList", () => {
    it("배열의 각 원소를 정규화", () => {
        expect(normalizeJobFieldList(['"game"', "web"])).toEqual([
            "game",
            "web",
        ]);
    });

    it("단일 문자열을 1-원소 배열로 변환 후 정규화", () => {
        expect(normalizeJobFieldList('"game"')).toEqual(["game"]);
    });

    it("null/undefined는 빈 배열", () => {
        expect(normalizeJobFieldList(null)).toEqual([]);
        expect(normalizeJobFieldList(undefined)).toEqual([]);
    });
});

describe("normalizeUniqueJobFieldList", () => {
    it("정규화 후 중복된 직무 분야 id를 제거", () => {
        expect(normalizeUniqueJobFieldList(['"game"', "game", "web"])).toEqual([
            "game",
            "web",
        ]);
    });
});

describe("dedupeJobFieldsById", () => {
    it("중복 id가 있는 job field 선택지를 첫 항목 기준으로 안정화", () => {
        expect(
            dedupeJobFieldsById([
                { id: "game", name: "Game" },
                { id: "game", name: "Game duplicate" },
                { id: "web", name: "Web" },
            ])
        ).toEqual([
            { id: "game", name: "Game" },
            { id: "web", name: "Web" },
        ]);
    });
});

describe("getInitialJobFieldSelection", () => {
    it("이중 문자열화된 active 값도 ['game']으로 정규화", () => {
        expect(getInitialJobFieldSelection('"game"')).toEqual(["game"]);
    });

    it("정상 active 값은 1-원소 배열로 래핑", () => {
        expect(getInitialJobFieldSelection("game")).toEqual(["game"]);
    });

    it("active 값이 비어있으면 빈 배열", () => {
        expect(getInitialJobFieldSelection(null)).toEqual([]);
        expect(getInitialJobFieldSelection(undefined)).toEqual([]);
        expect(getInitialJobFieldSelection("")).toEqual([]);
    });
});

describe("resume job field cascade helpers", () => {
    it("섹션 entries 구조에서 삭제 대상 jobField만 제거", () => {
        const resume = {
            projects: {
                emoji: "🚀",
                showEmoji: true,
                entries: [
                    { name: "A", jobField: ["web", "nexon"] },
                    { name: "B", description: "Nexon API", jobField: "nexon" },
                ],
            },
        };

        expect(removeResumeJobField(resume, "nexon")).toEqual({
            projects: {
                emoji: "🚀",
                showEmoji: true,
                entries: [
                    { name: "A", jobField: ["web"] },
                    {
                        name: "B",
                        description: "Nexon API",
                        jobField: undefined,
                    },
                ],
            },
        });
    });

    it("legacy 배열 구조에도 신규 jobField를 상속", () => {
        const resume = {
            projects: [{ name: "A", jobField: ["web", "game"] }],
        };

        expect(inheritResumeJobField(resume, "game", "nexon")).toEqual({
            projects: [{ name: "A", jobField: ["web", "game", "nexon"] }],
        });
    });
});

describe("createJobFieldResumeView", () => {
    it("web mode에서 game 전용 Resume 데이터와 기술을 제거", () => {
        const result = createJobFieldResumeView(
            {
                basics: {
                    label: "게임 개발자",
                    summary: "게임 개발 경력",
                },
                work: {
                    emoji: "💼",
                    showEmoji: true,
                    entries: [
                        { name: "Web work", jobField: "web" },
                        { name: "Game work", jobField: "game" },
                    ],
                },
                projects: {
                    emoji: "🚀",
                    showEmoji: true,
                    entries: [
                        {
                            name: "Web project",
                            jobField: ["web", "game"],
                        },
                        { name: "Game project", jobField: "game" },
                    ],
                },
                careerPhases: {
                    emoji: "🧭",
                    showEmoji: true,
                    entries: [
                        { name: "Web phase", jobField: "web" },
                        { name: "Game phase", jobField: "game" },
                    ],
                },
                skills: {
                    emoji: "💻",
                    showEmoji: true,
                    entries: [
                        {
                            name: "Development",
                            keywords: [
                                { name: "React", jobField: "web" },
                                { name: "Unreal", jobField: "game" },
                            ],
                        },
                    ],
                },
                coreCompetencies: {
                    entries: [
                        {
                            title: "Web core",
                            description: "Web",
                            jobField: "web",
                        },
                        {
                            title: "Game core",
                            description: "Game",
                            jobField: "game",
                        },
                    ],
                },
            },
            "web",
            {
                description: "웹 풀스택 개발자",
                descriptionSub: "제품 개발 경험",
            }
        );

        expect(result.basics).toEqual({
            label: undefined,
            summary: "웹 풀스택 개발자\n제품 개발 경험",
        });
        expect(result.work?.entries.map((item) => item.name)).toEqual([
            "Web work",
        ]);
        expect(result.projects?.entries.map((item) => item.name)).toEqual([
            "Web project",
        ]);
        expect(result.careerPhases).toBeUndefined();
        expect(
            result.skills?.entries[0]?.keywords?.map((item) => item.name)
        ).toEqual(["React"]);
        expect(
            result.coreCompetencies?.entries.map((item) => item.title)
        ).toEqual(["Web core"]);
    });

    it("game mode에서 웹 경력과 게임 전환 단계를 함께 유지", () => {
        const result = createJobFieldResumeView(
            {
                careerPhases: {
                    emoji: "🧭",
                    showEmoji: true,
                    entries: [
                        { phase: 1, name: "Web phase", jobField: "web" },
                        {
                            phase: 2,
                            name: "Game phase",
                            jobField: "game",
                        },
                    ],
                },
            },
            "game"
        );

        expect(result.careerPhases?.entries.map((item) => item.name)).toEqual([
            "Web phase",
            "Game phase",
        ]);
    });
});
