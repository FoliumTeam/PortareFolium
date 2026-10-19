"use client";

import {
    JobFieldSelector,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import {
    InputField,
    SectionEmojiSelector,
} from "@/components/admin/resume/ResumeEditorFields";
import { Switch } from "@/components/ui/switch";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUITranslation } from "@/components/LocaleProvider";
import type { Resume, ResumeSection, ResumeTraining } from "@/types/resume";

type Props = {
    resume: Resume;
    jobFields: JobFieldItem[];
    activeJobField: string;
    onChange: (resume: Resume) => void;
};

// 직무별 비학위 교육 과정 편집
export default function ResumeTrainingEditor({
    resume,
    jobFields,
    activeJobField,
    onChange,
}: Props) {
    const uiT = useUITranslation();
    const { confirm } = useConfirmDialog();
    const section: ResumeSection<ResumeTraining> = resume.training ?? {
        emoji: "📚",
        showEmoji: true,
        entries: [],
    };
    const updateSection = (patch: Partial<ResumeSection<ResumeTraining>>) =>
        onChange({ ...resume, training: { ...section, ...patch } });
    const updateEntry = (index: number, patch: Partial<ResumeTraining>) =>
        updateSection({
            entries: section.entries.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, ...patch } : entry
            ),
        });

    return (
        <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    {uiT("교육")}
                </h3>
                <button
                    type="button"
                    onClick={() =>
                        updateSection({
                            entries: [
                                ...section.entries,
                                {
                                    title: "",
                                    organizer: "",
                                    startMonth: "",
                                    endMonth: "",
                                    jobField: activeJobField
                                        ? [activeJobField]
                                        : [],
                                    visible: false,
                                },
                            ],
                        })
                    }
                    className="rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-semibold text-(--color-on-accent)"
                >
                    {uiT("교육 추가")}
                </button>
            </div>
            <p className="text-sm text-(--color-muted)">
                {uiT(
                    "대학 학력과 별도로 표시하는 교육 과정. 직무 분야와 공개 여부에 따라 이력서에 표시"
                )}
            </p>
            <div className="tablet:grid-cols-2 grid gap-4">
                <InputField
                    label="공개 섹션 이름"
                    value={section.label ?? ""}
                    onChange={(label) => updateSection({ label })}
                    placeholder="교육"
                />
                <div className="flex items-center gap-3">
                    <SectionEmojiSelector
                        value={section.emoji}
                        onChange={(emoji) => updateSection({ emoji })}
                    />
                    <Switch
                        id="show-emojis-training"
                        checked={section.showEmoji}
                        onCheckedChange={(showEmoji) =>
                            updateSection({ showEmoji })
                        }
                    />
                    <label
                        htmlFor="show-emojis-training"
                        className="text-sm text-(--color-muted)"
                    >
                        {uiT("제목 앞 이모지 표시")}
                    </label>
                </div>
            </div>
            {section.entries.map((entry, index) => (
                <div
                    key={index}
                    className="space-y-4 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                >
                    <div className="tablet:grid-cols-2 grid gap-4">
                        <InputField
                            label="과정명"
                            value={entry.title}
                            onChange={(title) => updateEntry(index, { title })}
                            placeholder="교육 과정 이름"
                        />
                        <InputField
                            label="주최"
                            value={entry.organizer}
                            onChange={(organizer) =>
                                updateEntry(index, { organizer })
                            }
                            placeholder="주최 기관"
                        />
                        <label className="flex flex-col gap-1 text-sm font-medium text-(--color-muted)">
                            {uiT("시작 월 (YYYY-MM)")}
                            <input
                                type="month"
                                value={entry.startMonth}
                                onChange={(event) =>
                                    updateEntry(index, {
                                        startMonth: event.target.value,
                                    })
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-(--color-foreground)"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-medium text-(--color-muted)">
                            {uiT("종료 월 (YYYY-MM)")}
                            <input
                                type="month"
                                value={entry.endMonth}
                                onChange={(event) =>
                                    updateEntry(index, {
                                        endMonth: event.target.value,
                                    })
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-(--color-foreground)"
                            />
                        </label>
                    </div>
                    <JobFieldSelector
                        value={entry.jobField}
                        fields={jobFields}
                        onChange={(jobField) =>
                            updateEntry(index, { jobField })
                        }
                    />
                    <p className="text-sm text-(--color-muted)">
                        {uiT(
                            "선택한 직무 분야의 이력서에만 표시. 과정명·주최·시작 월·종료 월과 직무 분야를 채운 뒤 공개 가능"
                        )}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-(--color-foreground)">
                            <Switch
                                checked={entry.visible !== false}
                                disabled={
                                    entry.visible === false &&
                                    (!entry.title.trim() ||
                                        !entry.organizer.trim() ||
                                        !entry.startMonth ||
                                        !entry.endMonth ||
                                        (Array.isArray(entry.jobField)
                                            ? entry.jobField.length === 0
                                            : !entry.jobField))
                                }
                                onCheckedChange={(visible) =>
                                    updateEntry(index, { visible })
                                }
                                aria-label={uiT("{0} 공개 여부", [
                                    entry.title || { text: "새 교육" },
                                ])}
                            />
                            {uiT("공개")}
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => {
                                    const entries = [...section.entries];
                                    [entries[index - 1], entries[index]] = [
                                        entries[index],
                                        entries[index - 1],
                                    ];
                                    updateSection({ entries });
                                }}
                                className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm disabled:opacity-40"
                                title={uiT(
                                    "이 교육을 공개 화면에서 앞 순서로 이동"
                                )}
                            >
                                {uiT("앞")}
                            </button>
                            <button
                                type="button"
                                disabled={index === section.entries.length - 1}
                                onClick={() => {
                                    const entries = [...section.entries];
                                    [entries[index], entries[index + 1]] = [
                                        entries[index + 1],
                                        entries[index],
                                    ];
                                    updateSection({ entries });
                                }}
                                className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm disabled:opacity-40"
                                title={uiT(
                                    "이 교육을 공개 화면에서 뒤 순서로 이동"
                                )}
                            >
                                {uiT("뒤")}
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const approved = await confirm({
                                        title: "교육 삭제",
                                        description:
                                            "이 교육 항목을 이력서에서 삭제할까요?",
                                        confirmText: "삭제",
                                        cancelText: "취소",
                                        variant: "destructive",
                                    });
                                    if (!approved) return;
                                    updateSection({
                                        entries: section.entries.filter(
                                            (_, entryIndex) =>
                                                entryIndex !== index
                                        ),
                                    });
                                }}
                                className="rounded-lg border border-red-500 px-3 py-1.5 text-sm text-red-600"
                                title={uiT("이 교육 항목 삭제")}
                            >
                                {uiT("삭제")}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </section>
    );
}
