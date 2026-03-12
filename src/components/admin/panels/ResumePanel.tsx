import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { uploadImageToSupabase } from "@/lib/image-upload";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import type {
    Resume,
    ResumeWork,
    ResumeProject,
    ResumeEducation,
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

export default function ResumePanel() {
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const [rowId, setRowId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);
    const [resumeLayout, setResumeLayout] = useState<ResumeLayout>("modern");
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);

    // Edit states for arrays
    const [editingWork, setEditingWork] = useState<number | null>(null);
    const [editingProject, setEditingProject] = useState<number | null>(null);
    const [editingEducation, setEditingEducation] = useState<number | null>(
        null
    );
    const [editingSkill, setEditingSkill] = useState<number | null>(null);
    const [editingLanguage, setEditingLanguage] = useState<number | null>(null);
    const [backupData, setBackupData] = useState<any>(null);

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
        ]).then(
            ([{ data: row, error }, { data: layoutRow }, { data: jfRow }]) => {
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
                    setResumeData({
                        ...defaultResume,
                        ...(row.data as Resume),
                    });
                    setJsonInput(
                        JSON.stringify(
                            { ...defaultResume, ...(row.data as Resume) },
                            null,
                            2
                        )
                    );
                } else {
                    setResumeData(defaultResume);
                }
                if (layoutRow?.value) {
                    setResumeLayout(layoutRow.value as ResumeLayout);
                }
                if (Array.isArray(jfRow?.value)) {
                    setJobFields(jfRow.value as JobFieldItem[]);
                }
            }
        );
    }, []);

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
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "변경사항 저장"}
                </button>
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

                <div className="space-y-4">
                    {resumeData.work?.map((work, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-transparent p-4"
                        >
                            {editingWork === idx ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            label="회사명"
                                            value={work.name || ""}
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
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
                                                const w = [...resumeData.work!];
                                                w[idx].position = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="시작일 (YYYY-MM)"
                                            value={work.startDate || ""}
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
                                                w[idx].startDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="종료일 (비워두면 '현재')"
                                            value={work.endDate || ""}
                                            onChange={(v) => {
                                                const w = [...resumeData.work!];
                                                w[idx].endDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    work: w,
                                                });
                                            }}
                                        />
                                    </div>
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
                                            work.highlights?.join("\n") || ""
                                        }
                                        onChange={(v) => {
                                            const w = [...resumeData.work!];
                                            w[idx].highlights = v.split("\n");
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
                                                    setResumeData(backupData);
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
                                <div className="flex items-start justify-between">
                                    <div className="mr-12">
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
                                                if (
                                                    confirm("삭제하시겠습니까?")
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
                    ))}
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
                                description: "",
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

                <div className="space-y-4">
                    {resumeData.projects?.map((proj, idx) => (
                        <div
                            key={idx}
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
                                            value={proj.roles?.join(", ") || ""}
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
                                        <InputField
                                            label="시작일"
                                            value={proj.startDate || ""}
                                            onChange={(v) => {
                                                const p = [
                                                    ...resumeData.projects!,
                                                ];
                                                p[idx].startDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    projects: p,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="종료일"
                                            value={proj.endDate || ""}
                                            onChange={(v) => {
                                                const p = [
                                                    ...resumeData.projects!,
                                                ];
                                                p[idx].endDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    projects: p,
                                                });
                                            }}
                                        />
                                    </div>
                                    <TextAreaField
                                        label="설명 (Description)"
                                        value={proj.description || ""}
                                        onChange={(v) => {
                                            const p = [...resumeData.projects!];
                                            p[idx].description = v;
                                            setResumeData({
                                                ...resumeData,
                                                projects: p,
                                            });
                                        }}
                                    />
                                    <TextAreaField
                                        label="주요 기능 (Highlights, 엔터 구분)"
                                        value={
                                            proj.highlights?.join("\n") || ""
                                        }
                                        onChange={(v) => {
                                            const p = [...resumeData.projects!];
                                            p[idx].highlights = v.split("\n");
                                            setResumeData({
                                                ...resumeData,
                                                projects: p,
                                            });
                                        }}
                                        rows={4}
                                    />
                                    <JobFieldSelector
                                        value={proj.jobField}
                                        fields={jobFields}
                                        onChange={(v) => {
                                            const p = [...resumeData.projects!];
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
                                                    setResumeData(backupData);
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
                                <div className="flex items-start justify-between">
                                    <div className="mr-12">
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
                                                setEditingProject(idx);
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
                    ))}
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
                                        <InputField
                                            label="시작일"
                                            value={ed.startDate || ""}
                                            onChange={(v) => {
                                                const e = [
                                                    ...resumeData.education!,
                                                ];
                                                e[idx].startDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    education: e,
                                                });
                                            }}
                                        />
                                        <InputField
                                            label="종료일"
                                            value={ed.endDate || ""}
                                            onChange={(v) => {
                                                const e = [
                                                    ...resumeData.education!,
                                                ];
                                                e[idx].endDate = v;
                                                setResumeData({
                                                    ...resumeData,
                                                    education: e,
                                                });
                                            }}
                                        />
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
                                        value={skill.keywords?.join(", ") || ""}
                                        onChange={(v) => {
                                            const s = [...resumeData.skills!];
                                            s[idx].keywords = v
                                                .split(",")
                                                .map((k) => k.trim())
                                                .filter(Boolean);
                                            setResumeData({
                                                ...resumeData,
                                                skills: s,
                                            });
                                        }}
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

            <div className="flex justify-end border-t border-(--color-border) pt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "변경사항 저장"}
                </button>
            </div>
        </div>
    );
}
