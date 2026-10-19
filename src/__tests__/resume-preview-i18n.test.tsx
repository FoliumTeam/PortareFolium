import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import ResumeClassicPreview from "@/components/resume/ResumeClassicPreview";
import ResumeModernPreview from "@/components/resume/ResumeModernPreview";
import { DEFAULT_RESUME_BASICS_PRESENTATION } from "@/lib/resume-basics-presentation";
import type { Resume } from "@/types/resume";

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
