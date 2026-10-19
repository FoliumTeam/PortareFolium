import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResumeTrainingEditor from "@/components/admin/resume/ResumeTrainingEditor";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { LocaleProvider } from "@/components/LocaleProvider";
import { loadUIMessages } from "@/lib/ui-messages";
import type { Resume } from "@/types/resume";

function EditorFixture() {
    const [resume, setResume] = useState<Resume>({});
    return (
        <ConfirmDialogProvider>
            <ResumeTrainingEditor
                resume={resume}
                activeJobField="game"
                jobFields={[
                    { id: "game", name: "게임", emoji: "🎮" },
                    { id: "web", name: "웹", emoji: "🌐" },
                ]}
                onChange={setResume}
            />
            <output data-testid="training-state">
                {JSON.stringify(resume.training)}
            </output>
        </ConfirmDialogProvider>
    );
}

describe("ResumeTrainingEditor", () => {
    it("새 교육을 게임 전용 비공개 상태로 만들고 필수 정보를 채운 뒤 공개한다", () => {
        render(<EditorFixture />);
        fireEvent.click(screen.getByRole("button", { name: "교육 추가" }));

        const initial = JSON.parse(
            screen.getByTestId("training-state").textContent ?? "{}"
        );
        expect(initial.entries[0].jobField).toEqual(["game"]);
        expect(initial.entries[0].visible).toBe(false);

        fireEvent.change(screen.getByPlaceholderText("교육 과정 이름"), {
            target: { value: "게임 개발 과정" },
        });
        fireEvent.change(screen.getByPlaceholderText("주최 기관"), {
            target: { value: "교육 기관" },
        });
        fireEvent.change(screen.getByLabelText("시작 월 (YYYY-MM)"), {
            target: { value: "2026-01" },
        });
        fireEvent.change(screen.getByLabelText("종료 월 (YYYY-MM)"), {
            target: { value: "2026-07" },
        });
        fireEvent.click(
            screen.getByRole("switch", { name: "게임 개발 과정 공개 여부" })
        );

        const completed = JSON.parse(
            screen.getByTestId("training-state").textContent ?? "{}"
        );
        expect(completed.entries[0]).toMatchObject({
            title: "게임 개발 과정",
            organizer: "교육 기관",
            startMonth: "2026-01",
            endMonth: "2026-07",
            jobField: ["game"],
            visible: true,
        });
    });

    it.each([
        ["en", "Add training", "Training", "Course name", "Organizer"],
        ["ja", "研修を追加", "研修", "課程名", "主催"],
    ] as const)(
        "%s 편집 문구만 번역하고 교육 이름·주최·사용자 지정 제목 원문 보존",
        async (locale, add, section, course, organizer) => {
            render(
                <LocaleProvider
                    initialLocale={locale}
                    initialMessages={await loadUIMessages(locale)}
                >
                    <EditorFixture />
                </LocaleProvider>
            );
            expect(
                screen.getByRole("heading", { name: section })
            ).toBeVisible();
            fireEvent.click(screen.getByRole("button", { name: add }));
            const field = (label: string) =>
                within(
                    screen.getByText(label, { selector: "label", exact: true })
                        .parentElement!
                ).getByRole("textbox");
            fireEvent.change(
                field(
                    locale === "en"
                        ? "Public section title"
                        : "公開セクション名"
                ),
                { target: { value: "저장" } }
            );
            fireEvent.change(field(course), { target: { value: "저장" } });
            fireEvent.change(field(organizer), {
                target: { value: "日本 교육 C++ / C# / TypeScript" },
            });

            const training = JSON.parse(
                screen.getByTestId("training-state").textContent ?? "{}"
            ) as NonNullable<Resume["training"]>;
            expect(training.label).toBe("저장");
            expect(training.entries[0]).toMatchObject({
                title: "저장",
                organizer: "日本 교육 C++ / C# / TypeScript",
                jobField: ["game"],
                visible: false,
            });
        }
    );
});
