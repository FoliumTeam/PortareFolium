"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SkillBadge } from "@/components/resume/SkillBadge";
import {
    JobFieldSelector,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import type {
    ResumeSkillKeyword,
    ResumeWork,
    ResumeProject,
} from "@/types/resume";

const DRAFT_KEY = "resume_skill_draft";

interface DraftData {
    kwData: ResumeSkillKeyword;
    categoryName: string;
    originalCategoryIdx: number | null;
    originalKwIdx: number | null;
    timestamp: number;
}

interface SkillEditorModalProps {
    open: boolean;
    onClose: () => void;
    initialSkill?: ResumeSkillKeyword;
    initialCategoryName?: string;
    originalCategoryIdx: number | null;
    originalKwIdx: number | null;
    categories: string[];
    works: ResumeWork[];
    projects: ResumeProject[];
    jobFields: JobFieldItem[];
    onSave: (skill: ResumeSkillKeyword, categoryName: string) => void;
}

// work dropdown label 생성
function workLabel(w: ResumeWork): string {
    if (!w.name) return "";
    return w.position ? `${w.position} @ ${w.name}` : w.name;
}

interface FormState {
    name: string;
    categoryName: string;
    level: string;
    jobField: string[];
    workRefs: string[];
    projectRefs: string[];
    iconSlug: string;
    iconColor: string;
}

function buildInitialForm(
    skill?: ResumeSkillKeyword,
    catName?: string
): FormState {
    const jf = skill?.jobField;
    const jobField = jf == null ? [] : Array.isArray(jf) ? jf : [jf];
    // 하위 호환: workRef(단일) 또는 workRefs(배열) 읽기
    const workRefs = skill?.workRefs ?? (skill?.workRef ? [skill.workRef] : []);
    const projectRefs =
        skill?.projectRefs ?? (skill?.projectRef ? [skill.projectRef] : []);
    return {
        name: skill?.name ?? "",
        categoryName: catName ?? "",
        level: skill?.level ?? "",
        jobField,
        workRefs,
        projectRefs,
        iconSlug: skill?.iconSlug ?? "",
        iconColor: skill?.iconColor ?? "",
    };
}

function formsEqual(a: FormState, b: FormState): boolean {
    return (
        a.name === b.name &&
        a.categoryName === b.categoryName &&
        a.level === b.level &&
        JSON.stringify(a.jobField) === JSON.stringify(b.jobField) &&
        JSON.stringify(a.workRefs) === JSON.stringify(b.workRefs) &&
        JSON.stringify(a.projectRefs) === JSON.stringify(b.projectRefs) &&
        a.iconSlug === b.iconSlug &&
        a.iconColor === b.iconColor
    );
}

export default function SkillEditorModal({
    open,
    onClose,
    initialSkill,
    initialCategoryName,
    originalCategoryIdx,
    originalKwIdx,
    categories,
    works,
    projects,
    jobFields,
    onSave,
}: SkillEditorModalProps) {
    const [form, setForm] = useState<FormState>(() =>
        buildInitialForm(initialSkill, initialCategoryName)
    );
    const [initialRef, setInitialRef] = useState<FormState>(() =>
        buildInitialForm(initialSkill, initialCategoryName)
    );
    const [showConfirm, setShowConfirm] = useState(false);
    const [draftBanner, setDraftBanner] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 언마운트 시 debounce 타이머 정리
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // draft 확인 및 form 초기화
    useEffect(() => {
        if (!open) return;
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            try {
                const draft: DraftData = JSON.parse(raw);
                const isMatch =
                    (originalCategoryIdx === null &&
                        originalKwIdx === null &&
                        draft.originalCategoryIdx === null &&
                        draft.originalKwIdx === null) ||
                    (draft.originalCategoryIdx === originalCategoryIdx &&
                        draft.originalKwIdx === originalKwIdx);
                if (isMatch) {
                    setDraftBanner(true);
                    return;
                }
            } catch {
                // invalid draft
            }
        }
        setDraftBanner(false);
        const f = buildInitialForm(initialSkill, initialCategoryName);
        setForm(f);
        setInitialRef(f);
        setShowConfirm(false);
    }, [
        open,
        originalCategoryIdx,
        originalKwIdx,
        initialSkill,
        initialCategoryName,
    ]);

    // draft 이어서 작성
    const loadDraft = useCallback(() => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        try {
            const draft: DraftData = JSON.parse(raw);
            const f = buildInitialForm(draft.kwData, draft.categoryName);
            setForm(f);
            setInitialRef(buildInitialForm(initialSkill, initialCategoryName));
        } catch {
            // fallback
        }
        setDraftBanner(false);
    }, [initialSkill, initialCategoryName]);

    // draft 삭제
    const deleteDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch {
            /* ignore */
        }
        setDraftBanner(false);
        const f = buildInitialForm(initialSkill, initialCategoryName);
        setForm(f);
        setInitialRef(f);
    }, [initialSkill, initialCategoryName]);

    const isDirty = !formsEqual(form, initialRef);

    // debounce draft 저장
    const saveDraftToStorage = useCallback(
        (f: FormState) => {
            const draft: DraftData = {
                kwData: {
                    name: f.name,
                    level: f.level || undefined,
                    jobField: f.jobField.length > 0 ? f.jobField : undefined,
                    workRefs: f.workRefs.length > 0 ? f.workRefs : undefined,
                    projectRefs:
                        f.projectRefs.length > 0 ? f.projectRefs : undefined,
                    iconSlug: f.iconSlug || undefined,
                    iconColor: f.iconColor || undefined,
                },
                categoryName: f.categoryName,
                originalCategoryIdx,
                originalKwIdx,
                timestamp: Date.now(),
            };
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            } catch {
                /* quota exceeded or private mode */
            }
        },
        [originalCategoryIdx, originalKwIdx]
    );

    // form 변경 시 debounce draft 저장
    const updateForm = useCallback(
        (updater: Partial<FormState> | ((prev: FormState) => FormState)) => {
            setForm((prev) => {
                const next =
                    typeof updater === "function"
                        ? updater(prev)
                        : { ...prev, ...updater };
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(
                    () => saveDraftToStorage(next),
                    500
                );
                return next;
            });
        },
        [saveDraftToStorage]
    );

    // 닫기 시도
    const attemptClose = useCallback(() => {
        if (isDirty) {
            setShowConfirm(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);

    // 나가기 (draft 즉시 저장 후 닫기)
    const exitWithDraft = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveDraftToStorage(form);
        setShowConfirm(false);
        onClose();
    }, [form, saveDraftToStorage, onClose]);

    // 저장
    const handleSave = useCallback(() => {
        const skill: ResumeSkillKeyword = {
            name: form.name,
            level: form.level || undefined,
            jobField: form.jobField.length > 0 ? form.jobField : undefined,
            workRefs: form.workRefs.length > 0 ? form.workRefs : undefined,
            projectRefs:
                form.projectRefs.length > 0 ? form.projectRefs : undefined,
            iconSlug: form.iconSlug || undefined,
            iconColor: form.iconColor || undefined,
        };
        try {
            localStorage.removeItem(DRAFT_KEY);
        } catch {
            /* ignore */
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onSave(skill, form.categoryName);
    }, [form, onSave]);

    // Escape 키
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                attemptClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, attemptClose]);

    if (!open) return null;

    const workOptions = works
        .map((w) => ({ label: workLabel(w), value: workLabel(w) }))
        .filter((o) => o.label);
    const projectOptions = projects
        .map((p) => ({ label: p.name ?? "", value: p.name ?? "" }))
        .filter((o) => o.label);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
                if (e.target === e.currentTarget) attemptClose();
            }}
        >
            <div className="tablet:mx-4 tablet:max-w-xl relative mx-2 w-full rounded-xl border border-(--color-border) bg-(--color-surface) p-6 shadow-2xl">
                {/* 닫기 버튼 */}
                <button
                    onClick={attemptClose}
                    className="absolute top-4 right-4 text-(--color-muted) hover:text-(--color-foreground)"
                >
                    ✕
                </button>

                <h3 className="mb-4 text-lg font-bold text-(--color-foreground)">
                    {originalCategoryIdx === null ? "스킬 추가" : "스킬 수정"}
                </h3>

                {/* draft banner */}
                {draftBanner && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2 dark:bg-yellow-900/20">
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            임시 저장된 내용이 있습니다
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={loadDraft}
                                className="rounded-lg bg-yellow-500 px-3 py-1 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                            >
                                이어서 작성
                            </button>
                            <button
                                onClick={deleteDraft}
                                className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                )}

                {/* 확인 overlay */}
                {showConfirm && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/40">
                        <div className="mx-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-6 shadow-xl">
                            <p className="mb-4 text-sm text-(--color-foreground)">
                                변경 사항이 임시 저장됩니다. 나가시겠습니까?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                >
                                    계속 작성
                                </button>
                                <button
                                    onClick={exitWithDraft}
                                    className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    나가기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* 이름 */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-(--color-muted)">
                            이름 *
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) =>
                                updateForm({ name: e.target.value })
                            }
                            placeholder="스킬 이름"
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2.5 text-base font-semibold text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                        />
                    </div>

                    {/* 카테고리 */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-(--color-muted)">
                            카테고리
                        </label>
                        <input
                            list="skill-categories"
                            value={form.categoryName}
                            onChange={(e) =>
                                updateForm({ categoryName: e.target.value })
                            }
                            placeholder="카테고리 입력 또는 선택"
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                        />
                        <datalist id="skill-categories">
                            {categories.map((c) => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>

                    {/* 숙련도 */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-medium text-(--color-muted)">
                            숙련도
                        </label>
                        <input
                            value={form.level}
                            onChange={(e) =>
                                updateForm({ level: e.target.value })
                            }
                            placeholder="예: Intermediate, Advanced"
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                        />
                    </div>

                    {/* 직무 분야 */}
                    <JobFieldSelector
                        value={form.jobField}
                        fields={jobFields}
                        onChange={(v) => updateForm({ jobField: v })}
                    />

                    {/* 연결 직장 */}
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-(--color-muted)">
                            연결 직장
                        </label>
                        {workOptions.length > 0 ? (
                            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-(--color-border) p-2">
                                {workOptions.map((o) => (
                                    <label
                                        key={o.value}
                                        className="flex cursor-pointer items-center gap-2 select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.workRefs.includes(
                                                o.value
                                            )}
                                            onChange={(e) => {
                                                updateForm((prev) => ({
                                                    ...prev,
                                                    workRefs: e.target.checked
                                                        ? [
                                                              ...prev.workRefs,
                                                              o.value,
                                                          ]
                                                        : prev.workRefs.filter(
                                                              (r) =>
                                                                  r !== o.value
                                                          ),
                                                }));
                                            }}
                                            className="h-4 w-4 cursor-pointer accent-(--color-accent)"
                                        />
                                        <span className="text-sm text-(--color-foreground)">
                                            {o.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-(--color-muted)">
                                등록된 직장이 없습니다
                            </p>
                        )}
                    </div>

                    {/* 연결 프로젝트 */}
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-(--color-muted)">
                            연결 프로젝트
                        </label>
                        {projectOptions.length > 0 ? (
                            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-(--color-border) p-2">
                                {projectOptions.map((o) => (
                                    <label
                                        key={o.value}
                                        className="flex cursor-pointer items-center gap-2 select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.projectRefs.includes(
                                                o.value
                                            )}
                                            onChange={(e) => {
                                                updateForm((prev) => ({
                                                    ...prev,
                                                    projectRefs: e.target
                                                        .checked
                                                        ? [
                                                              ...prev.projectRefs,
                                                              o.value,
                                                          ]
                                                        : prev.projectRefs.filter(
                                                              (r) =>
                                                                  r !== o.value
                                                          ),
                                                }));
                                            }}
                                            className="h-4 w-4 cursor-pointer accent-(--color-accent)"
                                        />
                                        <span className="text-sm text-(--color-foreground)">
                                            {o.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-(--color-muted)">
                                등록된 프로젝트가 없습니다
                            </p>
                        )}
                    </div>

                    {/* 아이콘 */}
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-(--color-muted)">
                            아이콘
                        </label>
                        <div className="flex items-end gap-3">
                            <div className="flex flex-1 gap-2">
                                <div className="flex flex-1 flex-col space-y-1">
                                    <label className="text-xs text-(--color-muted)">
                                        Slug
                                    </label>
                                    <input
                                        value={form.iconSlug}
                                        onChange={(e) =>
                                            updateForm({
                                                iconSlug: e.target.value,
                                            })
                                        }
                                        placeholder="예: react"
                                        className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col space-y-1">
                                    <label className="text-xs text-(--color-muted)">
                                        색상
                                    </label>
                                    <input
                                        value={form.iconColor}
                                        onChange={(e) =>
                                            updateForm({
                                                iconColor: e.target.value,
                                            })
                                        }
                                        placeholder="#hex"
                                        className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="shrink-0">
                                <SkillBadge
                                    name={form.name || "미리보기"}
                                    overrideSlug={form.iconSlug || undefined}
                                    overrideColor={form.iconColor || undefined}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 저장/취소 버튼 */}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={attemptClose}
                        className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                    >
                        취소
                    </button>
                    <button
                        disabled={!form.name.trim()}
                        onClick={handleSave}
                        className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 disabled:opacity-50 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}
