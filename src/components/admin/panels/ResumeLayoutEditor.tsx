"use client";

import { useRef } from "react";
import type { Resume } from "@/types/resume";
import { defaultSectionLabels } from "@/types/resume";
import { normalizeLayout, type ResumeSectionLayout } from "@/lib/resume-layout";
import ResumeClassicPreview from "@/components/resume/ResumeClassicPreview";
import ResumeModernPreview from "@/components/resume/ResumeModernPreview";
import { GripVertical } from "lucide-react";

interface Props {
    resume: Resume;
    layout: ResumeSectionLayout;
    onChange: (layout: ResumeSectionLayout) => void;
    theme: "classic" | "modern";
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
}: Props) {
    const dragSrcRef = useRef<number | null>(null);
    const dragOverRef = useRef<number | null>(null);

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

    return (
        <div className="flex h-full min-h-0 gap-4">
            {/* Left — preview */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                {theme === "classic" ? (
                    <ResumeClassicPreview
                        resume={resume}
                        coreCompetencies={
                            resume.coreCompetencies?.entries ?? []
                        }
                        sectionLayout={{ order, disabled: layout.disabled }}
                    />
                ) : (
                    <ResumeModernPreview
                        resume={resume}
                        coreCompetencies={
                            resume.coreCompetencies?.entries ?? []
                        }
                        sectionLayout={{ order, disabled: layout.disabled }}
                    />
                )}
            </div>

            {/* Right — section list */}
            <div className="flex w-96 shrink-0 flex-col overflow-y-auto rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                <h3 className="mb-3 text-lg font-bold text-(--color-foreground)">
                    섹션 순서 / 표시 여부
                </h3>
                <p className="mb-4 text-sm text-(--color-muted)">
                    Drag으로 순서 변경, checkbox로 표시 여부 조정
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
                                <input
                                    type="checkbox"
                                    checked={!isDisabled}
                                    onChange={() => handleToggle(key)}
                                    className="h-4 w-4 shrink-0 cursor-pointer"
                                    aria-label={`${getSectionLabel(key)} 표시`}
                                />
                                <span className="truncate text-sm font-medium text-(--color-foreground)">
                                    {getSectionLabel(key)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
