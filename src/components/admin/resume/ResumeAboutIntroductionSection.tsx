"use client";
import {
    LocalizedText,
    LocalizedElement,
    LocalizedRichText,
} from "@/components/LocalizedText";

import { useEffect, useMemo, useState } from "react";
import { TextAreaField } from "@/components/admin/resume/ResumeEditorFields";
import type { AboutData, FieldIntroduction } from "@/types/about";

type JobFieldItem = { id: string; name: string; emoji?: string };

type ResumeAboutIntroductionSectionProps = {
    aboutData: AboutData;
    jobFields: JobFieldItem[];
    saving: boolean;
    onChange: (aboutData: AboutData) => void;
    onSave: () => void;
};

const createIntroduction = (aboutData: AboutData): FieldIntroduction => ({
    description: aboutData.description ?? "",
    descriptionSub: aboutData.descriptionSub ?? "",
    valuePillars: aboutData.valuePillars?.map((pillar) => ({ ...pillar })),
    sections: aboutData.sections
        ? Object.fromEntries(
              Object.entries(aboutData.sections).map(([key, entries]) => [
                  key,
                  [...entries],
              ])
          )
        : undefined,
    competencySections: aboutData.competencySections
        ? Object.fromEntries(
              Object.entries(aboutData.competencySections).map(
                  ([key, entries]) => [key, [...entries]]
              )
          )
        : undefined,
});

export const ResumeAboutIntroductionSection = ({
    aboutData,
    jobFields,
    saving,
    onChange,
    onSave,
}: ResumeAboutIntroductionSectionProps) => {
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
    const introduction = activeJobFieldId
        ? aboutData.introductions?.[activeJobFieldId]
        : undefined;

    const updateIntroduction = (
        patch: Partial<
            Pick<FieldIntroduction, "description" | "descriptionSub">
        >
    ) => {
        if (!activeJobFieldId) return;
        onChange({
            ...aboutData,
            introductions: {
                ...aboutData.introductions,
                [activeJobFieldId]: {
                    ...(introduction ?? createIntroduction(aboutData)),
                    ...patch,
                },
            },
        });
    };

    const startFieldIntroduction = () => updateIntroduction({});

    return (
        <section
            data-resume-section="introduction"
            className="space-y-5 rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
        >
            <div className="space-y-2">
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    <LocalizedText text={"Profile Content"} />
                </p>
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    <LocalizedText text={"자기소개"} />
                </h3>
                <p className="text-sm leading-relaxed text-(--color-muted)">
                    <LocalizedText
                        text={
                            "About 페이지와 같은 직무 분야별 소개 데이터입니다. 여기서 저장한 내용은 About과 공개 Resume에 함께 반영됩니다."
                        }
                    />
                </p>
            </div>

            <LocalizedElement
                as="div"
                translatedProps={["aria-label"]}
                className="flex flex-wrap gap-2"
                aria-label="자기소개 직무 분야"
            >
                {jobFields.map((jobField) => {
                    const selected = activeJobFieldId === jobField.id;
                    const hasOverride = Boolean(
                        aboutData.introductions?.[jobField.id]
                    );
                    return (
                        <button
                            key={jobField.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setActiveJobFieldId(jobField.id)}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                                selected
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "border border-(--color-border) text-(--color-muted) hover:border-(--color-accent)/50 hover:text-(--color-foreground)"
                            }`}
                        >
                            {jobField.emoji ? `${jobField.emoji} ` : ""}
                            {jobField.name}
                            <span className="ml-2 text-xs opacity-80">
                                {hasOverride ? (
                                    <LocalizedText text={"독립"} />
                                ) : (
                                    <LocalizedText text={"공통"} />
                                )}
                            </span>
                        </button>
                    );
                })}
            </LocalizedElement>

            {!activeJobField ? (
                <p className="rounded-lg border border-dashed border-(--color-border) px-4 py-6 text-sm text-(--color-muted)">
                    <LocalizedText
                        text={
                            "자기소개를 관리할 직무 분야가 없습니다. Admin Config에서 직무 분야를 먼저 추가하세요."
                        }
                    />
                </p>
            ) : introduction ? (
                <div className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                    <div>
                        <p className="font-semibold text-(--color-foreground)">
                            <LocalizedRichText
                                text={"{0} {1} 소개"}
                                values={[
                                    activeJobField.emoji
                                        ? `${activeJobField.emoji} `
                                        : "",
                                    activeJobField.name,
                                ]}
                            />
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                            <LocalizedText text={"독립 소개 사용 중"} />
                        </p>
                    </div>
                    <LocalizedElement
                        as={TextAreaField}
                        translatedProps={["label"]}
                        label="소개"
                        value={introduction.description}
                        onChange={(description) =>
                            updateIntroduction({ description })
                        }
                        rows={4}
                    />
                    <LocalizedElement
                        as={TextAreaField}
                        translatedProps={["label"]}
                        label="보조 소개"
                        value={introduction.descriptionSub}
                        onChange={(descriptionSub) =>
                            updateIntroduction({ descriptionSub })
                        }
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onSave}
                            className="rounded-lg bg-(--color-accent) px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? (
                                <LocalizedText text={"저장 중..."} />
                            ) : (
                                <LocalizedText text={"About 소개 저장"} />
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) p-4">
                    <p className="font-semibold text-(--color-foreground)">
                        <LocalizedRichText
                            text={"{0} {1}는 공통 소개 사용 중"}
                            values={[
                                activeJobField.emoji
                                    ? `${activeJobField.emoji} `
                                    : "",
                                activeJobField.name,
                            ]}
                        />
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-(--color-muted)">
                        <LocalizedText
                            text={
                                "공통 소개를 기준으로 이 직무 분야의 독립 소개를 만들 수 있습니다."
                            }
                        />
                    </p>
                    <button
                        type="button"
                        onClick={startFieldIntroduction}
                        className="mt-4 rounded-lg bg-(--color-accent) px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        <LocalizedText text={"이 직무 분야 소개 편집"} />
                    </button>
                </div>
            )}
        </section>
    );
};
