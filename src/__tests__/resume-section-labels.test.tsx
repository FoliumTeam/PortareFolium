import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import LanguagesSection from "@/components/resume/LanguagesSection";
import SkillsSection from "@/components/resume/SkillsSection";
import CareerPhasesSection from "@/components/resume/CareerPhasesSection";
import AwardsSection from "@/components/resume/AwardsSection";
import ProjectsSection from "@/components/resume/ProjectsSection";
import { withContentLocale } from "@/lib/content-locale";
import { getResumeSectionLabel } from "@/lib/resume-layout";
import { getServerUIMessages, serverT } from "@/lib/server-i18n";

vi.mock("@/lib/supabase", () => ({
    serverClient: null,
    unscopedServerClient: null,
}));
vi.mock("@/lib/queries", () => ({ getPortfolioItem: vi.fn(async () => null) }));

type Example = {
    name: string;
    section: string;
    labels: { en: string; ja: string };
    render: (label: string) => ReactNode | Promise<ReactNode>;
    renderDefault?: () => ReactNode | Promise<ReactNode>;
};

const examples: Example[] = [
    {
        name: "LanguagesSection",
        section: "languages",
        labels: { en: "Language", ja: "言語" },
        render: (label) => (
            <LanguagesSection
                label={label}
                languages={[{ language: "ja", fluency: "저장" }]}
            />
        ),
    },
    {
        name: "SkillsSection",
        section: "skills",
        labels: { en: "Skills", ja: "技術" },
        render: (label) => (
            <SkillsSection
                label={label}
                skills={[{ name: "C++ / C#", keywords: [] }]}
            />
        ),
        renderDefault: () => (
            <SkillsSection skills={[{ name: "C++ / C#", keywords: [] }]} />
        ),
    },
    {
        name: "CareerPhasesSection",
        section: "careerPhases",
        labels: { en: "Career timeline", ja: "キャリアのタイムライン" },
        render: (label) => (
            <CareerPhasesSection
                label={label}
                phases={[{ phase: 1, name: "저장" }]}
            />
        ),
        renderDefault: () => (
            <CareerPhasesSection phases={[{ phase: 1, name: "저장" }]} />
        ),
    },
    {
        name: "AwardsSection",
        section: "awards",
        labels: { en: "Awards", ja: "受賞歴" },
        render: (label) => (
            <AwardsSection
                label={label}
                awards={[{ title: "저장", awarder: "日本 기관" }]}
            />
        ),
    },
    {
        name: "ProjectsSection",
        section: "projects",
        labels: { en: "Project", ja: "プロジェクト" },
        render: (label) =>
            ProjectsSection({
                label,
                projects: [
                    { name: "저장", description: "日本 C++ / C# / TypeScript" },
                ],
            }),
        renderDefault: () => ProjectsSection({ projects: [{ name: "저장" }] }),
    },
];

describe.each(examples)("$name의 표시 이름 경계", (example) => {
    it.each(["en", "ja"] as const)(
        "%s 기본 항목 이름은 번역하고 사용자 지정 이름 원문 보존",
        async (locale) => {
            const renderLabel = async (custom?: string) =>
                withContentLocale(locale, async () =>
                    renderToStaticMarkup(
                        <LocaleProvider
                            initialLocale={locale}
                            initialMessages={getServerUIMessages(locale)}
                        >
                            {await example.render(
                                getResumeSectionLabel(
                                    example.section,
                                    custom ? { label: custom } : undefined,
                                    undefined,
                                    serverT
                                )
                            )}
                        </LocaleProvider>
                    )
                );
            const root = document.createElement("div");
            root.innerHTML = await renderLabel();
            expect(root.querySelector("h2")?.textContent).toBe(
                example.labels[locale]
            );

            root.innerHTML = await renderLabel("저장");
            expect(root.querySelector("h2")?.textContent).toBe("저장");
        }
    );
});

describe.each(examples.filter((example) => example.renderDefault))(
    "$name의 기본 UI 문구",
    (example) => {
        it.each(["en", "ja"] as const)(
            "%s에서 표시 이름 생략 시 기본 항목 이름 번역",
            async (locale) => {
                const html = await withContentLocale(locale, async () =>
                    renderToStaticMarkup(await example.renderDefault!())
                );
                const root = document.createElement("div");
                root.innerHTML = html;
                expect(root.querySelector("h2")?.textContent).toBe(
                    example.labels[locale]
                );
            }
        );
    }
);
