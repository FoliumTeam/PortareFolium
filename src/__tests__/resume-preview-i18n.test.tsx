import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import ResumeClassicPreview from "@/components/resume/ResumeClassicPreview";
import ResumeModernPreview from "@/components/resume/ResumeModernPreview";
import { DEFAULT_RESUME_BASICS_PRESENTATION } from "@/lib/resume-basics-presentation";
import type { Resume } from "@/types/resume";
import { loadUIMessages } from "@/lib/ui-messages";

const resume: Resume = {
    certificates: {
        emoji: "",
        showEmoji: false,
        entries: [{ name: "저장", issuer: "원본 발급 기관" }],
    },
};

describe.each([
    ["Classic", ResumeClassicPreview],
    ["Modern", ResumeModernPreview],
] as const)("%s 미리보기의 사용자 제목 보호", (_theme, Preview) => {
    it.each([
        ["en", { 저장: "Save", 자격증: "Certificates" }, "Certificates"],
        ["ja", { 저장: "保存", 자격증: "資格" }, "資格"],
    ] as const)(
        "%s UI에서도 자격증 이름 원문 보존과 항목 제목 번역",
        (locale, messages, sectionTitle) => {
            render(
                <LocaleProvider
                    initialLocale={locale}
                    initialMessages={messages}
                >
                    <Preview
                        resume={resume}
                        basicsPresentation={DEFAULT_RESUME_BASICS_PRESENTATION}
                        sectionLayout={{
                            order: ["certificates"],
                            disabled: [],
                        }}
                    />
                </LocaleProvider>
            );

            expect(
                screen.getByRole("heading", {
                    level: 3,
                    name: "저장",
                })
            ).toBeVisible();
            expect(
                screen.queryByRole("heading", {
                    level: 3,
                    name: messages.저장,
                })
            ).not.toBeInTheDocument();
            expect(
                screen.getByRole("heading", {
                    level: 2,
                    name: sectionTitle,
                })
            ).toBeVisible();
        }
    );
});

describe.each([
    ["Classic", ResumeClassicPreview],
    ["Modern", ResumeModernPreview],
] as const)("%s 미리보기의 언어 항목 제목 전달", (_theme, Preview) => {
    it.each([
        ["en", { 저장: "Save", 언어: "Language" }, "Language"],
        ["ja", { 저장: "保存", 언어: "言語" }, "言語"],
    ] as const)(
        "%s 기본 언어 제목만 번역하고 사용자 지정 제목 재번역 차단",
        (locale, messages, defaultLabel) => {
            const languages: NonNullable<Resume["languages"]> = {
                emoji: "",
                showEmoji: false,
                entries: [
                    {
                        language: "日本語",
                        fluency: "원본 日本 C++ / C# / TypeScript",
                    },
                ],
            };
            const element = (label?: string) => (
                <LocaleProvider
                    initialLocale={locale}
                    initialMessages={messages}
                >
                    <Preview
                        resume={{ languages: { ...languages, label } }}
                        basicsPresentation={DEFAULT_RESUME_BASICS_PRESENTATION}
                        sectionLayout={{ order: ["languages"], disabled: [] }}
                    />
                </LocaleProvider>
            );
            const { rerender } = render(element());
            expect(
                screen.getByRole("heading", { level: 2, name: defaultLabel })
            ).toBeVisible();

            rerender(element("저장"));
            expect(
                screen.getByRole("heading", { level: 2, name: "저장" })
            ).toBeVisible();
            expect(
                screen.queryByRole("heading", { level: 2, name: messages.저장 })
            ).not.toBeInTheDocument();
            expect(
                screen.getByRole("heading", { level: 3, name: "日本語" })
            ).toBeVisible();
            expect(
                screen.getByText("원본 日本 C++ / C# / TypeScript")
            ).toBeVisible();
        }
    );
});

describe.each([
    ["Classic", ResumeClassicPreview],
    ["Modern", ResumeModernPreview],
] as const)("%s 미리보기의 교육 언어 경계", (_theme, Preview) => {
    it.each([
        ["en", "Training"],
        ["ja", "研修"],
    ] as const)(
        "%s 기본 항목 이름만 번역하고 사용자 제목·CJK·기술명 보존",
        async (locale, defaultLabel) => {
            const training: NonNullable<Resume["training"]> = {
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
            };
            const messages = await loadUIMessages(locale);
            const element = (label?: string) => (
                <LocaleProvider
                    initialLocale={locale}
                    initialMessages={messages}
                >
                    <Preview
                        resume={{ training: { ...training, label } }}
                        basicsPresentation={DEFAULT_RESUME_BASICS_PRESENTATION}
                        sectionLayout={{ order: ["training"], disabled: [] }}
                    />
                </LocaleProvider>
            );
            const { rerender } = render(element());
            expect(
                screen.getByRole("heading", { level: 2, name: defaultLabel })
            ).toBeVisible();

            rerender(element("저장"));
            expect(
                screen.getByRole("heading", { level: 2, name: "저장" })
            ).toBeVisible();
            expect(
                screen.getByRole("heading", { level: 3, name: "저장" })
            ).toBeVisible();
            expect(
                screen.getByText("日本 교육 C++ / C# / TypeScript")
            ).toBeVisible();
            expect(screen.getByText("2026.01 ~ 2026.07")).toBeVisible();
        }
    );
});
