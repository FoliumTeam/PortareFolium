"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Resume, ResumeBasicsPresentationConfig } from "@/types/resume";
import type { AboutData } from "@/types/about";
import { defaultSectionLabels } from "@/types/resume";
import { normalizeLayout, type ResumeSectionLayout } from "@/lib/resume-layout";
import ResumeClassicPreview from "@/components/resume/ResumeClassicPreview";
import ResumeModernPreview from "@/components/resume/ResumeModernPreview";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import { resolveResumeBasicsPresentation } from "@/lib/resume-basics-presentation";
import type { JobFieldItem } from "@/components/admin/JobFieldSelector";

interface Props {
    resume: Resume;
    layout: ResumeSectionLayout;
    onChange: (layout: ResumeSectionLayout) => void;
    theme: "classic" | "modern";
    jobFields: JobFieldItem[];
    aboutData: AboutData;
    basicsPresentation: ResumeBasicsPresentationConfig;
}

// defaultSectionLabels에 없는 섹션 fallback label
const EXTRA_LABELS: Record<string, string> = {
    careerPhases: "커리어 타임라인",
};

const getSectionLabel = (key: string): string => {
    return (
        defaultSectionLabels[key] ||
        EXTRA_LABELS[key] ||
        key.charAt(0).toUpperCase() + key.slice(1)
    );
};

export default function ResumeLayoutEditor({
    resume,
    layout,
    onChange,
    theme,
    jobFields,
    aboutData,
    basicsPresentation,
}: Props) {
    const dragSrcRef = useRef<number | null>(null);
    const dragOverRef = useRef<number | null>(null);
    const [previewJobField, setPreviewJobField] = useState(
        () => jobFields[0]?.id ?? ""
    );

    useEffect(() => {
        if (jobFields.some((field) => field.id === previewJobField)) return;
        setPreviewJobField(jobFields[0]?.id ?? "");
    }, [jobFields, previewJobField]);

    const order = normalizeLayout(layout).order;
    const disabledSet = new Set(layout.disabled);

    const handleToggle = (key: string) => {
        const nextDisabled = disabledSet.has(key)
            ? layout.disabled.filter((k) => k !== key)
            : [...layout.disabled, key];
        onChange({ order, disabled: nextDisabled });
    };

    const handleDragEnd = () => {
        const from = dragSrcRef.current;
        const to = dragOverRef.current;
        dragSrcRef.current = null;
        dragOverRef.current = null;
        if (from === null || to === null || from === to) return;
        const next = [...order];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange({ order: next, disabled: layout.disabled });
    };

    const moveSection = (index: number, offset: -1 | 1) => {
        const target = index + offset;
        if (target < 0 || target >= order.length) return;
        const next = [...order];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        onChange({ order: next, disabled: layout.disabled });
    };

    const selectedJobField = jobFields.find(
        (field) => field.id === previewJobField
    );
    const previewResume = useMemo(() => {
        if (!selectedJobField) return resume;
        const fallbackIntroduction =
            aboutData.description || aboutData.descriptionSub
                ? {
                      description: aboutData.description ?? "",
                      descriptionSub: aboutData.descriptionSub ?? "",
                  }
                : undefined;
        const filtered = createJobFieldResumeView(
            resume,
            selectedJobField.id,
            aboutData.introductions?.[selectedJobField.id],
            fallbackIntroduction
        );
        const sortByDate = <T extends { startDate?: string }>(items: T[]) =>
            [...items].sort((left, right) =>
                (right.startDate ?? "").localeCompare(left.startDate ?? "")
            );
        return {
            ...filtered,
            basics: filtered.basics
                ? {
                      ...filtered.basics,
                      label: selectedJobField.headerTitle,
                  }
                : undefined,
            work: filtered.work
                ? {
                      ...filtered.work,
                      entries: sortByDate(filtered.work.entries),
                  }
                : undefined,
            projects: filtered.projects
                ? {
                      ...filtered.projects,
                      entries: sortByDate(filtered.projects.entries),
                  }
                : undefined,
        };
    }, [aboutData, resume, selectedJobField]);
    const previewBasicsPresentation = resolveResumeBasicsPresentation(
        basicsPresentation,
        selectedJobField?.id
    );

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
                <div className="mr-2 min-w-48">
                    <p className="text-sm font-semibold text-(--color-foreground)">
                        공개 Resume live preview
                    </p>
                    <p className="text-xs text-(--color-muted)">
                        디자인·직무 분야·section 설정을 같은 화면에서 확인
                    </p>
                </div>
                {jobFields.map((field) => {
                    const selected = field.id === previewJobField;
                    return (
                        <button
                            key={field.id}
                            type="button"
                            onClick={() => setPreviewJobField(field.id)}
                            aria-pressed={selected}
                            aria-label={`${field.name} 공개 Resume 미리보기`}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                                selected
                                    ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                                    : "border-(--color-border) bg-(--color-surface-subtle) text-(--color-muted) hover:border-(--color-accent)/50 hover:text-(--color-foreground)"
                            }`}
                        >
                            {field.emoji} {field.name}
                        </button>
                    );
                })}
                {selectedJobField ? (
                    <span className="ml-auto text-xs text-(--color-muted)">
                        /{selectedJobField.id}/resume · {theme}
                    </span>
                ) : null}
            </div>

            <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
                <div
                    data-testid="resume-layout-live-preview"
                    className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                >
                    {theme === "classic" ? (
                        <ResumeClassicPreview
                            resume={previewResume}
                            coreCompetencies={
                                previewResume.coreCompetencies?.entries ?? []
                            }
                            sectionLayout={{
                                order,
                                disabled: layout.disabled,
                            }}
                            basicsPresentation={previewBasicsPresentation}
                            activeJobField={selectedJobField?.id}
                        />
                    ) : (
                        <ResumeModernPreview
                            resume={previewResume}
                            coreCompetencies={
                                previewResume.coreCompetencies?.entries ?? []
                            }
                            sectionLayout={{
                                order,
                                disabled: layout.disabled,
                            }}
                            basicsPresentation={previewBasicsPresentation}
                            activeJobField={selectedJobField?.id}
                        />
                    )}
                </div>

                <div className="flex min-h-0 w-96 shrink-0 flex-col overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                    <h3 className="mb-3 text-lg font-bold text-(--color-foreground)">
                        섹션 순서 / 표시 여부
                    </h3>
                    <p className="mb-4 text-sm text-(--color-muted)">
                        눈 아이콘으로 공개 여부 변경. 화살표 또는 Drag으로 순서
                        변경
                    </p>
                    <ul className="flex flex-col gap-1.5">
                        {order.map((key, idx) => {
                            const isDisabled = disabledSet.has(key);
                            return (
                                <li
                                    key={key}
                                    draggable
                                    onDragStart={() => {
                                        dragSrcRef.current = idx;
                                    }}
                                    onDragEnter={() => {
                                        dragOverRef.current = idx;
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDragEnd={handleDragEnd}
                                    className={`flex cursor-grab items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 transition-colors hover:border-(--color-accent)/50 active:cursor-grabbing ${
                                        isDisabled ? "opacity-60" : ""
                                    }`}
                                    data-section-key={key}
                                >
                                    <GripVertical className="h-4 w-4 shrink-0 text-(--color-muted)" />
                                    <span className="truncate text-sm font-medium text-(--color-foreground)">
                                        {getSectionLabel(key)}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => moveSection(idx, -1)}
                                            disabled={idx === 0}
                                            title={`${getSectionLabel(key)} 위로 이동`}
                                            aria-label={`${getSectionLabel(key)} 위로 이동`}
                                            className="rounded-md p-1.5 text-(--color-muted) hover:bg-(--color-surface) hover:text-(--color-foreground) disabled:opacity-30"
                                        >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveSection(idx, 1)}
                                            disabled={idx === order.length - 1}
                                            title={`${getSectionLabel(key)} 아래로 이동`}
                                            aria-label={`${getSectionLabel(key)} 아래로 이동`}
                                            className="rounded-md p-1.5 text-(--color-muted) hover:bg-(--color-surface) hover:text-(--color-foreground) disabled:opacity-30"
                                        >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(key)}
                                            title={`${getSectionLabel(key)} ${isDisabled ? "표시" : "숨김"}`}
                                            aria-label={`${getSectionLabel(key)} ${isDisabled ? "표시" : "숨김"}`}
                                            className={`rounded-md p-1.5 transition-colors ${
                                                isDisabled
                                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                                    : "bg-green-500/10 text-green-700 dark:text-green-400"
                                            }`}
                                        >
                                            {isDisabled ? (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
