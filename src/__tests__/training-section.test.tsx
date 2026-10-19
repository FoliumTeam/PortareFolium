import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TrainingSection from "@/components/resume/TrainingSection";
import ResumeClassic from "@/components/resume/ResumeClassic";
import ResumeModern from "@/components/resume/ResumeModern";
import { withContentLocale } from "@/lib/content-locale";
import { DEFAULT_RESUME_BASICS_PRESENTATION } from "@/lib/resume-basics-presentation";
import type { Resume } from "@/types/resume";

vi.mock("@/lib/supabase", () => ({
    serverClient: null,
    unscopedServerClient: null,
}));
vi.mock("@/lib/queries", () => ({ getPortfolioItem: vi.fn(async () => null) }));

describe("TrainingSection", () => {
    it("학위 표현 없이 과정명·주최·월 단위 기간을 표시한다", () => {
        const html = renderToStaticMarkup(
            <TrainingSection
                label="교육"
                entries={[
                    {
                        title: "게임 개발자 양성 과정",
                        organizer: "교육 주최사",
                        startMonth: "2026-01",
                        endMonth: "2026-07",
                        jobField: "game",
                    },
                ]}
            />
        );

        expect(html).toContain("게임 개발자 양성 과정");
        expect(html).toContain("교육 주최사");
        expect(html).toContain("2026.01 ~ 2026.07");
        expect(html).not.toContain("GPA");
    });
});

describe.each([
    ["Classic", ResumeClassic],
    ["Modern", ResumeModern],
] as const)("%s 공개 이력서의 교육 언어 경계", (_theme, Renderer) => {
    it.each([
        ["en", "Training"],
        ["ja", "研修"],
    ] as const)(
        "%s 기본 항목 이름만 번역하고 사용자 제목·CJK·기술명 보존",
        async (locale, defaultLabel) => {
            const resume: Resume = {
                training: {
                    emoji: "",
                    showEmoji: false,
                    entries: [
                        {
                            title: "저장",
                            organizer: "日本 교육 C++ / C# / TypeScript",
                            startMonth: "2026-01",
                            endMonth: "2026-07",
                            jobField: "game",
                            visible: true,
                        },
                    ],
                },
            };
            const props = {
                basicsPresentation: DEFAULT_RESUME_BASICS_PRESENTATION,
                sectionLayout: { order: ["training"], disabled: [] },
            };
            const defaultHTML = await withContentLocale(locale, async () =>
                renderToStaticMarkup(await Renderer({ ...props, resume }))
            );
            const root = document.createElement("div");
            root.innerHTML = defaultHTML;
            expect(root.querySelector("h2")?.textContent).toBe(defaultLabel);

            const custom: Resume = {
                ...resume,
                training: { ...resume.training!, label: "저장" },
            };
            root.innerHTML = await withContentLocale(locale, async () =>
                renderToStaticMarkup(
                    await Renderer({ ...props, resume: custom })
                )
            );
            expect(root.querySelector("h2")?.textContent).toBe("저장");
            expect(root.querySelector("h3")?.textContent).toBe("저장");
            expect(root.textContent).toContain(
                "日本 교육 C++ / C# / TypeScript"
            );
            expect(root.textContent).toContain("2026.01 ~ 2026.07");
        }
    );
});
