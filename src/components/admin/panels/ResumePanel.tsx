"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeJobFieldValue } from "@/lib/job-field";
import {
    getResumeBootstrap,
    saveResumePanel,
    saveResumeTheme,
} from "@/app/admin/actions/resume";
import { uploadImage } from "@/lib/image-upload";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { matchesJobField } from "@/lib/job-field";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import { Trash2 } from "lucide-react";
import SkillsAdminSection from "@/components/admin/skills/SkillsAdminSection";
import ResumeLayoutEditor from "@/components/admin/panels/ResumeLayoutEditor";
import {
    DEFAULT_RESUME_LAYOUT,
    normalizeLayout,
    type ResumeSectionLayout,
} from "@/lib/resume-layout";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
    Resume,
    ResumeWork,
    ResumeProject,
    ResumeProjectSection,
    ResumeEducation,
    ResumeAward,
    ResumeSkillKeyword,
    ResumeLanguage,
    ResumeBasics,
    ResumeCareerPhase,
} from "@/types/resume";

// string[] 하위 호환: 로드된 keyword가 string이면 객체로 정규화
function normalizeKeywords(keywords: unknown[]): ResumeSkillKeyword[] {
    return keywords.map((kw) =>
        typeof kw === "string" ? { name: kw } : (kw as ResumeSkillKeyword)
    );
}

function normalizeSkills(resume: Resume): Resume {
    if (!resume.skills) return resume;
    return {
        ...resume,
        skills: {
            ...resume.skills,
            entries: resume.skills.entries.map((s) => {
                const legacy = s as unknown as Record<string, unknown>;
                const catJobField = legacy["jobField"] as
                    | string
                    | string[]
                    | undefined;
                const catLevel = legacy["level"] as string | undefined;
                const normalized = normalizeKeywords(
                    s.keywords ? (s.keywords as unknown[]) : []
                );
                const migrated = normalized.map((kw) => ({
                    ...kw,
                    jobField: kw.jobField ?? catJobField,
                    level: (kw as { level?: string }).level ?? catLevel,
                }));
                const {
                    jobField: _jf,
                    level: _lv,
                    ...rest
                } = legacy as Record<string, unknown>;
                return { ...rest, keywords: migrated };
            }),
        },
    };
}
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Switch } from "@/components/ui/switch";

function InputField({
    label,
    value,
    onChange,
    placeholder = "",
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-(--color-muted)">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
            />
        </div>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    placeholder = "",
    rows = 3,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-(--color-muted)">
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full resize-y rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
            />
        </div>
    );
}

type ResumeLayout = "classic" | "modern";

// 타임스탬프 포맷 (시:분:초)
function fmtTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// 직무 분야 필터 매칭

// 배열 항목 순서 변경 (불변)
function reorderArray<T>(arr: T[], from: number, to: number): T[] {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
}

function SectionEmojiSelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    return (
        <div className="relative mr-3 inline-block">
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-subtle) text-base transition-colors hover:bg-(--color-border)"
                title="이모지 선택"
            >
                {value || "➕"}
            </button>
            {showPicker && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute top-10 left-0 z-50 shadow-xl">
                        <Picker
                            data={data}
                            onEmojiSelect={(e: { native: string }) => {
                                onChange(e.native);
                                setShowPicker(false);
                            }}
                            theme={
                                document.documentElement.classList.contains(
                                    "dark"
                                )
                                    ? "dark"
                                    : "light"
                            }
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default function ResumePanel() {
    const { confirm } = useConfirmDialog();
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const [rowId, setRowId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const savedDataRef = useRef<string>("");
    const [resumeLayout, setResumeLayout] = useState<ResumeLayout>("modern");
    const [resumeSectionLayout, setResumeSectionLayout] =
        useState<ResumeSectionLayout>(DEFAULT_RESUME_LAYOUT);
    const [initialSectionLayout, setInitialSectionLayout] =
        useState<ResumeSectionLayout>(DEFAULT_RESUME_LAYOUT);
    const initialSectionLayoutRef = useRef<ResumeSectionLayout>(
        DEFAULT_RESUME_LAYOUT
    );
    const [layoutEditMode, setLayoutEditMode] = useState(false);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [activeJobField, setActiveJobField] = useState<string>("");
    // 직무 분야 필터 (null = 전체)
    const [filterJobField, setFilterJobField] = useState<string | null>(null);

    // Edit states for arrays
    const [editingWork, setEditingWork] = useState<number | null>(null);
    const [editingProject, setEditingProject] = useState<number | null>(null);
    const [editingEducation, setEditingEducation] = useState<number | null>(
        null
    );
    const [editingAward, setEditingAward] = useState<number | null>(null);
    const [editingLanguage, setEditingLanguage] = useState<number | null>(null);
    const [editingCareerPhase, setEditingCareerPhase] = useState<number | null>(
        null
    );
    const [editingCareerPhaseKeywords, setEditingCareerPhaseKeywords] =
        useState<string>("");
    const [backupData, setBackupData] = useState<Resume | null>(null);
    // 드래그 소스 추적 (type: 'work' | 'project', idx: 원래 인덱스)
    const dragSrcRef = useRef<{ type: string; idx: number } | null>(null);

    useEffect(() => {
        getResumeBootstrap().then((result) => {
            const defaultResume: Resume = {
                basics: {
                    name: "",
                    label: "",
                    image: "",
                    summary: "",
                    email: "",
                    phone: "",
                    url: "",
                },
            };
            if (result.resumeData) {
                setRowId(result.rowId);
                const raw = {
                    ...defaultResume,
                    ...(result.resumeData as Resume),
                };
                if (Array.isArray(raw.coreCompetencies)) {
                    raw.coreCompetencies = {
                        entries: raw.coreCompetencies as unknown as {
                            title: string;
                            description: string;
                        }[],
                    };
                }
                const loaded = normalizeSkills(raw);
                savedDataRef.current = JSON.stringify(loaded);
                setResumeData(loaded);
            } else {
                setResumeData(defaultResume);
            }

            setResumeLayout(result.resumeLayout as ResumeLayout);
            setResumeSectionLayout(result.resumeSectionLayout);
            setInitialSectionLayout(result.resumeSectionLayout);
            initialSectionLayoutRef.current = result.resumeSectionLayout;
            setJobFields(result.jobFields);
            setActiveJobField(normalizeJobFieldValue(result.activeJobField));
        });
    }, []);

    // dirty 상태 감지
    useEffect(() => {
        if (!resumeData || !savedDataRef.current) return;
        setIsDirty(JSON.stringify(resumeData) !== savedDataRef.current);
    }, [resumeData]);

    // section layout dirty 상태
    const isLayoutDirty =
        JSON.stringify(resumeSectionLayout) !==
        JSON.stringify(initialSectionLayout);

    // beforeunload + route navigation 가드
    useUnsavedWarning(isDirty || isLayoutDirty);

    // 섹션 wrapper style — layout edit mode + disabled + order 반영
    const sectionWrapperStyle = (key: string): React.CSSProperties => {
        if (layoutEditMode) return { display: "none" };
        return {
            order: resumeSectionLayout.order.indexOf(key),
            display: resumeSectionLayout.disabled.includes(key)
                ? "none"
                : undefined,
        };
    };

    // 자동 저장 (기존 row가 있을 때만)
    const autoSave = async () => {
        if (!resumeData || !rowId) return;
        try {
            const result = await saveResumePanel({
                resumeData,
                rowId,
                resumeLayout,
                resumeSectionLayout,
            });
            if (result.success) {
                savedDataRef.current = JSON.stringify(resumeData);
                setIsDirty(false);
                setSavedAt(new Date());
            }
        } catch (e) {
            console.error(
                `[ResumePanel::autoSave] ${e instanceof Error ? e.message : String(e)}`
            );
        }
    };

    useAutoSave(isDirty, rowId !== null, autoSave);

    const handleSave = async () => {
        if (!resumeData) return;
        setSaving(true);
        setStatus(null);

        try {
            const result = await saveResumePanel({
                resumeData,
                rowId,
                resumeLayout,
                resumeSectionLayout,
            });
            if (!result.success) throw new Error(result.error);
            if (result.rowId) setRowId(result.rowId);

            savedDataRef.current = JSON.stringify(resumeData);
            setIsDirty(false);
            setSavedAt(new Date());
            setInitialSectionLayout(resumeSectionLayout);
            initialSectionLayoutRef.current = resumeSectionLayout;
            setStatus({
                type: "success",
                msg: "저장됐습니다. 이력서 페이지에 즉시 반영됩니다.",
            });
        } catch (e) {
            setStatus({
                type: "error",
                msg: `저장 실패: ${e instanceof Error ? e.message : String(e)}`,
            });
        } finally {
            setSaving(false);
        }
    };

    const saveLayout = async (layout: ResumeLayout) => {
        const result = await saveResumeTheme(layout);
        if (!result.success) {
            setStatus({
                type: "error",
                msg: `레이아웃 저장 실패: ${result.error}`,
            });
        } else {
            setSavedAt(new Date());
        }
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file || !resumeData) return;
        if (!file.type.startsWith("image/")) {
            setStatus({
                type: "error",
                msg: "이미지 파일만 업로드 가능합니다.",
            });
            return;
        }

        setUploadingImage(true);
        setStatus(null);
        try {
            const url = await uploadImage(file, "resume");
            setResumeData({
                ...resumeData,
                basics: { ...resumeData.basics, image: url },
            });
            setStatus({ type: "success", msg: "이미지가 업로드되었습니다." });
        } catch (err) {
            setStatus({
                type: "error",
                msg: `이미지 업로드 실패: ${err instanceof Error ? err.message : String(err)}`,
            });
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const updateBasics = (field: keyof ResumeBasics, value: string) => {
        if (!resumeData) return;
        setResumeData({
            ...resumeData,
            basics: { ...resumeData.basics, [field]: value },
        });
    };

    if (!resumeData)
        return <div className="p-4 text-(--color-muted)">Loading...</div>;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* 상단 고정: 제목 + 저장 버튼 */}
            <div className="sticky top-0 z-10 shrink-0 bg-(--color-surface) pb-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        이력서 편집
                    </h2>
                    <div className="flex items-center gap-3">
                        {savedAt && (
                            <span className="text-sm text-green-600">
                                자동 저장 완료 {fmtTime(savedAt)}
                            </span>
                        )}
                        <button
                            onClick={async () => {
                                const saved = initialSectionLayoutRef.current;
                                const dirty =
                                    JSON.stringify(resumeSectionLayout) !==
                                    JSON.stringify(saved);
                                if (layoutEditMode && dirty) {
                                    const ok = await confirm({
                                        title: "레이아웃 편집 종료",
                                        description:
                                            "저장되지 않은 변경사항이 있습니다. 정말 종료하시겠습니까?",
                                        confirmText: "종료",
                                        cancelText: "계속 편집",
                                    });
                                    if (!ok) return;
                                    setResumeSectionLayout(saved);
                                }
                                setLayoutEditMode(!layoutEditMode);
                            }}
                            className="rounded-lg bg-(--color-accent) px-4 py-2.5 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                        >
                            {layoutEditMode
                                ? "레이아웃 편집 종료"
                                : "레이아웃 편집"}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || (!isDirty && !isLayoutDirty)}
                            className="rounded-lg bg-green-500 px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-green-400 disabled:opacity-50 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            {saving ? "저장 중..." : "변경사항 저장"}
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={`flex min-h-0 flex-1 flex-col gap-8 ${
                    layoutEditMode ? "overflow-hidden" : "overflow-y-auto"
                }`}
            >
                {status && (
                    <p
                        className={`rounded-lg px-3 py-2 text-base ${status.type === "error" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30"}`}
                    >
                        {status.msg}
                    </p>
                )}

                {/* 레이아웃 선택 — layout edit mode에서 숨김 */}
                {!layoutEditMode && (
                    <section className="space-y-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <h3 className="text-xl font-bold text-(--color-foreground)">
                            레이아웃
                        </h3>
                        <div className="flex gap-3">
                            {(["classic", "modern"] as ResumeLayout[]).map(
                                (l) => (
                                    <button
                                        key={l}
                                        onClick={() => {
                                            setResumeLayout(l);
                                            saveLayout(l);
                                        }}
                                        className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-opacity ${
                                            resumeLayout === l
                                                ? "bg-(--color-accent) text-(--color-on-accent)"
                                                : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"
                                        }`}
                                    >
                                        {l}
                                    </button>
                                )
                            )}
                        </div>
                    </section>
                )}

                {/* 기본 정보 — layout edit mode에서 숨김 */}
                {!layoutEditMode && (
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <h3 className="text-xl font-bold text-(--color-foreground)">
                            기본 정보
                        </h3>
                        <div className="tablet:flex-row tablet:gap-6 mb-4 flex flex-col items-start gap-4">
                            {resumeData.basics?.image && (
                                <img
                                    src={resumeData.basics.image}
                                    alt="Profile"
                                    className="tablet:h-48 tablet:w-48 h-32 w-32 shrink-0 rounded-full border border-(--color-border) object-cover"
                                />
                            )}
                            <div className="max-w-full min-w-0 flex-1">
                                <label className="text-sm font-medium text-(--color-muted)">
                                    프로필 사진 (자동 업로드)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className={`mt-4 block max-w-full cursor-pointer rounded-lg border-2 border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-foreground) file:mr-4 file:rounded-lg file:border-0 file:bg-(--color-surface-subtle) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--color-foreground) hover:file:bg-(--color-border) hover:file:text-(--color-foreground) disabled:opacity-50`}
                                />
                            </div>
                        </div>

                        <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                            <InputField
                                label="이름 (Name)"
                                value={resumeData.basics?.name || ""}
                                onChange={(v) => updateBasics("name", v)}
                            />
                            <InputField
                                label="직함 (Label)"
                                value={resumeData.basics?.label || ""}
                                onChange={(v) => updateBasics("label", v)}
                                placeholder="예: Frontend Developer"
                            />
                            <InputField
                                label="이메일"
                                value={resumeData.basics?.email || ""}
                                onChange={(v) => updateBasics("email", v)}
                            />
                            <InputField
                                label="전화번호"
                                value={resumeData.basics?.phone || ""}
                                onChange={(v) => updateBasics("phone", v)}
                            />
                            <InputField
                                label="웹사이트 URL"
                                value={resumeData.basics?.url || ""}
                                onChange={(v) => updateBasics("url", v)}
                            />
                        </div>
                        <TextAreaField
                            label="자기소개 (Summary)"
                            value={resumeData.basics?.summary || ""}
                            onChange={(v) => updateBasics("summary", v)}
                            rows={4}
                        />
                    </section>
                )}

                {/* 커리어 타임라인 */}
                <div
                    data-resume-section="careerPhases"
                    style={sectionWrapperStyle("careerPhases")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={
                                            resumeData.careerPhases?.emoji || ""
                                        }
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                careerPhases: {
                                                    ...(resumeData.careerPhases || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    커리어 타임라인
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-careerPhases"
                                        checked={
                                            resumeData.careerPhases
                                                ?.showEmoji === true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                careerPhases: {
                                                    ...(resumeData.careerPhases || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-careerPhases"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-bold whitespace-nowrap text-(--color-on-accent)"
                                onClick={() => {
                                    const newEntry: ResumeCareerPhase = {
                                        phase:
                                            (resumeData.careerPhases?.entries
                                                ?.length ?? 0) + 1,
                                        startDate: "",
                                        endDate: "",
                                        name: "",
                                        description: "",
                                        keywords: [],
                                    };
                                    const updated = {
                                        ...resumeData,
                                        careerPhases: {
                                            emoji:
                                                resumeData.careerPhases
                                                    ?.emoji ?? "",
                                            showEmoji:
                                                resumeData.careerPhases
                                                    ?.showEmoji ?? false,
                                            entries: [
                                                ...(resumeData.careerPhases
                                                    ?.entries ?? []),
                                                newEntry,
                                            ],
                                        },
                                    };
                                    setResumeData(updated);
                                    const newIdx =
                                        resumeData.careerPhases?.entries
                                            ?.length ?? 0;
                                    setEditingCareerPhase(newIdx);
                                    setEditingCareerPhaseKeywords("");
                                }}
                            >
                                + Phase 추가
                            </button>
                        </div>
                        {(resumeData.careerPhases?.entries ?? []).length ===
                        0 ? (
                            <p className="text-sm text-(--color-muted)">
                                아직 추가된 Phase가 없습니다.
                            </p>
                        ) : null}
                        {(resumeData.careerPhases?.entries ?? []).map(
                            (cp, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                                >
                                    {editingCareerPhase === idx ? (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <div className="w-24 flex-shrink-0">
                                                    <InputField
                                                        label="Phase 번호"
                                                        value={String(
                                                            cp.phase ?? ""
                                                        )}
                                                        onChange={(v) => {
                                                            const entries = [
                                                                ...(resumeData
                                                                    .careerPhases
                                                                    ?.entries ??
                                                                    []),
                                                            ];
                                                            entries[idx] = {
                                                                ...entries[idx],
                                                                phase:
                                                                    Number(v) ||
                                                                    undefined,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                careerPhases: {
                                                                    ...resumeData.careerPhases!,
                                                                    entries,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="1"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <InputField
                                                        label="이름"
                                                        value={cp.name ?? ""}
                                                        onChange={(v) => {
                                                            const entries = [
                                                                ...(resumeData
                                                                    .careerPhases
                                                                    ?.entries ??
                                                                    []),
                                                            ];
                                                            entries[idx] = {
                                                                ...entries[idx],
                                                                name: v,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                careerPhases: {
                                                                    ...resumeData.careerPhases!,
                                                                    entries,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="웹 개발 경력"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <InputField
                                                    label="시작일 (YYYY-MM)"
                                                    value={cp.startDate ?? ""}
                                                    onChange={(v) => {
                                                        const entries = [
                                                            ...(resumeData
                                                                .careerPhases
                                                                ?.entries ??
                                                                []),
                                                        ];
                                                        entries[idx] = {
                                                            ...entries[idx],
                                                            startDate: v,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            careerPhases: {
                                                                ...resumeData.careerPhases!,
                                                                entries,
                                                            },
                                                        });
                                                    }}
                                                    placeholder="2022-06"
                                                />
                                                <InputField
                                                    label="종료일 (YYYY-MM)"
                                                    value={cp.endDate ?? ""}
                                                    onChange={(v) => {
                                                        const entries = [
                                                            ...(resumeData
                                                                .careerPhases
                                                                ?.entries ??
                                                                []),
                                                        ];
                                                        entries[idx] = {
                                                            ...entries[idx],
                                                            endDate: v,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            careerPhases: {
                                                                ...resumeData.careerPhases!,
                                                                entries,
                                                            },
                                                        });
                                                    }}
                                                    placeholder="2025-05"
                                                />
                                            </div>
                                            <TextAreaField
                                                label="설명"
                                                value={cp.description ?? ""}
                                                onChange={(v) => {
                                                    const entries = [
                                                        ...(resumeData
                                                            .careerPhases
                                                            ?.entries ?? []),
                                                    ];
                                                    entries[idx] = {
                                                        ...entries[idx],
                                                        description: v,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        careerPhases: {
                                                            ...resumeData.careerPhases!,
                                                            entries,
                                                        },
                                                    });
                                                }}
                                                placeholder="줄바꿈으로 구분된 주요 내용"
                                                rows={3}
                                            />
                                            <InputField
                                                label="키워드 (쉼표로 구분)"
                                                value={
                                                    editingCareerPhaseKeywords
                                                }
                                                onChange={(v) =>
                                                    setEditingCareerPhaseKeywords(
                                                        v
                                                    )
                                                }
                                                placeholder="React, TypeScript, FastAPI"
                                            />
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                    onClick={() => {
                                                        const keywords =
                                                            editingCareerPhaseKeywords
                                                                .split(",")
                                                                .map((k) =>
                                                                    k.trim()
                                                                )
                                                                .filter(
                                                                    Boolean
                                                                );
                                                        const entries = [
                                                            ...(resumeData
                                                                .careerPhases
                                                                ?.entries ??
                                                                []),
                                                        ];
                                                        entries[idx] = {
                                                            ...entries[idx],
                                                            keywords,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            careerPhases: {
                                                                ...resumeData.careerPhases!,
                                                                entries,
                                                            },
                                                        });
                                                        setEditingCareerPhase(
                                                            null
                                                        );
                                                    }}
                                                >
                                                    저장
                                                </button>
                                                <button
                                                    className="rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-1.5 text-sm font-bold text-(--color-muted)"
                                                    onClick={() =>
                                                        setEditingCareerPhase(
                                                            null
                                                        )
                                                    }
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                                                    PHASE {cp.phase}
                                                </p>
                                                <p className="font-semibold text-(--color-foreground)">
                                                    {cp.name || "(이름 없음)"}
                                                </p>
                                                {cp.startDate || cp.endDate ? (
                                                    <p className="text-xs text-(--color-muted)">
                                                        {cp.startDate} ~{" "}
                                                        {cp.endDate ||
                                                            "Present"}
                                                    </p>
                                                ) : null}
                                                {cp.description ? (
                                                    <p className="mt-1 text-sm whitespace-pre-line text-(--color-foreground)">
                                                        {cp.description}
                                                    </p>
                                                ) : null}
                                                {cp.keywords &&
                                                cp.keywords.length > 0 ? (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {cp.keywords.map(
                                                            (kw, kIdx) => (
                                                                <span
                                                                    key={kIdx}
                                                                    className="rounded bg-(--color-border) px-1.5 py-0.5 text-xs text-(--color-muted)"
                                                                >
                                                                    {kw}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    className="rounded-lg bg-(--color-accent) px-3 py-1 text-sm font-bold whitespace-nowrap text-(--color-on-accent)"
                                                    onClick={() => {
                                                        setEditingCareerPhase(
                                                            idx
                                                        );
                                                        setEditingCareerPhaseKeywords(
                                                            (
                                                                cp.keywords ??
                                                                []
                                                            ).join(", ")
                                                        );
                                                    }}
                                                >
                                                    편집
                                                </button>
                                                <button
                                                    className="rounded-lg bg-red-500 px-3 py-1 text-sm font-bold whitespace-nowrap text-white"
                                                    onClick={() => {
                                                        const entries = (
                                                            resumeData
                                                                .careerPhases
                                                                ?.entries ?? []
                                                        ).filter(
                                                            (_, i) => i !== idx
                                                        );
                                                        setResumeData({
                                                            ...resumeData,
                                                            careerPhases: {
                                                                ...resumeData.careerPhases!,
                                                                entries,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </section>
                </div>

                {/* 핵심역량 (이력서와 함께 저장) */}
                <div
                    data-resume-section="coreCompetencies"
                    style={sectionWrapperStyle("coreCompetencies")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={
                                            resumeData?.coreCompetencies
                                                ?.emoji || ""
                                        }
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                coreCompetencies: {
                                                    ...(resumeData.coreCompetencies || {
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    Core Competencies (핵심역량)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-coreCompetencies"
                                        checked={
                                            resumeData?.coreCompetencies
                                                ?.showEmoji === true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                coreCompetencies: {
                                                    ...(resumeData.coreCompetencies || {
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-coreCompetencies"
                                        className="text-xs text-(--color-muted)"
                                    >
                                        Emoji 표시
                                    </label>
                                </div>
                            </div>
                            <span className="text-sm text-(--color-muted)">
                                {
                                    (
                                        resumeData?.coreCompetencies?.entries ??
                                        []
                                    ).length
                                }{" "}
                                / 4
                            </span>
                        </div>
                        <p className="text-sm text-(--color-muted)">
                            이력서의 핵심역량 섹션에 표시됩니다. 아래 저장
                            버튼으로 함께 저장됩니다.
                        </p>
                        {(resumeData?.coreCompetencies?.entries ?? []).map(
                            (comp, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-bold text-(--color-accent)">
                                            역량 {idx + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await confirm({
                                                    title: "역량 삭제",
                                                    description: `역량 ${idx + 1}을 삭제하시겠습니까?`,
                                                    confirmText: "삭제",
                                                    cancelText: "취소",
                                                    variant: "destructive",
                                                });
                                                if (!ok) return;
                                                setResumeData((prev) =>
                                                    prev
                                                        ? {
                                                              ...prev,
                                                              coreCompetencies:
                                                                  {
                                                                      ...prev.coreCompetencies,
                                                                      entries: (
                                                                          prev
                                                                              .coreCompetencies
                                                                              ?.entries ??
                                                                          []
                                                                      ).filter(
                                                                          (
                                                                              _,
                                                                              i
                                                                          ) =>
                                                                              i !==
                                                                              idx
                                                                      ),
                                                                  },
                                                          }
                                                        : prev
                                                );
                                            }}
                                            className="shrink-0 cursor-pointer rounded-lg bg-red-600 p-1.5 text-white"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                                Title
                                            </label>
                                            <input
                                                value={comp.title}
                                                onChange={(e) =>
                                                    setResumeData((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  coreCompetencies:
                                                                      {
                                                                          ...prev.coreCompetencies,
                                                                          entries:
                                                                              (
                                                                                  prev
                                                                                      .coreCompetencies
                                                                                      ?.entries ??
                                                                                  []
                                                                              ).map(
                                                                                  (
                                                                                      c,
                                                                                      i
                                                                                  ) =>
                                                                                      i ===
                                                                                      idx
                                                                                          ? {
                                                                                                ...c,
                                                                                                title: e
                                                                                                    .target
                                                                                                    .value,
                                                                                            }
                                                                                          : c
                                                                              ),
                                                                      },
                                                              }
                                                            : prev
                                                    )
                                                }
                                                placeholder="제목"
                                                className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                                Description
                                            </label>
                                            <input
                                                value={comp.description}
                                                onChange={(e) =>
                                                    setResumeData((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  coreCompetencies:
                                                                      {
                                                                          ...prev.coreCompetencies,
                                                                          entries:
                                                                              (
                                                                                  prev
                                                                                      .coreCompetencies
                                                                                      ?.entries ??
                                                                                  []
                                                                              ).map(
                                                                                  (
                                                                                      c,
                                                                                      i
                                                                                  ) =>
                                                                                      i ===
                                                                                      idx
                                                                                          ? {
                                                                                                ...c,
                                                                                                description:
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                            }
                                                                                          : c
                                                                              ),
                                                                      },
                                                              }
                                                            : prev
                                                    )
                                                }
                                                placeholder="설명"
                                                className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                        {(resumeData?.coreCompetencies?.entries ?? []).length <
                            4 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setResumeData((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  coreCompetencies: {
                                                      ...prev.coreCompetencies,
                                                      entries: [
                                                          ...(prev
                                                              .coreCompetencies
                                                              ?.entries ?? []),
                                                          {
                                                              title: "",
                                                              description: "",
                                                          },
                                                      ],
                                                  },
                                              }
                                            : prev
                                    )
                                }
                                className="rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-medium whitespace-nowrap text-(--color-on-accent)"
                            >
                                추가
                            </button>
                        )}
                    </section>
                </div>

                {/* 경력 (Work Experience) */}
                <div
                    data-resume-section="work"
                    style={sectionWrapperStyle("work")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={resumeData.work?.emoji || ""}
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                work: {
                                                    ...(resumeData.work || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    경력 (Work)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-work"
                                        checked={
                                            resumeData.work?.showEmoji === true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                work: {
                                                    ...(resumeData.work || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-work"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBackupData(resumeData);
                                    const newWork: ResumeWork = {
                                        name: "",
                                        position: "",
                                        startDate: "",
                                        jobField: activeJobField || undefined,
                                    };
                                    setResumeData({
                                        ...resumeData,
                                        work: {
                                            ...(resumeData.work || {
                                                showEmoji: false,
                                                emoji: "✔️",
                                                entries: [],
                                            }),
                                            entries: [
                                                newWork,
                                                ...(resumeData.work?.entries ||
                                                    []),
                                            ],
                                        },
                                    });
                                    setEditingWork(0);
                                }}
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                            >
                                + 경력 추가
                            </button>
                        </div>

                        {/* 직무 분야 필터 */}
                        {jobFields.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterJobField(null)}
                                    className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${filterJobField === null ? "bg-(--color-accent) text-(--color-on-accent)" : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"}`}
                                >
                                    전체
                                </button>
                                {jobFields.map((jf) => (
                                    <button
                                        key={jf.id}
                                        onClick={() =>
                                            setFilterJobField(
                                                filterJobField === jf.id
                                                    ? null
                                                    : jf.id
                                            )
                                        }
                                        className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${filterJobField === jf.id ? "bg-(--color-accent) text-(--color-on-accent)" : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"}`}
                                    >
                                        {jf.emoji ? `${jf.emoji} ` : ""}
                                        {jf.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="space-y-4">
                            {resumeData.work?.entries.map((work, idx) => {
                                if (
                                    filterJobField &&
                                    !matchesJobField(
                                        work.jobField,
                                        filterJobField
                                    )
                                )
                                    return null;
                                return (
                                    <div
                                        key={idx}
                                        draggable={editingWork !== idx}
                                        onDragStart={() => {
                                            dragSrcRef.current = {
                                                type: "work",
                                                idx,
                                            };
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (
                                                dragSrcRef.current?.type !==
                                                    "work" ||
                                                dragSrcRef.current.idx === idx
                                            )
                                                return;
                                            setResumeData({
                                                ...resumeData,
                                                work: {
                                                    ...resumeData.work!,
                                                    entries: reorderArray(
                                                        resumeData.work!
                                                            .entries,
                                                        dragSrcRef.current.idx,
                                                        idx
                                                    ),
                                                },
                                            });
                                            dragSrcRef.current = null;
                                        }}
                                        className="rounded-lg border border-(--color-border) bg-transparent p-4"
                                    >
                                        {editingWork === idx ? (
                                            <div className="space-y-4">
                                                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                                                    <InputField
                                                        label="회사명"
                                                        value={work.name || ""}
                                                        onChange={(v) => {
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            w[idx].name = v;
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <InputField
                                                        label="직책"
                                                        value={
                                                            work.position || ""
                                                        }
                                                        onChange={(v) => {
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            w[idx].position = v;
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <div className="flex flex-col space-y-1">
                                                        <label className="text-sm font-medium text-(--color-muted)">
                                                            시작일
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={
                                                                work.startDate ||
                                                                ""
                                                            }
                                                            onChange={(e) => {
                                                                const w = [
                                                                    ...resumeData
                                                                        .work!
                                                                        .entries,
                                                                ];
                                                                w[idx] = {
                                                                    ...w[idx],
                                                                    startDate:
                                                                        e.target
                                                                            .value,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    work: {
                                                                        ...(resumeData.work || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            w,
                                                                    },
                                                                });
                                                            }}
                                                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col space-y-1">
                                                        <label className="text-sm font-medium text-(--color-muted)">
                                                            종료일 (비워두면
                                                            '현재')
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={
                                                                work.endDate ||
                                                                ""
                                                            }
                                                            onChange={(e) => {
                                                                const w = [
                                                                    ...resumeData
                                                                        .work!
                                                                        .entries,
                                                                ];
                                                                w[idx] = {
                                                                    ...w[idx],
                                                                    endDate:
                                                                        e.target
                                                                            .value,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    work: {
                                                                        ...(resumeData.work || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            w,
                                                                    },
                                                                });
                                                            }}
                                                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            work.hideDays ||
                                                            false
                                                        }
                                                        onChange={(e) => {
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            w[idx] = {
                                                                ...w[idx],
                                                                hideDays:
                                                                    e.target
                                                                        .checked,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                        }}
                                                        className="accent-(--color-accent)"
                                                    />
                                                    날짜에서 일(Day) 숨기기
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            work.markdown ||
                                                            false
                                                        }
                                                        onChange={(e) => {
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            w[idx] = {
                                                                ...w[idx],
                                                                markdown:
                                                                    e.target
                                                                        .checked,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                        }}
                                                        className="accent-(--color-accent)"
                                                    />
                                                    요약/성과를 마크다운으로
                                                    렌더링
                                                </label>
                                                <TextAreaField
                                                    label="요약 (Summary)"
                                                    value={work.summary || ""}
                                                    onChange={(v) => {
                                                        const w = [
                                                            ...(resumeData.work
                                                                ?.entries ||
                                                                []),
                                                        ];
                                                        w[idx].summary = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: {
                                                                ...(resumeData.work || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: w,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <TextAreaField
                                                    label="주요 성과 (Highlights, 엔터로 구분)"
                                                    value={
                                                        work.highlights?.join(
                                                            "\n"
                                                        ) || ""
                                                    }
                                                    onChange={(v) => {
                                                        const w = [
                                                            ...(resumeData.work
                                                                ?.entries ||
                                                                []),
                                                        ];
                                                        w[idx].highlights =
                                                            v.split("\n");
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: {
                                                                ...(resumeData.work || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: w,
                                                            },
                                                        });
                                                    }}
                                                    rows={4}
                                                />
                                                <JobFieldSelector
                                                    value={work.jobField}
                                                    fields={jobFields}
                                                    onChange={(v) => {
                                                        const w = [
                                                            ...(resumeData.work
                                                                ?.entries ||
                                                                []),
                                                        ];
                                                        w[idx].jobField = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: {
                                                                ...(resumeData.work || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: w,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            if (backupData)
                                                                setResumeData(
                                                                    backupData
                                                                );
                                                            setEditingWork(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(null);
                                                            setEditingWork(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                    >
                                                        완료
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <span
                                                    className="mt-1 cursor-grab text-lg text-(--color-muted) select-none"
                                                    title="드래그로 순서 변경"
                                                >
                                                    ⠿
                                                </span>
                                                <div className="mr-12 flex-1">
                                                    <h4 className="font-semibold text-(--color-foreground)">
                                                        {work.position} @{" "}
                                                        {work.name}
                                                    </h4>
                                                    <p className="text-sm text-(--color-muted)">
                                                        {work.startDate} ~{" "}
                                                        {work.endDate || "현재"}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <JobFieldBadges
                                                            value={
                                                                work.jobField
                                                            }
                                                            fields={jobFields}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(
                                                                resumeData
                                                            );
                                                            setEditingWork(idx);
                                                        }}
                                                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // 항목을 복사해 맨 앞에 추가 후 편집 모드 진입
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            const copy = {
                                                                ...w[idx],
                                                                jobField:
                                                                    activeJobField ||
                                                                    undefined,
                                                            };
                                                            w.unshift(copy);
                                                            setBackupData(
                                                                resumeData
                                                            );
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                            setEditingWork(0);
                                                        }}
                                                        className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-muted) transition-opacity hover:opacity-90"
                                                    >
                                                        복사
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const ok =
                                                                await confirm({
                                                                    title: "경력 삭제",
                                                                    description:
                                                                        "삭제하시겠습니까?",
                                                                    confirmText:
                                                                        "삭제",
                                                                    cancelText:
                                                                        "취소",
                                                                    variant:
                                                                        "destructive",
                                                                });
                                                            if (!ok) return;
                                                            const w = [
                                                                ...resumeData
                                                                    .work!
                                                                    .entries,
                                                            ];
                                                            w.splice(idx, 1);
                                                            setResumeData({
                                                                ...resumeData,
                                                                work: {
                                                                    ...(resumeData.work || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: w,
                                                                },
                                                            });
                                                        }}
                                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* 프로젝트 (Projects) */}
                <div
                    data-resume-section="projects"
                    style={sectionWrapperStyle("projects")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={resumeData.projects?.emoji || ""}
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                projects: {
                                                    ...(resumeData.projects || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    프로젝트 (Projects)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-projects"
                                        checked={
                                            resumeData.projects?.showEmoji ===
                                            true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                projects: {
                                                    ...(resumeData.projects || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-projects"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBackupData(resumeData);
                                    const newProj: ResumeProject = {
                                        name: "",
                                        sections: [
                                            { title: "설명", content: "" },
                                            { title: "성과", content: "" },
                                        ],
                                        jobField: activeJobField || undefined,
                                    };
                                    setResumeData({
                                        ...resumeData,
                                        projects: {
                                            ...(resumeData.projects || {
                                                showEmoji: false,
                                                emoji: "✔️",
                                                entries: [],
                                            }),
                                            entries: [
                                                newProj,
                                                ...(resumeData.projects
                                                    ?.entries || []),
                                            ],
                                        },
                                    });
                                    setEditingProject(0);
                                }}
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                            >
                                + 프로젝트 추가
                            </button>
                        </div>

                        {/* 직무 분야 필터 */}
                        {jobFields.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterJobField(null)}
                                    className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${filterJobField === null ? "bg-(--color-accent) text-(--color-on-accent)" : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"}`}
                                >
                                    전체
                                </button>
                                {jobFields.map((jf) => (
                                    <button
                                        key={jf.id}
                                        onClick={() =>
                                            setFilterJobField(
                                                filterJobField === jf.id
                                                    ? null
                                                    : jf.id
                                            )
                                        }
                                        className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${filterJobField === jf.id ? "bg-(--color-accent) text-(--color-on-accent)" : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"}`}
                                    >
                                        {jf.emoji ? `${jf.emoji} ` : ""}
                                        {jf.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="space-y-4">
                            {resumeData.projects?.entries.map((proj, idx) => {
                                if (
                                    filterJobField &&
                                    !matchesJobField(
                                        proj.jobField,
                                        filterJobField
                                    )
                                )
                                    return null;
                                return (
                                    <div
                                        key={idx}
                                        draggable={editingProject !== idx}
                                        onDragStart={() => {
                                            dragSrcRef.current = {
                                                type: "project",
                                                idx,
                                            };
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (
                                                dragSrcRef.current?.type !==
                                                    "project" ||
                                                dragSrcRef.current.idx === idx
                                            )
                                                return;
                                            setResumeData({
                                                ...resumeData,
                                                projects: {
                                                    ...resumeData.projects!,
                                                    entries: reorderArray(
                                                        resumeData.projects!
                                                            .entries,
                                                        dragSrcRef.current.idx,
                                                        idx
                                                    ),
                                                },
                                            });
                                            dragSrcRef.current = null;
                                        }}
                                        className="rounded-lg border border-(--color-border) bg-transparent p-4"
                                    >
                                        {editingProject === idx ? (
                                            <div className="space-y-4">
                                                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                                                    <InputField
                                                        label="프로젝트명"
                                                        value={proj.name || ""}
                                                        onChange={(v) => {
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p[idx].name = v;
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <InputField
                                                        label="역할 (Roles, 쉼표 구분)"
                                                        value={
                                                            proj.roles?.join(
                                                                ", "
                                                            ) || ""
                                                        }
                                                        onChange={(v) => {
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p[idx].roles = v
                                                                .split(",")
                                                                .map((s) =>
                                                                    s.trim()
                                                                );
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <div className="flex flex-col space-y-1">
                                                        <label className="text-sm font-medium text-(--color-muted)">
                                                            시작일
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={
                                                                proj.startDate ||
                                                                ""
                                                            }
                                                            onChange={(e) => {
                                                                const p = [
                                                                    ...resumeData
                                                                        .projects!
                                                                        .entries,
                                                                ];
                                                                p[idx] = {
                                                                    ...p[idx],
                                                                    startDate:
                                                                        e.target
                                                                            .value,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    projects: {
                                                                        ...(resumeData.projects || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            p,
                                                                    },
                                                                });
                                                            }}
                                                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col space-y-1">
                                                        <label className="text-sm font-medium text-(--color-muted)">
                                                            종료일
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={
                                                                proj.endDate ||
                                                                ""
                                                            }
                                                            onChange={(e) => {
                                                                const p = [
                                                                    ...resumeData
                                                                        .projects!
                                                                        .entries,
                                                                ];
                                                                p[idx] = {
                                                                    ...p[idx],
                                                                    endDate:
                                                                        e.target
                                                                            .value,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    projects: {
                                                                        ...(resumeData.projects || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            p,
                                                                    },
                                                                });
                                                            }}
                                                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                        />
                                                    </div>
                                                    <InputField
                                                        label="라이브 URL"
                                                        value={proj.url || ""}
                                                        onChange={(v) => {
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p[idx].url = v;
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="https://..."
                                                    />
                                                    <InputField
                                                        label="URL 표시 텍스트 (기본: 라이브 URL)"
                                                        value={
                                                            proj.urlLabel || ""
                                                        }
                                                        onChange={(v) => {
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p[idx].urlLabel = v;
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="예: 게임 시연 영상, 발표 자료"
                                                    />
                                                </div>
                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            proj.hideDays ||
                                                            false
                                                        }
                                                        onChange={(e) => {
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p[idx] = {
                                                                ...p[idx],
                                                                hideDays:
                                                                    e.target
                                                                        .checked,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                        className="accent-(--color-accent)"
                                                    />
                                                    날짜에서 일(Day) 숨기기
                                                </label>
                                                {/* 자유 양식 섹션 목록 */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-(--color-muted)">
                                                            섹션 목록
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const p = [
                                                                    ...resumeData
                                                                        .projects!
                                                                        .entries,
                                                                ];
                                                                const sections =
                                                                    [
                                                                        ...(p[
                                                                            idx
                                                                        ]
                                                                            .sections ||
                                                                            []),
                                                                        {
                                                                            title: "",
                                                                            content:
                                                                                "",
                                                                        },
                                                                    ];
                                                                p[idx] = {
                                                                    ...p[idx],
                                                                    sections,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    projects: {
                                                                        ...(resumeData.projects || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            p,
                                                                    },
                                                                });
                                                            }}
                                                            className="rounded-lg border border-(--color-border) px-3 py-1 text-sm text-(--color-muted) hover:text-(--color-foreground)"
                                                        >
                                                            + 섹션 추가
                                                        </button>
                                                    </div>
                                                    {(proj.sections || []).map(
                                                        (sec, sIdx) => (
                                                            <div
                                                                key={sIdx}
                                                                className="space-y-2 rounded-lg border border-(--color-border) p-3"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            sec.title
                                                                        }
                                                                        placeholder="섹션 제목"
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const p =
                                                                                [
                                                                                    ...resumeData
                                                                                        .projects!
                                                                                        .entries,
                                                                                ];
                                                                            const sections =
                                                                                p[
                                                                                    idx
                                                                                ].sections!.map(
                                                                                    (
                                                                                        s,
                                                                                        i
                                                                                    ) =>
                                                                                        i ===
                                                                                        sIdx
                                                                                            ? {
                                                                                                  ...s,
                                                                                                  title: e
                                                                                                      .target
                                                                                                      .value,
                                                                                              }
                                                                                            : s
                                                                                );
                                                                            p[
                                                                                idx
                                                                            ] =
                                                                                {
                                                                                    ...p[
                                                                                        idx
                                                                                    ],
                                                                                    sections,
                                                                                };
                                                                            setResumeData(
                                                                                {
                                                                                    ...resumeData,
                                                                                    projects:
                                                                                        {
                                                                                            ...resumeData.projects!,
                                                                                            entries:
                                                                                                p,
                                                                                        },
                                                                                }
                                                                            );
                                                                        }}
                                                                        className="flex-1 rounded-lg border border-(--color-border) bg-transparent px-3 py-1.5 text-sm font-medium text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const p =
                                                                                [
                                                                                    ...resumeData
                                                                                        .projects!
                                                                                        .entries,
                                                                                ];
                                                                            const sections =
                                                                                p[
                                                                                    idx
                                                                                ].sections!.filter(
                                                                                    (
                                                                                        _,
                                                                                        i
                                                                                    ) =>
                                                                                        i !==
                                                                                        sIdx
                                                                                );
                                                                            p[
                                                                                idx
                                                                            ] =
                                                                                {
                                                                                    ...p[
                                                                                        idx
                                                                                    ],
                                                                                    sections,
                                                                                };
                                                                            setResumeData(
                                                                                {
                                                                                    ...resumeData,
                                                                                    projects:
                                                                                        {
                                                                                            ...resumeData.projects!,
                                                                                            entries:
                                                                                                p,
                                                                                        },
                                                                                }
                                                                            );
                                                                        }}
                                                                        className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    value={
                                                                        sec.content
                                                                    }
                                                                    placeholder="내용"
                                                                    rows={3}
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const p =
                                                                            [
                                                                                ...resumeData
                                                                                    .projects!
                                                                                    .entries,
                                                                            ];
                                                                        const sections =
                                                                            p[
                                                                                idx
                                                                            ].sections!.map(
                                                                                (
                                                                                    s,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    sIdx
                                                                                        ? {
                                                                                              ...s,
                                                                                              content:
                                                                                                  e
                                                                                                      .target
                                                                                                      .value,
                                                                                          }
                                                                                        : s
                                                                            );
                                                                        p[idx] =
                                                                            {
                                                                                ...p[
                                                                                    idx
                                                                                ],
                                                                                sections,
                                                                            };
                                                                        setResumeData(
                                                                            {
                                                                                ...resumeData,
                                                                                projects:
                                                                                    {
                                                                                        ...(resumeData.projects || {
                                                                                            showEmoji: false,
                                                                                            emoji: "✔️",
                                                                                            entries:
                                                                                                [],
                                                                                        }),
                                                                                        entries:
                                                                                            p,
                                                                                    },
                                                                            }
                                                                        );
                                                                    }}
                                                                    className="w-full resize-y rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                                                />
                                                                <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            sec.markdown ||
                                                                            false
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) => {
                                                                            const p =
                                                                                [
                                                                                    ...resumeData
                                                                                        .projects!
                                                                                        .entries,
                                                                                ];
                                                                            const sections =
                                                                                p[
                                                                                    idx
                                                                                ].sections!.map(
                                                                                    (
                                                                                        s,
                                                                                        i
                                                                                    ) =>
                                                                                        i ===
                                                                                        sIdx
                                                                                            ? {
                                                                                                  ...s,
                                                                                                  markdown:
                                                                                                      e
                                                                                                          .target
                                                                                                          .checked,
                                                                                              }
                                                                                            : s
                                                                                );
                                                                            p[
                                                                                idx
                                                                            ] =
                                                                                {
                                                                                    ...p[
                                                                                        idx
                                                                                    ],
                                                                                    sections,
                                                                                };
                                                                            setResumeData(
                                                                                {
                                                                                    ...resumeData,
                                                                                    projects:
                                                                                        {
                                                                                            ...resumeData.projects!,
                                                                                            entries:
                                                                                                p,
                                                                                        },
                                                                                }
                                                                            );
                                                                        }}
                                                                        className="accent-(--color-accent)"
                                                                    />
                                                                    마크다운으로
                                                                    렌더링
                                                                </label>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                <JobFieldSelector
                                                    value={proj.jobField}
                                                    fields={jobFields}
                                                    onChange={(v) => {
                                                        const p = [
                                                            ...resumeData
                                                                .projects!
                                                                .entries,
                                                        ];
                                                        p[idx].jobField = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: {
                                                                ...(resumeData.projects || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: p,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            if (backupData)
                                                                setResumeData(
                                                                    backupData
                                                                );
                                                            setEditingProject(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(null);
                                                            setEditingProject(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                    >
                                                        완료
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <span
                                                    className="mt-1 cursor-grab text-lg text-(--color-muted) select-none"
                                                    title="드래그로 순서 변경"
                                                >
                                                    ⠿
                                                </span>
                                                <div className="mr-12 flex-1">
                                                    <h4 className="font-semibold text-(--color-foreground)">
                                                        {proj.name}
                                                    </h4>
                                                    <p className="text-sm text-(--color-muted)">
                                                        {proj.description?.substring(
                                                            0,
                                                            100
                                                        )}
                                                        {proj.description &&
                                                        proj.description
                                                            .length > 100
                                                            ? "..."
                                                            : ""}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <JobFieldBadges
                                                            value={
                                                                proj.jobField
                                                            }
                                                            fields={jobFields}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(
                                                                resumeData
                                                            );
                                                            // sections가 없으면 기존 description/highlights로 초기화
                                                            if (
                                                                !resumeData
                                                                    .projects!
                                                                    .entries[
                                                                    idx
                                                                ].sections
                                                            ) {
                                                                const p = [
                                                                    ...resumeData
                                                                        .projects!
                                                                        .entries,
                                                                ];
                                                                p[idx] = {
                                                                    ...p[idx],
                                                                    sections: [
                                                                        {
                                                                            title: "설명",
                                                                            content:
                                                                                p[
                                                                                    idx
                                                                                ]
                                                                                    .description ||
                                                                                "",
                                                                        },
                                                                        {
                                                                            title: "성과",
                                                                            content:
                                                                                p[
                                                                                    idx
                                                                                ].highlights?.join(
                                                                                    "\n"
                                                                                ) ||
                                                                                "",
                                                                        },
                                                                    ],
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    projects: {
                                                                        ...(resumeData.projects || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            p,
                                                                    },
                                                                });
                                                            }
                                                            setEditingProject(
                                                                idx
                                                            );
                                                        }}
                                                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // 항목을 복사해 맨 앞에 추가 후 편집 모드 진입
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            const copy = {
                                                                ...p[idx],
                                                                jobField:
                                                                    activeJobField ||
                                                                    undefined,
                                                            };
                                                            p.unshift(copy);
                                                            setBackupData(
                                                                resumeData
                                                            );
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                            setEditingProject(
                                                                0
                                                            );
                                                        }}
                                                        className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-muted) transition-opacity hover:opacity-90"
                                                    >
                                                        복사
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const ok =
                                                                await confirm({
                                                                    title: "프로젝트 삭제",
                                                                    description:
                                                                        "삭제하시겠습니까?",
                                                                    confirmText:
                                                                        "삭제",
                                                                    cancelText:
                                                                        "취소",
                                                                    variant:
                                                                        "destructive",
                                                                });
                                                            if (!ok) return;
                                                            const p = [
                                                                ...resumeData
                                                                    .projects!
                                                                    .entries,
                                                            ];
                                                            p.splice(idx, 1);
                                                            setResumeData({
                                                                ...resumeData,
                                                                projects: {
                                                                    ...(resumeData.projects || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: p,
                                                                },
                                                            });
                                                        }}
                                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* 학력 (Education) */}
                <div
                    data-resume-section="education"
                    style={sectionWrapperStyle("education")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={
                                            resumeData.education?.emoji || ""
                                        }
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                education: {
                                                    ...(resumeData.education || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    학력 (Education)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-education"
                                        checked={
                                            resumeData.education?.showEmoji ===
                                            true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                education: {
                                                    ...(resumeData.education || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-education"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBackupData(resumeData);
                                    const newEd: ResumeEducation = {
                                        institution: "",
                                        area: "",
                                        studyType: "",
                                    };
                                    setResumeData({
                                        ...resumeData,
                                        education: {
                                            ...(resumeData.education || {
                                                showEmoji: false,
                                                emoji: "✔️",
                                                entries: [],
                                            }),
                                            entries: [
                                                newEd,
                                                ...(resumeData.education
                                                    ?.entries || []),
                                            ],
                                        },
                                    });
                                    setEditingEducation(0);
                                }}
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                            >
                                + 학력 추가
                            </button>
                        </div>

                        <div className="space-y-4">
                            {resumeData.education?.entries.map((ed, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-(--color-border) bg-transparent p-4"
                                >
                                    {editingEducation === idx ? (
                                        <div className="space-y-4">
                                            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                                                <InputField
                                                    label="학교/기관명"
                                                    value={ed.institution || ""}
                                                    onChange={(v) => {
                                                        const e = [
                                                            ...resumeData
                                                                .education!
                                                                .entries,
                                                        ];
                                                        e[idx].institution = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            education: {
                                                                ...(resumeData.education || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: e,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <InputField
                                                    label="전공/분야 (Area)"
                                                    value={ed.area || ""}
                                                    onChange={(v) => {
                                                        const e = [
                                                            ...resumeData
                                                                .education!
                                                                .entries,
                                                        ];
                                                        e[idx].area = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            education: {
                                                                ...(resumeData.education || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: e,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <InputField
                                                    label="학위 (Study Type)"
                                                    value={ed.studyType || ""}
                                                    onChange={(v) => {
                                                        const e = [
                                                            ...resumeData
                                                                .education!
                                                                .entries,
                                                        ];
                                                        e[idx].studyType = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            education: {
                                                                ...(resumeData.education || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: e,
                                                            },
                                                        });
                                                    }}
                                                />
                                                <div className="flex flex-col space-y-1">
                                                    <label className="text-sm font-medium text-(--color-muted)">
                                                        시작일
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={
                                                            ed.startDate || ""
                                                        }
                                                        onChange={(ev) => {
                                                            const e = [
                                                                ...resumeData
                                                                    .education!
                                                                    .entries,
                                                            ];
                                                            e[idx] = {
                                                                ...e[idx],
                                                                startDate:
                                                                    ev.target
                                                                        .value,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                education: {
                                                                    ...(resumeData.education || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: e,
                                                                },
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col space-y-1">
                                                    <label className="text-sm font-medium text-(--color-muted)">
                                                        종료일
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={ed.endDate || ""}
                                                        onChange={(ev) => {
                                                            const e = [
                                                                ...resumeData
                                                                    .education!
                                                                    .entries,
                                                            ];
                                                            e[idx] = {
                                                                ...e[idx],
                                                                endDate:
                                                                    ev.target
                                                                        .value,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                education: {
                                                                    ...(resumeData.education || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: e,
                                                                },
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            {/* GPA 입력 */}
                                            <div className="flex items-end gap-3">
                                                <div className="flex flex-col space-y-1">
                                                    <label className="text-sm font-medium text-(--color-muted)">
                                                        Max GPA
                                                    </label>
                                                    <select
                                                        value={ed.gpaMax ?? 4.5}
                                                        onChange={(ev) => {
                                                            const newMax =
                                                                parseFloat(
                                                                    ev.target
                                                                        .value
                                                                ) as 4 | 4.5;
                                                            const e = [
                                                                ...resumeData
                                                                    .education!
                                                                    .entries,
                                                            ];
                                                            // 기존 gpa 비례 환산
                                                            if (
                                                                e[idx].gpa !=
                                                                null
                                                            ) {
                                                                const oldMax =
                                                                    e[idx]
                                                                        .gpaMax ??
                                                                    4.5;
                                                                e[idx].gpa =
                                                                    Math.round(
                                                                        (e[idx]
                                                                            .gpa! /
                                                                            oldMax) *
                                                                            newMax *
                                                                            100
                                                                    ) / 100;
                                                            }
                                                            e[idx].gpaMax =
                                                                newMax;
                                                            setResumeData({
                                                                ...resumeData,
                                                                education: {
                                                                    ...(resumeData.education || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: e,
                                                                },
                                                            });
                                                        }}
                                                        className="rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                    >
                                                        <option value={4.5}>
                                                            4.5
                                                        </option>
                                                        <option value={4}>
                                                            4.0
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col space-y-1">
                                                    <label className="text-sm font-medium text-(--color-muted)">
                                                        GPA
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={ed.gpaMax ?? 4.5}
                                                        step={0.01}
                                                        value={ed.gpa ?? ""}
                                                        onChange={(ev) => {
                                                            const raw =
                                                                parseFloat(
                                                                    ev.target
                                                                        .value
                                                                );
                                                            const max =
                                                                ed.gpaMax ??
                                                                4.5;
                                                            const e = [
                                                                ...resumeData
                                                                    .education!
                                                                    .entries,
                                                            ];
                                                            e[idx].gpa = isNaN(
                                                                raw
                                                            )
                                                                ? undefined
                                                                : Math.min(
                                                                      max,
                                                                      Math.max(
                                                                          0,
                                                                          raw
                                                                      )
                                                                  );
                                                            setResumeData({
                                                                ...resumeData,
                                                                education: {
                                                                    ...(resumeData.education || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: e,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="예: 4.2"
                                                        className="w-28 rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        if (backupData)
                                                            setResumeData(
                                                                backupData
                                                            );
                                                        setEditingEducation(
                                                            null
                                                        );
                                                    }}
                                                    className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBackupData(null);
                                                        setEditingEducation(
                                                            null
                                                        );
                                                    }}
                                                    className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                >
                                                    완료
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between">
                                            <div className="mr-12">
                                                <h4 className="font-semibold text-(--color-foreground)">
                                                    {ed.institution}
                                                </h4>
                                                <p className="text-sm text-(--color-muted)">
                                                    {ed.studyType} in {ed.area}{" "}
                                                    ({ed.startDate} ~{" "}
                                                    {ed.endDate})
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setBackupData(
                                                            resumeData
                                                        );
                                                        setEditingEducation(
                                                            idx
                                                        );
                                                    }}
                                                    className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const ok =
                                                            await confirm({
                                                                title: "교육 삭제",
                                                                description:
                                                                    "삭제하시겠습니까?",
                                                                confirmText:
                                                                    "삭제",
                                                                cancelText:
                                                                    "취소",
                                                                variant:
                                                                    "destructive",
                                                            });
                                                        if (!ok) return;
                                                        const e = [
                                                            ...resumeData
                                                                .education!
                                                                .entries,
                                                        ];
                                                        e.splice(idx, 1);
                                                        setResumeData({
                                                            ...resumeData,
                                                            education: {
                                                                ...(resumeData.education || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: e,
                                                            },
                                                        });
                                                    }}
                                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* 수상 (Awards) */}
                <div
                    data-resume-section="awards"
                    style={sectionWrapperStyle("awards")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={resumeData.awards?.emoji || ""}
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                awards: {
                                                    ...(resumeData.awards || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    수상 (Awards)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-awards"
                                        checked={
                                            resumeData.awards?.showEmoji ===
                                            true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                awards: {
                                                    ...(resumeData.awards || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-awards"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBackupData(resumeData);
                                    const newAward: ResumeAward = {
                                        title: "",
                                        date: "",
                                        awarder: "",
                                        summary: "",
                                    };
                                    setResumeData({
                                        ...resumeData,
                                        awards: {
                                            ...(resumeData.awards || {
                                                showEmoji: false,
                                                emoji: "✔️",
                                                entries: [],
                                            }),
                                            entries: [
                                                newAward,
                                                ...(resumeData.awards
                                                    ?.entries || []),
                                            ],
                                        },
                                    });
                                    setEditingAward(0);
                                }}
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                            >
                                + 수상 추가
                            </button>
                        </div>
                        <div className="space-y-4">
                            {(resumeData.awards?.entries || []).map(
                                (award, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg border border-(--color-border) bg-transparent p-4"
                                    >
                                        {editingAward === idx ? (
                                            <div className="space-y-4">
                                                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                                                    <InputField
                                                        label="수상명"
                                                        value={
                                                            award.title || ""
                                                        }
                                                        onChange={(v) => {
                                                            const a = [
                                                                ...(resumeData
                                                                    .awards
                                                                    ?.entries ||
                                                                    []),
                                                            ];
                                                            a[idx] = {
                                                                ...a[idx],
                                                                title: v,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                awards: {
                                                                    ...(resumeData.awards || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: a,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <InputField
                                                        label="수여기관"
                                                        value={
                                                            award.awarder || ""
                                                        }
                                                        onChange={(v) => {
                                                            const a = [
                                                                ...(resumeData
                                                                    .awards
                                                                    ?.entries ||
                                                                    []),
                                                            ];
                                                            a[idx] = {
                                                                ...a[idx],
                                                                awarder: v,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                awards: {
                                                                    ...(resumeData.awards || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: a,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                    <InputField
                                                        label="날짜 (YYYY-MM)"
                                                        value={award.date || ""}
                                                        onChange={(v) => {
                                                            const a = [
                                                                ...(resumeData
                                                                    .awards
                                                                    ?.entries ||
                                                                    []),
                                                            ];
                                                            a[idx] = {
                                                                ...a[idx],
                                                                date: v,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                awards: {
                                                                    ...(resumeData.awards || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: a,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-medium text-(--color-muted)">
                                                            내용
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const a = [
                                                                    ...(resumeData
                                                                        .awards
                                                                        ?.entries ||
                                                                        []),
                                                                ];
                                                                a[idx] = {
                                                                    ...a[idx],
                                                                    markdown:
                                                                        !a[idx]
                                                                            .markdown,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    awards: {
                                                                        ...(resumeData.awards || {
                                                                            showEmoji: false,
                                                                            emoji: "✔️",
                                                                            entries:
                                                                                [],
                                                                        }),
                                                                        entries:
                                                                            a,
                                                                    },
                                                                });
                                                            }}
                                                            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                                                award.markdown
                                                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                                                    : "border border-(--color-border) text-(--color-muted)"
                                                            }`}
                                                        >
                                                            Markdown
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={
                                                            award.summary || ""
                                                        }
                                                        onChange={(e) => {
                                                            const a = [
                                                                ...(resumeData
                                                                    .awards
                                                                    ?.entries ||
                                                                    []),
                                                            ];
                                                            a[idx] = {
                                                                ...a[idx],
                                                                summary:
                                                                    e.target
                                                                        .value,
                                                            };
                                                            setResumeData({
                                                                ...resumeData,
                                                                awards: {
                                                                    ...(resumeData.awards || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: a,
                                                                },
                                                            });
                                                        }}
                                                        rows={3}
                                                        placeholder={
                                                            award.markdown
                                                                ? "마크다운 형식으로 작성"
                                                                : "수상 내용"
                                                        }
                                                        className="w-full resize-y rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            if (backupData)
                                                                setResumeData(
                                                                    backupData
                                                                );
                                                            setEditingAward(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(null);
                                                            setEditingAward(
                                                                null
                                                            );
                                                        }}
                                                        className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                    >
                                                        완료
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between">
                                                <div className="mr-12">
                                                    <h4 className="font-semibold text-(--color-foreground)">
                                                        {award.title}
                                                    </h4>
                                                    <p className="text-sm text-(--color-muted)">
                                                        {award.awarder}
                                                        {award.date
                                                            ? ` · ${award.date}`
                                                            : ""}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setBackupData(
                                                                resumeData
                                                            );
                                                            setEditingAward(
                                                                idx
                                                            );
                                                        }}
                                                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const ok =
                                                                await confirm({
                                                                    title: "수상 삭제",
                                                                    description:
                                                                        "삭제하시겠습니까?",
                                                                    confirmText:
                                                                        "삭제",
                                                                    cancelText:
                                                                        "취소",
                                                                    variant:
                                                                        "destructive",
                                                                });
                                                            if (!ok) return;
                                                            const a = [
                                                                ...(resumeData
                                                                    .awards
                                                                    ?.entries ||
                                                                    []),
                                                            ];
                                                            a.splice(idx, 1);
                                                            setResumeData({
                                                                ...resumeData,
                                                                awards: {
                                                                    ...(resumeData.awards || {
                                                                        showEmoji: false,
                                                                        emoji: "✔️",
                                                                        entries:
                                                                            [],
                                                                    }),
                                                                    entries: a,
                                                                },
                                                            });
                                                        }}
                                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                </div>

                {/* 스킬 (Skills) */}
                <div
                    data-resume-section="skills"
                    style={sectionWrapperStyle("skills")}
                >
                    <SkillsAdminSection
                        resumeData={resumeData}
                        setResumeData={setResumeData}
                        jobFields={jobFields}
                        onBackup={() => setBackupData(resumeData)}
                    />
                </div>

                {/* 언어 (Languages) */}
                <div
                    data-resume-section="languages"
                    style={sectionWrapperStyle("languages")}
                >
                    <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="flex items-center text-xl font-bold text-(--color-foreground)">
                                    <SectionEmojiSelector
                                        value={
                                            resumeData.languages?.emoji || ""
                                        }
                                        onChange={(v) => {
                                            setResumeData({
                                                ...resumeData,
                                                languages: {
                                                    ...(resumeData.languages || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    emoji: v,
                                                },
                                            });
                                        }}
                                    />
                                    언어 (Languages)
                                </h3>
                                <div className="ml-4 flex items-center gap-2">
                                    <Switch
                                        id="show-emojis-languages"
                                        checked={
                                            resumeData.languages?.showEmoji ===
                                            true
                                        }
                                        onCheckedChange={(checked) =>
                                            setResumeData({
                                                ...resumeData,
                                                languages: {
                                                    ...(resumeData.languages || {
                                                        showEmoji: false,
                                                        emoji: "✔️",
                                                        entries: [],
                                                    }),
                                                    showEmoji: checked,
                                                },
                                            })
                                        }
                                    />
                                    <label
                                        htmlFor="show-emojis-languages"
                                        className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                                    >
                                        이모지 표시
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBackupData(resumeData);
                                    const newLang: ResumeLanguage = {
                                        language: "",
                                        fluency: "",
                                    };
                                    setResumeData({
                                        ...resumeData,
                                        languages: {
                                            ...(resumeData.languages || {
                                                showEmoji: false,
                                                emoji: "✔️",
                                                entries: [],
                                            }),
                                            entries: [
                                                newLang,
                                                ...(resumeData.languages
                                                    ?.entries || []),
                                            ],
                                        },
                                    });
                                    setEditingLanguage(0);
                                }}
                                className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                            >
                                + 언어 추가
                            </button>
                        </div>
                        <div className="space-y-4">
                            {resumeData.languages?.entries.map((lang, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-(--color-border) bg-transparent p-4"
                                >
                                    {editingLanguage === idx ? (
                                        <div className="space-y-4">
                                            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                                                <InputField
                                                    label="언어"
                                                    value={lang.language || ""}
                                                    onChange={(v) => {
                                                        const l = [
                                                            ...resumeData
                                                                .languages!
                                                                .entries,
                                                        ];
                                                        l[idx].language = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            languages: {
                                                                ...(resumeData.languages || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: l,
                                                            },
                                                        });
                                                    }}
                                                    placeholder="예: Korean, English"
                                                />
                                                <InputField
                                                    label="능숙도 (Fluency)"
                                                    value={lang.fluency || ""}
                                                    onChange={(v) => {
                                                        const l = [
                                                            ...resumeData
                                                                .languages!
                                                                .entries,
                                                        ];
                                                        l[idx].fluency = v;
                                                        setResumeData({
                                                            ...resumeData,
                                                            languages: {
                                                                ...(resumeData.languages || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: l,
                                                            },
                                                        });
                                                    }}
                                                    placeholder="예: Native, Fluent, Intermediate"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        if (backupData)
                                                            setResumeData(
                                                                backupData
                                                            );
                                                        setEditingLanguage(
                                                            null
                                                        );
                                                    }}
                                                    className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBackupData(null);
                                                        setEditingLanguage(
                                                            null
                                                        );
                                                    }}
                                                    className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                >
                                                    완료
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-(--color-foreground)">
                                                    {lang.language}
                                                </h4>
                                                <p className="text-sm text-(--color-muted)">
                                                    {lang.fluency}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setBackupData(
                                                            resumeData
                                                        );
                                                        setEditingLanguage(idx);
                                                    }}
                                                    className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const ok =
                                                            await confirm({
                                                                title: "언어 삭제",
                                                                description:
                                                                    "삭제하시겠습니까?",
                                                                confirmText:
                                                                    "삭제",
                                                                cancelText:
                                                                    "취소",
                                                                variant:
                                                                    "destructive",
                                                            });
                                                        if (!ok) return;
                                                        const l = [
                                                            ...resumeData
                                                                .languages!
                                                                .entries,
                                                        ];
                                                        l.splice(idx, 1);
                                                        setResumeData({
                                                            ...resumeData,
                                                            languages: {
                                                                ...(resumeData.languages || {
                                                                    showEmoji: false,
                                                                    emoji: "✔️",
                                                                    entries: [],
                                                                }),
                                                                entries: l,
                                                            },
                                                        });
                                                    }}
                                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Layout Editor mode */}
                {layoutEditMode ? (
                    <div className="min-h-0 flex-1" style={{ order: 9999 }}>
                        <ResumeLayoutEditor
                            resume={resumeData}
                            layout={resumeSectionLayout}
                            onChange={setResumeSectionLayout}
                            theme={resumeLayout}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
