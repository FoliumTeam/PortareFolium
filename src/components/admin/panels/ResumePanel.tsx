"use client";

import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { uploadImageToSupabase } from "@/lib/image-upload";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import type {
    Resume,
    ResumeWork,
    ResumeProject,
    ResumeProjectSection,
    ResumeEducation,
    ResumeAward,
    ResumeSkill,
    ResumeLanguage,
    ResumeBasics,
} from "@/types/resume";

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

type ResumeLayout = "classic" | "modern" | "minimal";

// 타임스탬프 포맷 (시:분:초)
function fmtTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// 직무 분야 필터 매칭
function matchesJobField(
    jobField: string | string[] | undefined,
    filter: string
): boolean {
    if (!jobField) return false;
    return Array.isArray(jobField)
        ? jobField.includes(filter)
        : jobField === filter;
}

// 배열 항목 순서 변경 (불변)
function reorderArray<T>(arr: T[], from: number, to: number): T[] {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
}

export default function ResumePanel() {
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
    const [editingSkill, setEditingSkill] = useState<number | null>(null);
    const [editingSkillKeywords, setEditingSkillKeywords] =
        useState<string>("");
    const [editingLanguage, setEditingLanguage] = useState<number | null>(null);
    const [backupData, setBackupData] = useState<any>(null);
    // 드래그 소스 추적 (type: 'work' | 'project', idx: 원래 인덱스)
    const dragSrcRef = useRef<{ type: string; idx: number } | null>(null);

    // Fallback JSON input state
    const [jsonInput, setJsonInput] = useState("");

    useEffect(() => {
        if (!browserClient) return;
        Promise.all([
            browserClient
                .from("resume_data")
                .select("id, data")
                .eq("lang", "ko")
                .limit(1)
                .single(),
            browserClient
                .from("site_config")
                .select("value")
                .eq("key", "resume_layout")
                .single(),
            browserClient
                .from("site_config")
                .select("value")
                .eq("key", "job_fields")
                .single(),
            browserClient
                .from("site_config")
                .select("value")
                .eq("key", "job_field")
                .single(),
        ]).then(
            ([
                { data: row, error },
                { data: layoutRow },
                { data: jfRow },
                { data: activeJfRow },
            ]) => {
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
                    work: [],
                    projects: [],
                    education: [],
                    skills: [],
                    languages: [],
                };
                if (!error && row) {
                    setRowId(row.id);
                    const loaded = {
                        ...defaultResume,
                        ...(row.data as Resume),
                    };
                    savedDataRef.current = JSON.stringify(loaded);
                    setResumeData(loaded);
                    setJsonInput(JSON.stringify(loaded, null, 2));
                } else {
                    setResumeData(defaultResume);
                }
                if (layoutRow?.value) {
                    setResumeLayout(layoutRow.value as ResumeLayout);
                }
                if (Array.isArray(jfRow?.value)) {
                    setJobFields(jfRow.value as JobFieldItem[]);
                }
                if (
                    activeJfRow?.value &&
                    typeof activeJfRow.value === "string"
                ) {
                    setActiveJobField(activeJfRow.value);
                }
            }
        );
    }, []);

    // dirty 상태 감지
    useEffect(() => {
        if (!resumeData || !savedDataRef.current) return;
        setIsDirty(JSON.stringify(resumeData) !== savedDataRef.current);
    }, [resumeData]);

    // 자동 저장 (기존 row가 있을 때만)
    const autoSave = async () => {
        if (!browserClient || !resumeData || !rowId) return;
        try {
            const { error } = await browserClient
                .from("resume_data")
                .update({ data: resumeData as any })
                .eq("id", rowId);
            if (!error) {
                savedDataRef.current = JSON.stringify(resumeData);
                setIsDirty(false);
                setSavedAt(new Date());
            }
        } catch {}
    };

    useAutoSave(isDirty, rowId !== null, autoSave);

    const handleSave = async () => {
        if (!browserClient || !resumeData) return;
        setSaving(true);
        setStatus(null);

        try {
            let err;
            if (rowId) {
                const res = await browserClient
                    .from("resume_data")
                    .update({ data: resumeData as any })
                    .eq("id", rowId);
                err = res.error;
            } else {
                const res = await browserClient
                    .from("resume_data")
                    .insert({ lang: "ko", data: resumeData as any })
                    .select("id")
                    .single();
                err = res.error;
                if (res.data) setRowId(res.data.id);
            }

            if (err) throw err;

            // resume_layout site_config 저장
            const { error: layoutErr } = await browserClient
                .from("site_config")
                .upsert({ key: "resume_layout", value: resumeLayout });
            if (layoutErr) throw layoutErr;

            savedDataRef.current = JSON.stringify(resumeData);
            setIsDirty(false);
            setSavedAt(new Date());
            setStatus({
                type: "success",
                msg: "저장됐습니다. 이력서 페이지에 즉시 반영됩니다.",
            });
        } catch (e: any) {
            setStatus({ type: "error", msg: `저장 실패: ${e.message}` });
        } finally {
            setSaving(false);
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
            const url = await uploadImageToSupabase(file, "resume");
            setResumeData({
                ...resumeData,
                basics: { ...resumeData.basics, image: url },
            });
            setStatus({ type: "success", msg: "이미지가 업로드되었습니다." });
        } catch (err: any) {
            setStatus({
                type: "error",
                msg: `이미지 업로드 실패: ${err.message}`,
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
        <div className="flex h-full max-w-4xl flex-col space-y-8 pb-20">
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
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? "저장 중..." : "변경사항 저장"}
                    </button>
                </div>
            </div>

            {status && (
                <p
                    className={`rounded-lg px-3 py-2 text-base ${status.type === "error" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30"}`}
                >
                    {status.msg}
                </p>
            )}

            {/* 레이아웃 선택 */}
            <section className="space-y-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    레이아웃
                </h3>
                <div className="flex gap-3">
                    {(["classic", "modern", "minimal"] as ResumeLayout[]).map(
                        (l) => (
                            <button
                                key={l}
                                onClick={() => setResumeLayout(l)}
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

            {/* 섹션 제목 커스텀 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    섹션 제목 커스텀
                </h3>
                <p className="text-sm text-(--color-muted)">
                    섹션 제목 앞에 이모지를 추가하거나 원하는 텍스트로 변경할 수
                    있습니다. 비워두면 기본값을 사용합니다.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                        { key: "work", defaultLabel: "경력" },
                        { key: "projects", defaultLabel: "프로젝트" },
                        { key: "education", defaultLabel: "학력" },
                        { key: "skills", defaultLabel: "기술" },
                        { key: "languages", defaultLabel: "언어" },
                        { key: "awards", defaultLabel: "수상" },
                        { key: "volunteer", defaultLabel: "봉사 활동" },
                        { key: "certificates", defaultLabel: "자격증" },
                    ].map(({ key, defaultLabel }) => (
                        <InputField
                            key={key}
                            label={defaultLabel}
                            value={resumeData.sectionLabels?.[key] || ""}
                            onChange={(v) => {
                                setResumeData({
                                    ...resumeData,
                                    sectionLabels: {
                                        ...resumeData.sectionLabels,
                                        [key]: v,
                                    },
                                });
                            }}
                            placeholder={`예: 💼 ${defaultLabel}`}
                        />
                    ))}
                </div>
            </section>

            {/* 기본 정보 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    기본 정보
                </h3>
                <div className="mb-4 flex items-start gap-6">
                    {resumeData.basics?.image && (
                        <img
                            src={resumeData.basics.image}
                            alt="Profile"
                            className="h-24 w-24 flex-shrink-0 rounded-full border border-(--color-border) object-cover"
                        />
                    )}
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-(--color-muted)">
                            프로필 사진 (자동 업로드)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="block w-full cursor-pointer text-sm text-(--color-foreground) file:mr-4 file:rounded-lg file:border-0 file:bg-(--color-surface-subtle) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--color-foreground) hover:file:bg-(--color-border) disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            {/* 경력 (Work Experience) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        경력 (Work)
                    </h3>
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
                                work: [newWork, ...(resumeData.work || [])],
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
                                        filterJobField === jf.id ? null : jf.id
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
                    {resumeData.work?.map((work, idx) => {
                        if (
                            filterJobField &&
                            !matchesJobField(work.jobField, filterJobField)
                        )
                            return null;
                        return (
                            <div
                                key={idx}
                                draggable={editingWork !== idx}
                                onDragStart={() => {
                                    dragSrcRef.current = { type: "work", idx };
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (
                                        dragSrcRef.current?.type !== "work" ||
                                        dragSrcRef.current.idx === idx
                                    )
                                        return;
                                    setResumeData({
                                        ...resumeData,
                                        work: reorderArray(
                                            resumeData.work!,
                                            dragSrcRef.current.idx,
                                            idx
                                        ),
                                    });
                                    dragSrcRef.current = null;
                                }}
                                className="rounded-lg border border-(--color-border) bg-transparent p-4"
                            >
                                {editingWork === idx ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <InputField
                                                label="회사명"
                                                value={work.name || ""}
                                                onChange={(v) => {
                                                    const w = [
                                                        ...resumeData.work!,
                                                    ];
                                                    w[idx].name = v;
                                                    setResumeData({
                                                        ...resumeData,
                                                        work: w,
                                                    });
                                                }}
                                            />
                                            <InputField
                                                label="직책"
                                                value={work.position || ""}
                                                onChange={(v) => {
                                                    const w = [
                                                        ...resumeData.work!,
                                                    ];
                                                    w[idx].position = v;
                                                    setResumeData({
                                                        ...resumeData,
                                                        work: w,
                                                    });
                                                }}
                                            />
                                            <div className="flex flex-col space-y-1">
                                                <label className="text-sm font-medium text-(--color-muted)">
                                                    시작일
                                                </label>
                                                <input
                                                    type="date"
                                                    value={work.startDate || ""}
                                                    onChange={(e) => {
                                                        const w = [
                                                            ...resumeData.work!,
                                                        ];
                                                        w[idx] = {
                                                            ...w[idx],
                                                            startDate:
                                                                e.target.value,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: w,
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col space-y-1">
                                                <label className="text-sm font-medium text-(--color-muted)">
                                                    종료일 (비워두면 '현재')
                                                </label>
                                                <input
                                                    type="date"
                                                    value={work.endDate || ""}
                                                    onChange={(e) => {
                                                        const w = [
                                                            ...resumeData.work!,
                                                        ];
                                                        w[idx] = {
                                                            ...w[idx],
                                                            endDate:
                                                                e.target.value,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: w,
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                            <input
                                                type="checkbox"
                                                checked={work.hideDays || false}
                                                onChange={(e) => {
                                                    const w = [
                                                        ...resumeData.work!,
                                                    ];
                                                    w[idx] = {
                                                        ...w[idx],
                                                        hideDays:
                                                            e.target.checked,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        work: w,
                                                    });
                                                }}
                                                className="accent-(--color-accent)"
                                            />
                                            날짜에서 일(Day) 숨기기
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                            <input
                                                type="checkbox"
                                                checked={work.markdown || false}
                                                onChange={(e) => {
                                                    const w = [
                                                        ...resumeData.work!,
                                                    ];
                                                    w[idx] = {
                                                        ...w[idx],
                                                        markdown:
                                                            e.target.checked,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        work: w,
                                                    });
                                                }}
                                                className="accent-(--color-accent)"
                                            />
                                            요약/성과를 마크다운으로 렌더링
                                        </label>
                                        <TextAreaField
                                            label="요약 (Summary)"
                                            value={work.summary || ""}
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
                                                w[idx].summary = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
                                                });
                                            }}
                                        />
                                        <TextAreaField
                                            label="주요 성과 (Highlights, 엔터로 구분)"
                                            value={
                                                work.highlights?.join("\n") ||
                                                ""
                                            }
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
                                                w[idx].highlights =
                                                    v.split("\n");
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
                                                });
                                            }}
                                            rows={4}
                                        />
                                        <JobFieldSelector
                                            value={work.jobField}
                                            fields={jobFields}
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
                                                w[idx].jobField = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
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
                                                    setEditingWork(null);
                                                }}
                                                className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBackupData(null);
                                                    setEditingWork(null);
                                                }}
                                                className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
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
                                                {work.position} @ {work.name}
                                            </h4>
                                            <p className="text-sm text-(--color-muted)">
                                                {work.startDate} ~{" "}
                                                {work.endDate || "현재"}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <JobFieldBadges
                                                    value={work.jobField}
                                                    fields={jobFields}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setBackupData(resumeData);
                                                    setEditingWork(idx);
                                                }}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 항목을 복사해 맨 앞에 추가 후 편집 모드 진입
                                                    const w = [
                                                        ...resumeData.work!,
                                                    ];
                                                    const copy = {
                                                        ...w[idx],
                                                        jobField:
                                                            activeJobField ||
                                                            undefined,
                                                    };
                                                    w.unshift(copy);
                                                    setBackupData(resumeData);
                                                    setResumeData({
                                                        ...resumeData,
                                                        work: w,
                                                    });
                                                    setEditingWork(0);
                                                }}
                                                className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-muted) transition-opacity hover:opacity-90"
                                            >
                                                복사
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            "삭제하시겠습니까?"
                                                        )
                                                    ) {
                                                        const w = [
                                                            ...resumeData.work!,
                                                        ];
                                                        w.splice(idx, 1);
                                                        setResumeData({
                                                            ...resumeData,
                                                            work: w,
                                                        });
                                                    }
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

            {/* 프로젝트 (Projects) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        프로젝트 (Projects)
                    </h3>
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
                                projects: [
                                    newProj,
                                    ...(resumeData.projects || []),
                                ],
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
                                        filterJobField === jf.id ? null : jf.id
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
                    {resumeData.projects?.map((proj, idx) => {
                        if (
                            filterJobField &&
                            !matchesJobField(proj.jobField, filterJobField)
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
                                        projects: reorderArray(
                                            resumeData.projects!,
                                            dragSrcRef.current.idx,
                                            idx
                                        ),
                                    });
                                    dragSrcRef.current = null;
                                }}
                                className="rounded-lg border border-(--color-border) bg-transparent p-4"
                            >
                                {editingProject === idx ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <InputField
                                                label="프로젝트명"
                                                value={proj.name || ""}
                                                onChange={(v) => {
                                                    const p = [
                                                        ...resumeData.projects!,
                                                    ];
                                                    p[idx].name = v;
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
                                                    });
                                                }}
                                            />
                                            <InputField
                                                label="역할 (Roles, 쉼표 구분)"
                                                value={
                                                    proj.roles?.join(", ") || ""
                                                }
                                                onChange={(v) => {
                                                    const p = [
                                                        ...resumeData.projects!,
                                                    ];
                                                    p[idx].roles = v
                                                        .split(",")
                                                        .map((s) => s.trim());
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
                                                    });
                                                }}
                                            />
                                            <div className="flex flex-col space-y-1">
                                                <label className="text-sm font-medium text-(--color-muted)">
                                                    시작일
                                                </label>
                                                <input
                                                    type="date"
                                                    value={proj.startDate || ""}
                                                    onChange={(e) => {
                                                        const p = [
                                                            ...resumeData.projects!,
                                                        ];
                                                        p[idx] = {
                                                            ...p[idx],
                                                            startDate:
                                                                e.target.value,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: p,
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
                                                    value={proj.endDate || ""}
                                                    onChange={(e) => {
                                                        const p = [
                                                            ...resumeData.projects!,
                                                        ];
                                                        p[idx] = {
                                                            ...p[idx],
                                                            endDate:
                                                                e.target.value,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: p,
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
                                                        ...resumeData.projects!,
                                                    ];
                                                    p[idx].url = v;
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
                                                    });
                                                }}
                                                placeholder="https://..."
                                            />
                                            <InputField
                                                label="URL 표시 텍스트 (기본: 라이브 URL)"
                                                value={proj.urlLabel || ""}
                                                onChange={(v) => {
                                                    const p = [
                                                        ...resumeData.projects!,
                                                    ];
                                                    p[idx].urlLabel = v;
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
                                                    });
                                                }}
                                                placeholder="예: 게임 시연 영상, 발표 자료"
                                            />
                                        </div>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--color-muted)">
                                            <input
                                                type="checkbox"
                                                checked={proj.hideDays || false}
                                                onChange={(e) => {
                                                    const p = [
                                                        ...resumeData.projects!,
                                                    ];
                                                    p[idx] = {
                                                        ...p[idx],
                                                        hideDays:
                                                            e.target.checked,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
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
                                                            ...resumeData.projects!,
                                                        ];
                                                        const sections = [
                                                            ...(p[idx]
                                                                .sections ||
                                                                []),
                                                            {
                                                                title: "",
                                                                content: "",
                                                            },
                                                        ];
                                                        p[idx] = {
                                                            ...p[idx],
                                                            sections,
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: p,
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
                                                                    const p = [
                                                                        ...resumeData.projects!,
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
                                                                    p[idx] = {
                                                                        ...p[
                                                                            idx
                                                                        ],
                                                                        sections,
                                                                    };
                                                                    setResumeData(
                                                                        {
                                                                            ...resumeData,
                                                                            projects:
                                                                                p,
                                                                        }
                                                                    );
                                                                }}
                                                                className="flex-1 rounded-lg border border-(--color-border) bg-transparent px-3 py-1.5 text-sm font-medium text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const p = [
                                                                        ...resumeData.projects!,
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
                                                                    p[idx] = {
                                                                        ...p[
                                                                            idx
                                                                        ],
                                                                        sections,
                                                                    };
                                                                    setResumeData(
                                                                        {
                                                                            ...resumeData,
                                                                            projects:
                                                                                p,
                                                                        }
                                                                    );
                                                                }}
                                                                className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90"
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={sec.content}
                                                            placeholder="내용"
                                                            rows={3}
                                                            onChange={(e) => {
                                                                const p = [
                                                                    ...resumeData.projects!,
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
                                                                p[idx] = {
                                                                    ...p[idx],
                                                                    sections,
                                                                };
                                                                setResumeData({
                                                                    ...resumeData,
                                                                    projects: p,
                                                                });
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
                                                                    const p = [
                                                                        ...resumeData.projects!,
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
                                                                    p[idx] = {
                                                                        ...p[
                                                                            idx
                                                                        ],
                                                                        sections,
                                                                    };
                                                                    setResumeData(
                                                                        {
                                                                            ...resumeData,
                                                                            projects:
                                                                                p,
                                                                        }
                                                                    );
                                                                }}
                                                                className="accent-(--color-accent)"
                                                            />
                                                            마크다운으로 렌더링
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
                                                    ...resumeData.projects!,
                                                ];
                                                p[idx].jobField = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    projects: p,
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
                                                    setEditingProject(null);
                                                }}
                                                className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBackupData(null);
                                                    setEditingProject(null);
                                                }}
                                                className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
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
                                                proj.description.length > 100
                                                    ? "..."
                                                    : ""}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <JobFieldBadges
                                                    value={proj.jobField}
                                                    fields={jobFields}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setBackupData(resumeData);
                                                    // sections가 없으면 기존 description/highlights로 초기화
                                                    if (
                                                        !resumeData.projects![
                                                            idx
                                                        ].sections
                                                    ) {
                                                        const p = [
                                                            ...resumeData.projects!,
                                                        ];
                                                        p[idx] = {
                                                            ...p[idx],
                                                            sections: [
                                                                {
                                                                    title: "설명",
                                                                    content:
                                                                        p[idx]
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
                                                                        ) || "",
                                                                },
                                                            ],
                                                        };
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: p,
                                                        });
                                                    }
                                                    setEditingProject(idx);
                                                }}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 항목을 복사해 맨 앞에 추가 후 편집 모드 진입
                                                    const p = [
                                                        ...resumeData.projects!,
                                                    ];
                                                    const copy = {
                                                        ...p[idx],
                                                        jobField:
                                                            activeJobField ||
                                                            undefined,
                                                    };
                                                    p.unshift(copy);
                                                    setBackupData(resumeData);
                                                    setResumeData({
                                                        ...resumeData,
                                                        projects: p,
                                                    });
                                                    setEditingProject(0);
                                                }}
                                                className="rounded-lg border border-(--color-border) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-muted) transition-opacity hover:opacity-90"
                                            >
                                                복사
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            "삭제하시겠습니까?"
                                                        )
                                                    ) {
                                                        const p = [
                                                            ...resumeData.projects!,
                                                        ];
                                                        p.splice(idx, 1);
                                                        setResumeData({
                                                            ...resumeData,
                                                            projects: p,
                                                        });
                                                    }
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

            {/* 학력 (Education) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        학력 (Education)
                    </h3>
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
                                education: [
                                    newEd,
                                    ...(resumeData.education || []),
                                ],
                            });
                            setEditingEducation(0);
                        }}
                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        + 학력 추가
                    </button>
                </div>

                <div className="space-y-4">
                    {resumeData.education?.map((ed, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-transparent p-4"
                        >
                            {editingEducation === idx ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            label="학교/기관명"
                                            value={ed.institution || ""}
                                            onChange={(v) => {
                                                const e = [
                                                    ...resumeData.education!,
                                                ];
                                                e[idx].institution = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    education: e,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="전공/분야 (Area)"
                                            value={ed.area || ""}
                                            onChange={(v) => {
                                                const e = [
                                                    ...resumeData.education!,
                                                ];
                                                e[idx].area = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    education: e,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="학위 (Study Type)"
                                            value={ed.studyType || ""}
                                            onChange={(v) => {
                                                const e = [
                                                    ...resumeData.education!,
                                                ];
                                                e[idx].studyType = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    education: e,
                                                });
                                            }}
                                        />
                                        <div className="flex flex-col space-y-1">
                                            <label className="text-sm font-medium text-(--color-muted)">
                                                시작일
                                            </label>
                                            <input
                                                type="date"
                                                value={ed.startDate || ""}
                                                onChange={(ev) => {
                                                    const e = [
                                                        ...resumeData.education!,
                                                    ];
                                                    e[idx] = {
                                                        ...e[idx],
                                                        startDate:
                                                            ev.target.value,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        education: e,
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
                                                        ...resumeData.education!,
                                                    ];
                                                    e[idx] = {
                                                        ...e[idx],
                                                        endDate:
                                                            ev.target.value,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        education: e,
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
                                                    const newMax = parseFloat(
                                                        ev.target.value
                                                    ) as 4 | 4.5;
                                                    const e = [
                                                        ...resumeData.education!,
                                                    ];
                                                    // 기존 gpa 비례 환산
                                                    if (e[idx].gpa != null) {
                                                        const oldMax =
                                                            e[idx].gpaMax ??
                                                            4.5;
                                                        e[idx].gpa =
                                                            Math.round(
                                                                (e[idx].gpa! /
                                                                    oldMax) *
                                                                    newMax *
                                                                    100
                                                            ) / 100;
                                                    }
                                                    e[idx].gpaMax = newMax;
                                                    setResumeData({
                                                        ...resumeData,
                                                        education: e,
                                                    });
                                                }}
                                                className="rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                            >
                                                <option value={4.5}>4.5</option>
                                                <option value={4}>4.0</option>
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
                                                    const raw = parseFloat(
                                                        ev.target.value
                                                    );
                                                    const max =
                                                        ed.gpaMax ?? 4.5;
                                                    const e = [
                                                        ...resumeData.education!,
                                                    ];
                                                    e[idx].gpa = isNaN(raw)
                                                        ? undefined
                                                        : Math.min(
                                                              max,
                                                              Math.max(0, raw)
                                                          );
                                                    setResumeData({
                                                        ...resumeData,
                                                        education: e,
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
                                                    setResumeData(backupData);
                                                setEditingEducation(null);
                                            }}
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBackupData(null);
                                                setEditingEducation(null);
                                            }}
                                            className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
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
                                            {ed.studyType} in {ed.area} (
                                            {ed.startDate} ~ {ed.endDate})
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setBackupData(resumeData);
                                                setEditingEducation(idx);
                                            }}
                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm("삭제하시겠습니까?")
                                                ) {
                                                    const e = [
                                                        ...resumeData.education!,
                                                    ];
                                                    e.splice(idx, 1);
                                                    setResumeData({
                                                        ...resumeData,
                                                        education: e,
                                                    });
                                                }
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

            {/* 수상 (Awards) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        수상 (Awards)
                    </h3>
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
                                awards: [
                                    newAward,
                                    ...(resumeData.awards || []),
                                ],
                            });
                            setEditingAward(0);
                        }}
                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        + 수상 추가
                    </button>
                </div>
                <div className="space-y-4">
                    {(resumeData.awards || []).map((award, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-transparent p-4"
                        >
                            {editingAward === idx ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            label="수상명"
                                            value={award.title || ""}
                                            onChange={(v) => {
                                                const a = [
                                                    ...(resumeData.awards ||
                                                        []),
                                                ];
                                                a[idx] = {
                                                    ...a[idx],
                                                    title: v,
                                                };
                                                setResumeData({
                                                    ...resumeData,
                                                    awards: a,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="수여기관"
                                            value={award.awarder || ""}
                                            onChange={(v) => {
                                                const a = [
                                                    ...(resumeData.awards ||
                                                        []),
                                                ];
                                                a[idx] = {
                                                    ...a[idx],
                                                    awarder: v,
                                                };
                                                setResumeData({
                                                    ...resumeData,
                                                    awards: a,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="날짜 (YYYY-MM)"
                                            value={award.date || ""}
                                            onChange={(v) => {
                                                const a = [
                                                    ...(resumeData.awards ||
                                                        []),
                                                ];
                                                a[idx] = { ...a[idx], date: v };
                                                setResumeData({
                                                    ...resumeData,
                                                    awards: a,
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
                                                        ...(resumeData.awards ||
                                                            []),
                                                    ];
                                                    a[idx] = {
                                                        ...a[idx],
                                                        markdown:
                                                            !a[idx].markdown,
                                                    };
                                                    setResumeData({
                                                        ...resumeData,
                                                        awards: a,
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
                                            value={award.summary || ""}
                                            onChange={(e) => {
                                                const a = [
                                                    ...(resumeData.awards ||
                                                        []),
                                                ];
                                                a[idx] = {
                                                    ...a[idx],
                                                    summary: e.target.value,
                                                };
                                                setResumeData({
                                                    ...resumeData,
                                                    awards: a,
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
                                                    setResumeData(backupData);
                                                setEditingAward(null);
                                            }}
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBackupData(null);
                                                setEditingAward(null);
                                            }}
                                            className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
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
                                                setBackupData(resumeData);
                                                setEditingAward(idx);
                                            }}
                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm("삭제하시겠습니까?")
                                                ) {
                                                    const a = [
                                                        ...(resumeData.awards ||
                                                            []),
                                                    ];
                                                    a.splice(idx, 1);
                                                    setResumeData({
                                                        ...resumeData,
                                                        awards: a,
                                                    });
                                                }
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

            {/* 스킬 (Skills) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        스킬 (Skills)
                    </h3>
                    <button
                        onClick={() => {
                            setBackupData(resumeData);
                            const newSkill: ResumeSkill = {
                                name: "",
                                level: "",
                                keywords: [],
                            };
                            setResumeData({
                                ...resumeData,
                                skills: [
                                    newSkill,
                                    ...(resumeData.skills || []),
                                ],
                            });
                            setEditingSkillKeywords("");
                            setEditingSkill(0);
                        }}
                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        + 스킬 추가
                    </button>
                </div>
                <div className="space-y-4">
                    {resumeData.skills?.map((skill, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-transparent p-4"
                        >
                            {editingSkill === idx ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            label="카테고리명"
                                            value={skill.name || ""}
                                            onChange={(v) => {
                                                const s = [
                                                    ...resumeData.skills!,
                                                ];
                                                s[idx].name = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    skills: s,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="숙련도 (Level)"
                                            value={skill.level || ""}
                                            onChange={(v) => {
                                                const s = [
                                                    ...resumeData.skills!,
                                                ];
                                                s[idx].level = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    skills: s,
                                                });
                                            }}
                                            placeholder="예: Master, Advanced"
                                        />
                                    </div>
                                    <TextAreaField
                                        label="키워드 (쉼표로 구분)"
                                        value={editingSkillKeywords}
                                        onChange={setEditingSkillKeywords}
                                        rows={2}
                                        placeholder="예: React, TypeScript, Node.js"
                                    />
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                if (backupData)
                                                    setResumeData(backupData);
                                                setEditingSkill(null);
                                            }}
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => {
                                                // editingSkillKeywords 파싱 후 저장
                                                const s = [
                                                    ...resumeData.skills!,
                                                ];
                                                s[idx] = {
                                                    ...s[idx],
                                                    keywords:
                                                        editingSkillKeywords
                                                            .split(",")
                                                            .map((k) =>
                                                                k.trim()
                                                            )
                                                            .filter(Boolean),
                                                };
                                                setResumeData({
                                                    ...resumeData,
                                                    skills: s,
                                                });
                                                setBackupData(null);
                                                setEditingSkill(null);
                                            }}
                                            className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                        >
                                            완료
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="mr-12">
                                        <h4 className="font-semibold text-(--color-foreground)">
                                            {skill.name}
                                            {skill.level && (
                                                <span className="ml-2 text-sm font-normal text-(--color-muted)">
                                                    {skill.level}
                                                </span>
                                            )}
                                        </h4>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {skill.keywords?.map((kw) => (
                                                <span
                                                    key={kw}
                                                    className="rounded bg-(--color-border) px-1.5 py-0.5 text-xs text-(--color-muted)"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setBackupData(resumeData);
                                                setEditingSkillKeywords(
                                                    skill.keywords?.join(
                                                        ", "
                                                    ) || ""
                                                );
                                                setEditingSkill(idx);
                                            }}
                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm("삭제하시겠습니까?")
                                                ) {
                                                    const s = [
                                                        ...resumeData.skills!,
                                                    ];
                                                    s.splice(idx, 1);
                                                    setResumeData({
                                                        ...resumeData,
                                                        skills: s,
                                                    });
                                                }
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

            {/* 언어 (Languages) */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        언어 (Languages)
                    </h3>
                    <button
                        onClick={() => {
                            setBackupData(resumeData);
                            const newLang: ResumeLanguage = {
                                language: "",
                                fluency: "",
                            };
                            setResumeData({
                                ...resumeData,
                                languages: [
                                    newLang,
                                    ...(resumeData.languages || []),
                                ],
                            });
                            setEditingLanguage(0);
                        }}
                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        + 언어 추가
                    </button>
                </div>
                <div className="space-y-4">
                    {resumeData.languages?.map((lang, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-transparent p-4"
                        >
                            {editingLanguage === idx ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            label="언어"
                                            value={lang.language || ""}
                                            onChange={(v) => {
                                                const l = [
                                                    ...resumeData.languages!,
                                                ];
                                                l[idx].language = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    languages: l,
                                                });
                                            }}
                                            placeholder="예: Korean, English"
                                        />
                                        <InputField
                                            label="능숙도 (Fluency)"
                                            value={lang.fluency || ""}
                                            onChange={(v) => {
                                                const l = [
                                                    ...resumeData.languages!,
                                                ];
                                                l[idx].fluency = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    languages: l,
                                                });
                                            }}
                                            placeholder="예: Native, Fluent, Intermediate"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                if (backupData)
                                                    setResumeData(backupData);
                                                setEditingLanguage(null);
                                            }}
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBackupData(null);
                                                setEditingLanguage(null);
                                            }}
                                            className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
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
                                                setBackupData(resumeData);
                                                setEditingLanguage(idx);
                                            }}
                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (
                                                    confirm("삭제하시겠습니까?")
                                                ) {
                                                    const l = [
                                                        ...resumeData.languages!,
                                                    ];
                                                    l.splice(idx, 1);
                                                    setResumeData({
                                                        ...resumeData,
                                                        languages: l,
                                                    });
                                                }
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

            {/* 데이터 고급 편집 (JSONFallback) */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-(--color-foreground)">
                            데이터 고급 편집 (JSONFallback)
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            기타 세부 정보 및 스킬, 언어 등은 JSON 편집기를 통해
                            직접 조작할 수 있습니다.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            try {
                                const newD = JSON.parse(jsonInput);
                                setResumeData(newD);
                                setStatus({
                                    type: "success",
                                    msg: "JSON 데이터가 폼에 반영되었습니다.",
                                });
                            } catch (err: any) {
                                setStatus({
                                    type: "error",
                                    msg: `JSON 파싱 에러: ${err.message}`,
                                });
                            }
                        }}
                        className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        JSON 적용
                    </button>
                </div>
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="h-64 w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface) p-4 font-mono text-sm leading-relaxed text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                    spellCheck={false}
                />
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-(--color-border) pt-6">
                {savedAt && (
                    <span className="text-sm text-green-600">
                        자동 저장 완료 {fmtTime(savedAt)}
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "변경사항 저장"}
                </button>
            </div>
        </div>
    );
}
