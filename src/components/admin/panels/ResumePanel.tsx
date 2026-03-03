import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { uploadImageToSupabase } from "@/lib/image-upload";
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

export default function ResumePanel() {
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const [rowId, setRowId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // Edit states for arrays
    const [editingWork, setEditingWork] = useState<number | null>(null);
    const [editingProject, setEditingProject] = useState<number | null>(null);
    const [editingEducation, setEditingEducation] = useState<number | null>(
        null
    );
    const [backupData, setBackupData] = useState<any>(null);

    // Fallback JSON input state
    const [jsonInput, setJsonInput] = useState("");

    useEffect(() => {
        if (!browserClient) return;
        browserClient
            .from("resume_data")
            .select("id, data")
            .eq("lang", "ko")
            .limit(1)
            .single()
            .then(({ data: row, error }) => {
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
                if (error || !row) {
                    setResumeData(defaultResume);
                    return;
                }
                setRowId(row.id);
                setResumeData({ ...defaultResume, ...(row.data as Resume) });
                setJsonInput(
                    JSON.stringify(
                        { ...defaultResume, ...(row.data as Resume) },
                        null,
                        2
                    )
                );
            });
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
                        className="text-sm font-semibold text-(--color-accent) hover:underline"
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
                                            className="rounded-lg bg-(--color-accent) px-4 py-1.5 text-sm font-medium text-(--color-on-accent) hover:opacity-90"
                                        >
                                            완료
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-(--color-foreground)">
                                            {work.position} at {work.name}
                                        </h4>
                                        <p className="text-sm text-(--color-muted)">
                                            {work.startDate} ~{" "}
                                            {work.endDate || "현재"}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setBackupData(resumeData);
                                                setEditingWork(idx);
                                            }}
                                            className="text-sm text-(--color-accent) hover:underline"
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
                                            className="text-sm text-red-500 hover:underline"
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
                        className="text-sm font-semibold text-(--color-accent) hover:underline"
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
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() =>
                                                setEditingProject(null)
                                            }
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium hover:bg-(--color-surface-subtle)"
                                        >
                                            완료
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div>
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
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                setEditingProject(idx)
                                            }
                                            className="text-sm text-(--color-accent) hover:underline"
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
                                            className="text-sm text-red-500 hover:underline"
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
                        className="text-sm font-semibold text-(--color-accent) hover:underline"
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
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() =>
                                                setEditingEducation(null)
                                            }
                                            className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium hover:bg-(--color-surface-subtle)"
                                        >
                                            완료
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div>
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
                                            onClick={() =>
                                                setEditingEducation(idx)
                                            }
                                            className="text-sm text-(--color-accent) hover:underline"
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
                                            className="text-sm text-red-500 hover:underline"
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

            {/* 기타 지원/스킬 및 JSON 백업 */}
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
                        className="rounded-lg border border-(--color-border) px-4 py-1.5 text-sm font-medium hover:bg-(--color-surface-subtle)"
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
        </div>
    );
}
