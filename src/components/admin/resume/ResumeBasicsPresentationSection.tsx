"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
    RESUME_BASICS_VISIBILITY_KEYS,
    type ResumeBasicsPresentation,
    type ResumeBasicsPresentationConfig,
    type ResumeBasicsVisibilityKey,
} from "@/types/resume";
import {
    createResumeBasicsPresentationOverride,
    resolveResumeBasicsPresentation,
} from "@/lib/resume-basics-presentation";

type JobFieldItem = { id: string; name: string; emoji?: string };

type PresentationPatch = Omit<
    Partial<ResumeBasicsPresentation>,
    "visibility"
> & {
    visibility?: Partial<ResumeBasicsPresentation["visibility"]>;
};

type ResumeBasicsPresentationSectionProps = {
    presentation: ResumeBasicsPresentationConfig;
    jobFields: JobFieldItem[];
    saving: boolean;
    onPersist: (next: ResumeBasicsPresentationConfig) => void;
    onResetOverride: (jobField: string) => void;
};

const visibilityLabels: Record<ResumeBasicsVisibilityKey, string> = {
    image: "사진",
    name: "이름",
    headline: "전문 직함",
    summary: "자기소개",
    email: "이메일",
    phone: "전화번호",
    url: "웹사이트",
    location: "위치",
    profiles: "외부 프로필",
    birthDate: "생년월일",
    military: "병역 사항",
};

const headerPresets: Array<{
    value: ResumeBasicsPresentation["headerPreset"];
    title: string;
    description: string;
    recommended?: boolean;
}> = [
    {
        value: "split",
        title: "프로필 헤더형",
        description: "사진·identity 상단 행과 full-width metadata 구성",
        recommended: true,
    },
];

const detailPresets: Array<{
    value: ResumeBasicsPresentation["personalDetailPreset"];
    title: string;
    description: string;
}> = [
    {
        value: "detailed",
        title: "상세 표시",
        description: "YYYY.MM.DD와 병역 상태·복무기간 표시",
    },
    {
        value: "concise",
        title: "간결 표시",
        description: "출생연도와 병역 상태만 표시",
    },
];

export const ResumeBasicsPresentationSection = ({
    presentation,
    jobFields,
    saving,
    onPersist,
    onResetOverride,
}: ResumeBasicsPresentationSectionProps) => {
    const [activeJobFieldId, setActiveJobFieldId] = useState("");

    useEffect(() => {
        setActiveJobFieldId((current) =>
            current && jobFields.some((jobField) => jobField.id === current)
                ? current
                : (jobFields[0]?.id ?? "")
        );
    }, [jobFields]);

    const activeJobField = useMemo(
        () => jobFields.find((jobField) => jobField.id === activeJobFieldId),
        [activeJobFieldId, jobFields]
    );
    const hasOverride = Boolean(
        activeJobFieldId && presentation.jobFields?.[activeJobFieldId]
    );
    const activePresentation = resolveResumeBasicsPresentation(
        presentation,
        activeJobFieldId
    );

    const updateActive = (patch: PresentationPatch) => {
        const nextPresentation: ResumeBasicsPresentation = {
            ...activePresentation,
            ...patch,
            visibility: {
                ...activePresentation.visibility,
                ...patch.visibility,
            } as ResumeBasicsPresentation["visibility"],
        };
        if (hasOverride && activeJobFieldId) {
            onPersist({
                ...presentation,
                jobFields: {
                    ...presentation.jobFields,
                    [activeJobFieldId]: nextPresentation,
                },
            });
            return;
        }
        onPersist({ ...presentation, shared: nextPresentation });
    };

    const updateVisibility = (
        key: ResumeBasicsVisibilityKey,
        checked: boolean
    ) => updateActive({ visibility: { [key]: checked } });

    return (
        <section
            data-resume-section="basics-presentation"
            className="space-y-5 rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
        >
            <div>
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    Resume appearance
                </p>
                <h3 className="mt-1 text-xl font-bold text-(--color-foreground)">
                    표시와 디자인
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-(--color-muted)">
                    완성형 preset과 공개 설정으로 직무별 Resume 상단을
                    관리합니다.
                </p>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="text-base font-semibold text-(--color-foreground)">
                    직무 분야별 설정
                </p>
                <div
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label="개인 정보 표시 직무 분야"
                >
                    {jobFields.map((jobField) => {
                        const selected = activeJobFieldId === jobField.id;
                        const independent = Boolean(
                            presentation.jobFields?.[jobField.id]
                        );
                        return (
                            <button
                                key={jobField.id}
                                type="button"
                                aria-pressed={selected}
                                aria-label={`${jobField.name} 개인 정보 표시 설정 선택`}
                                onClick={() => setActiveJobFieldId(jobField.id)}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                                    selected
                                        ? "bg-(--color-accent) text-(--color-on-accent)"
                                        : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"
                                }`}
                            >
                                {jobField.emoji ? `${jobField.emoji} ` : ""}
                                {jobField.name}
                                <span className="ml-2 text-xs opacity-80">
                                    {independent ? "독립" : "공통"}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {!activeJobField ? (
                    <p className="mt-4 text-sm text-(--color-muted)">
                        Admin Config에서 직무 분야를 추가하면 표시 설정을 분리할
                        수 있습니다.
                    </p>
                ) : hasOverride ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-3">
                        <div>
                            <p className="text-sm font-semibold text-(--color-foreground)">
                                {activeJobField.name} 독립 설정 사용 중
                            </p>
                            <p className="mt-1 text-xs text-(--color-muted)">
                                공통값과 별도로 공개 항목과 preset을 관리합니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onResetOverride(activeJobFieldId)}
                            disabled={saving}
                            className="rounded-lg border border-(--color-border) px-3 py-2 text-sm font-semibold text-(--color-foreground) disabled:opacity-50"
                        >
                            공통값으로 되돌리기
                        </button>
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-(--color-border) bg-(--color-surface) p-3">
                        <div>
                            <p className="text-sm font-semibold text-(--color-foreground)">
                                {activeJobField.name} 공통 설정 사용 중
                            </p>
                            <p className="mt-1 text-xs text-(--color-muted)">
                                현재 공통 preset과 공개 항목을 그대로
                                사용합니다.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                onPersist(
                                    createResumeBasicsPresentationOverride(
                                        presentation,
                                        activeJobFieldId
                                    )
                                )
                            }
                            disabled={saving}
                            className="rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) disabled:opacity-50"
                        >
                            독립 설정 만들기
                        </button>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-base font-semibold text-(--color-foreground)">
                            Modern 상단 preset
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                            선택 즉시 저장하고 공개 Resume에 반영합니다.
                        </p>
                    </div>
                    {saving ? (
                        <span className="text-sm font-medium text-(--color-muted)">
                            저장 중...
                        </span>
                    ) : null}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                    {headerPresets.map((preset) => {
                        const selected =
                            activePresentation.headerPreset === preset.value;
                        return (
                            <button
                                key={preset.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                    updateActive({ headerPreset: preset.value })
                                }
                                disabled={saving}
                                className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-50 ${
                                    selected
                                        ? "border-(--color-accent) bg-(--color-accent)/10"
                                        : "border-(--color-border) bg-(--color-surface) hover:border-(--color-accent)/50"
                                }`}
                            >
                                <PresetPreview />
                                <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-(--color-foreground)">
                                    {preset.title}
                                    {preset.recommended ? (
                                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                                            추천
                                        </span>
                                    ) : null}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                    {preset.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="text-base font-semibold text-(--color-foreground)">
                    개인 사항 표시 방식
                </p>
                <div className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-3">
                    {detailPresets.map((preset) => {
                        const selected =
                            activePresentation.personalDetailPreset ===
                            preset.value;
                        return (
                            <button
                                key={preset.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                    updateActive({
                                        personalDetailPreset: preset.value,
                                    })
                                }
                                disabled={saving}
                                className={`rounded-xl border p-4 text-left disabled:opacity-50 ${
                                    selected
                                        ? "border-(--color-accent) bg-(--color-accent)/10"
                                        : "border-(--color-border) bg-(--color-surface)"
                                }`}
                            >
                                <span className="text-sm font-semibold text-(--color-foreground)">
                                    {preset.title}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                    {preset.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                <p className="text-base font-semibold text-(--color-foreground)">
                    공개 항목
                </p>
                <p className="mt-1 text-sm text-(--color-muted)">
                    생년월일과 병역 사항은 기본 비공개입니다.
                </p>
                <div className="tablet:grid-cols-2 mt-4 grid grid-cols-1 gap-3">
                    {RESUME_BASICS_VISIBILITY_KEYS.map((key) => (
                        <label
                            key={key}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2.5"
                        >
                            <span className="text-sm font-medium text-(--color-foreground)">
                                {visibilityLabels[key]}
                            </span>
                            <Switch
                                checked={activePresentation.visibility[key]}
                                onCheckedChange={(checked) =>
                                    updateVisibility(key, checked)
                                }
                                disabled={saving}
                            />
                        </label>
                    ))}
                </div>
            </div>
        </section>
    );
};

const PresetPreview = () => {
    return (
        <div className="grid h-16 grid-cols-[0.55fr_1.45fr] gap-2 rounded-lg bg-(--color-surface-subtle) p-2">
            <span className="rounded-md bg-(--color-muted)/35" />
            <span className="space-y-1.5 pt-1">
                <i className="block h-2 w-2/3 rounded bg-(--color-foreground)/45" />
                <i className="block h-1.5 w-full rounded bg-(--color-muted)/35" />
                <i className="block h-1.5 w-4/5 rounded bg-(--color-muted)/35" />
            </span>
        </div>
    );
};
