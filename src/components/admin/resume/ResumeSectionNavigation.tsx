"use client";

import type { JobFieldItem } from "@/components/admin/JobFieldSelector";
import type { ResumeSectionLayout } from "@/lib/resume-layout";

type EditorSection = {
    key: string;
    label: string;
};

const editorSections: EditorSection[] = [
    { key: "basics", label: "기본 정보" },
    { key: "introduction", label: "자기소개" },
    { key: "careerPhases", label: "커리어 타임라인" },
    { key: "coreCompetencies", label: "핵심역량" },
    { key: "work", label: "경력" },
    { key: "projects", label: "프로젝트" },
    { key: "education", label: "학력" },
    { key: "awards", label: "수상" },
    { key: "skills", label: "기술" },
    { key: "languages", label: "언어" },
];

type ResumeSectionNavigationProps = {
    activeSection: string;
    activeJobField: string;
    jobFields: JobFieldItem[];
    layout: ResumeSectionLayout;
    onSelect: (section: string) => void;
};

export const ResumeSectionNavigation = ({
    activeSection,
    activeJobField,
    jobFields,
    layout,
    onSelect,
}: ResumeSectionNavigationProps) => {
    const activeJobFieldName = jobFields.find(
        (jobField) => jobField.id === activeJobField
    )?.name;
    const sectionMap = new Map(
        editorSections.map((section) => [section.key, section])
    );
    const orderedSections = [
        sectionMap.get("basics")!,
        sectionMap.get("introduction")!,
        ...layout.order
            .map((key) => sectionMap.get(key))
            .filter((section): section is EditorSection => Boolean(section)),
    ];

    return (
        <nav
            aria-label="이력서 편집 섹션"
            className="mt-3 flex shrink-0 flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-3"
        >
            <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-md bg-(--color-surface-subtle) px-2 py-1 text-(--color-muted)">
                    관리자 편집 가능
                </span>
                <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-700 dark:text-blue-300">
                    현재 직무 분야: {activeJobFieldName || "전체"}
                </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {orderedSections.map((section) => {
                    const isPublic =
                        section.key === "basics" ||
                        !layout.disabled.includes(section.key);
                    const isActive = activeSection === section.key;

                    return (
                        <button
                            key={section.key}
                            type="button"
                            onClick={() => onSelect(section.key)}
                            aria-current={isActive ? "location" : undefined}
                            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                                isActive
                                    ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                                    : "border-(--color-border) text-(--color-foreground) hover:border-(--color-accent)/50"
                            }`}
                        >
                            {section.label}
                            <span
                                className={`rounded px-1.5 py-0.5 text-xs ${
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : isPublic
                                          ? "bg-green-500/15 text-green-700 dark:text-green-300"
                                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                }`}
                            >
                                {isPublic ? "공개" : "비공개"}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
