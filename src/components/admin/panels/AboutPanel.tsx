"use client";

// about_data 테이블 편집 + 프로필 이미지 업로드 + Job Field별 소개 관리
import { useEffect, useRef, useState } from "react";
import { getAboutBootstrap, saveAboutPanel } from "@/app/admin/actions/about";
import { uploadImage } from "@/lib/image-upload";
import type {
    AboutData,
    AboutSectionKey,
    CompetencySectionKey,
    FieldIntroduction,
    ValuePillar,
} from "@/types/about";
import {
    ABOUT_SECTION_KEYS,
    COMPETENCY_SECTION_KEYS,
    SECTION_PLACEHOLDERS,
    COMPETENCY_PLACEHOLDERS,
} from "@/types/about";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";
import AdminSaveBar from "@/components/admin/AdminSaveBar";

type JobFieldItem = { id: string; name: string; emoji: string };

// 한 줄당 한 항목으로 파싱
function parseSectionText(text: string): string[] {
    return text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function AboutPanel() {
    const { confirm } = useConfirmDialog();
    const [profileImage, setProfileImage] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    // resume_data 행 참조 (basics.image 단일 출처)
    const [resumeRowId, setResumeRowId] = useState<string | null>(null);
    const [resumeFullData, setResumeFullData] = useState<Record<
        string,
        unknown
    > | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [rowId, setRowId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // 랜딩 페이지 히어로 섹션
    const [valuePillars, setValuePillars] = useState<ValuePillar[]>([]);

    // Job Field별 소개
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [introductions, setIntroductions] = useState<
        Record<string, FieldIntroduction>
    >({});
    const [newIntroFieldId, setNewIntroFieldId] = useState("");

    // uncontrolled refs (textarea undo 동작 보장)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const descriptionSubRef = useRef<HTMLTextAreaElement>(null);
    const sectionRefs = useRef<
        Partial<Record<AboutSectionKey, HTMLTextAreaElement | null>>
    >({});
    const competencyRefs = useRef<
        Partial<Record<CompetencySectionKey, HTMLTextAreaElement | null>>
    >({});

    // About bootstrap 로드
    useEffect(() => {
        getAboutBootstrap().then((result) => {
            if (result.aboutData) {
                const d = result.aboutData as AboutData;
                setRowId(result.aboutRowId);
                setName(d.name ?? "");
                setEmail(d.contacts?.email ?? "");
                setGithub(d.contacts?.github ?? "");
                setLinkedin(d.contacts?.linkedin ?? "");
                if (descriptionRef.current)
                    descriptionRef.current.value = d.description ?? "";
                if (descriptionSubRef.current)
                    descriptionSubRef.current.value = d.descriptionSub ?? "";
                ABOUT_SECTION_KEYS.forEach((k) => {
                    const el = sectionRefs.current[k];
                    if (el) el.value = (d.sections?.[k] ?? []).join("\n");
                });
                COMPETENCY_SECTION_KEYS.forEach((k) => {
                    const el = competencyRefs.current[k];
                    if (el)
                        el.value = (d.competencySections?.[k] ?? []).join("\n");
                });
                setIntroductions(d.introductions ?? {});
                setValuePillars(d.valuePillars ?? []);
            }
            if (result.resumeData) {
                setResumeRowId(result.resumeRowId);
                setResumeFullData(result.resumeData);
                const img = (
                    result.resumeData.basics as { image?: string } | undefined
                )?.image?.trim();
                if (img) setProfileImage(img);
            }
            setJobFields(result.jobFields);
            setGithub((prev) => result.githubUrl || prev);
        });
    }, []);

    // 프로필 이미지 파일 업로드
    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const url = await uploadImage(file, "about/profile");
            setProfileImage(url);
        } catch {
            setStatus({ type: "error", msg: "이미지 업로드에 실패했습니다." });
        } finally {
            setImageUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Job Field별 소개 추가 (default 값 inherit)
    const handleAddIntro = () => {
        if (!newIntroFieldId) return;
        setIntroductions((prev) => ({
            ...prev,
            [newIntroFieldId]: {
                description: descriptionRef.current?.value ?? "",
                descriptionSub: descriptionSubRef.current?.value ?? "",
            },
        }));
        setNewIntroFieldId("");
    };

    // Job Field별 소개 삭제
    const handleRemoveIntro = async (fieldId: string) => {
        const field = jobFields.find((item) => item.id === fieldId);
        const ok = await confirm({
            title: "소개 override 삭제",
            description: `${field ? `${field.emoji} ${field.name}` : fieldId} 소개 override를 삭제하시겠습니까?`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        setIntroductions((prev) => {
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
    };

    // Job Field별 소개 필드 업데이트
    const handleIntroChange = (
        fieldId: string,
        key: keyof FieldIntroduction,
        value: string
    ) => {
        setIntroductions((prev) => ({
            ...prev,
            [fieldId]: { ...prev[fieldId], [key]: value },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);

        const data: AboutData = {
            name: name.trim() || undefined,
            description: descriptionRef.current?.value?.trim() || undefined,
            descriptionSub:
                descriptionSubRef.current?.value?.trim() || undefined,
            contacts: {
                email: email.trim() || undefined,
                github: github.trim() || undefined,
                linkedin: linkedin.trim() || undefined,
            },
            introductions:
                Object.keys(introductions).length > 0
                    ? introductions
                    : undefined,
            valuePillars: valuePillars.length > 0 ? valuePillars : undefined,
            sections: Object.fromEntries(
                ABOUT_SECTION_KEYS.map((k) => [
                    k,
                    parseSectionText(sectionRefs.current[k]?.value ?? ""),
                ])
            ) as AboutData["sections"],
            competencySections: Object.fromEntries(
                COMPETENCY_SECTION_KEYS.map((k) => [
                    k,
                    parseSectionText(competencyRefs.current[k]?.value ?? ""),
                ])
            ) as AboutData["competencySections"],
        };

        const result = await saveAboutPanel({
            aboutData: data,
            aboutRowId: rowId,
            profileImage,
            resumeRowId,
            resumeFullData,
            githubUrl: github,
        });

        if (result.success) {
            if (result.aboutRowId) setRowId(result.aboutRowId);
        }
        setSaving(false);
        setStatus(
            !result.success
                ? { type: "error", msg: result.error }
                : {
                      type: "success",
                      msg: "저장됐습니다. About 페이지에 즉시 반영됩니다.",
                  }
        );
    };

    // input 공통 클래스
    const inputCls =
        "w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none";
    // textarea 공통 클래스
    const textareaCls = `${inputCls} resize-y`;

    // override가 없는 job fields만 선택 목록에 표시
    const availableFields = jobFields.filter((f) => !introductions[f.id]);

    return (
        <div className="tablet:h-full tablet:overflow-y-auto space-y-6">
            {/* 프로필 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    프로필
                </h3>
                <div className="tablet:flex-row tablet:gap-6 flex flex-col items-start gap-4">
                    {/* 이미지 미리보기 */}
                    <div className="shrink-0">
                        {profileImage ? (
                            <img
                                src={profileImage}
                                alt="프로필 미리보기"
                                className="h-24 w-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-(--color-surface-subtle) text-sm text-(--color-muted)">
                                없음
                            </div>
                        )}
                    </div>
                    {/* 업로드 버튼 */}
                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={imageUploading}
                        >
                            {imageUploading ? "업로드 중..." : "이미지 업로드"}
                        </Button>
                        {profileImage && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: "프로필 이미지 삭제",
                                        description:
                                            "프로필 이미지를 삭제하시겠습니까?",
                                        confirmText: "삭제",
                                        cancelText: "취소",
                                        variant: "destructive",
                                    });
                                    if (!ok) return;
                                    setProfileImage("");
                                }}
                            >
                                <Trash2 size={13} />
                                삭제
                            </Button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                        이름
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="정호진"
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 소개 - Default */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    소개 (Default)
                </h3>
                <p className="text-sm text-(--color-muted)">
                    Job Field override가 없을 때 표시됩니다.
                </p>
                <div>
                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                        메인 소개
                    </label>
                    <textarea
                        ref={descriptionRef}
                        rows={3}
                        className={textareaCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                        보조 소개
                    </label>
                    <textarea
                        ref={descriptionSubRef}
                        rows={2}
                        className={textareaCls}
                    />
                </div>
            </section>

            {/* Job Field별 소개 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    Job Field별 소개
                </h3>
                <p className="text-sm text-(--color-muted)">
                    특정 Job Field 선택 시 Default 소개 대신 표시됩니다.
                </p>
                {Object.entries(introductions).map(([fieldId, intro]) => {
                    const field = jobFields.find((f) => f.id === fieldId);
                    return (
                        <div
                            key={fieldId}
                            className="space-y-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-(--color-foreground)">
                                    {field
                                        ? `${field.emoji} ${field.name}`
                                        : fieldId}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveIntro(fieldId)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 size={13} />
                                    삭제
                                </Button>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                    메인 소개
                                </label>
                                <textarea
                                    rows={3}
                                    value={intro.description}
                                    onChange={(e) =>
                                        handleIntroChange(
                                            fieldId,
                                            "description",
                                            e.target.value
                                        )
                                    }
                                    className={textareaCls}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                    보조 소개
                                </label>
                                <textarea
                                    rows={2}
                                    value={intro.descriptionSub}
                                    onChange={(e) =>
                                        handleIntroChange(
                                            fieldId,
                                            "descriptionSub",
                                            e.target.value
                                        )
                                    }
                                    className={textareaCls}
                                />
                            </div>
                        </div>
                    );
                })}
                {availableFields.length > 0 && (
                    <div className="flex gap-2">
                        <select
                            value={newIntroFieldId}
                            onChange={(e) => setNewIntroFieldId(e.target.value)}
                            className="h-9 flex-1 rounded-md border border-(--color-border) bg-(--color-surface) px-3 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                        >
                            <option value="">추가할 Job Field 선택</option>
                            {availableFields.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.emoji} {f.name}
                                </option>
                            ))}
                        </select>
                        <Button
                            onClick={handleAddIntro}
                            disabled={!newIntroFieldId}
                        >
                            소개 추가
                        </Button>
                    </div>
                )}
            </section>

            {/* 연락처 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    연락처
                </h3>
                <div>
                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                        Email
                    </label>
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                        GitHub URL
                    </label>
                    <input
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                        LinkedIn URL
                    </label>
                    <input
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 랜딩 페이지 히어로 섹션 */}
            <section className="space-y-4 rounded-xl border border-(--color-accent) bg-(--color-surface) p-6">
                <div className="w-fit rounded-lg bg-(--color-accent) px-2 py-0.5 text-sm font-medium text-(--color-on-accent)">
                    Landing Page
                </div>
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    Hero Section
                </h3>

                {/* Value Pillars */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-(--color-foreground)">
                            Value Pillars (3대 핵심 가치)
                        </h4>
                        <span className="text-sm text-(--color-muted)">
                            {valuePillars.length} / 3
                        </span>
                    </div>
                    {valuePillars.map((pillar, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-(--color-accent)">
                                    Pillar {idx + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const ok = await confirm({
                                            title: "Value Pillar 삭제",
                                            description: `Pillar ${idx + 1}을 삭제하시겠습니까?`,
                                            confirmText: "삭제",
                                            cancelText: "취소",
                                            variant: "destructive",
                                        });
                                        if (!ok) return;
                                        setValuePillars((prev) =>
                                            prev.filter((_, i) => i !== idx)
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
                                        Keyword
                                    </label>
                                    <input
                                        value={pillar.label}
                                        onChange={(e) =>
                                            setValuePillars((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx
                                                        ? {
                                                              ...p,
                                                              label: e.target
                                                                  .value,
                                                          }
                                                        : p
                                                )
                                            )
                                        }
                                        placeholder="짧은 키워드"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                        Sub
                                    </label>
                                    <input
                                        value={pillar.sub}
                                        onChange={(e) =>
                                            setValuePillars((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx
                                                        ? {
                                                              ...p,
                                                              sub: e.target
                                                                  .value,
                                                          }
                                                        : p
                                                )
                                            )
                                        }
                                        placeholder="부제"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">
                                        Description
                                    </label>
                                    <input
                                        value={pillar.description}
                                        onChange={(e) =>
                                            setValuePillars((prev) =>
                                                prev.map((p, i) =>
                                                    i === idx
                                                        ? {
                                                              ...p,
                                                              description:
                                                                  e.target
                                                                      .value,
                                                          }
                                                        : p
                                                )
                                            )
                                        }
                                        placeholder="설명"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {valuePillars.length < 3 && (
                        <Button
                            onClick={() =>
                                setValuePillars((prev) => [
                                    ...prev,
                                    { label: "", sub: "", description: "" },
                                ])
                            }
                            className="rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-medium whitespace-nowrap text-(--color-on-accent)"
                        >
                            추가
                        </Button>
                    )}
                </div>
            </section>

            {/* 경험 유형별 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    경험 유형별 리스트
                </h3>
                <p className="text-sm text-(--color-muted)">
                    한 줄 = 한 항목. 비워두면 표시 안 됨.
                </p>
                {ABOUT_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                sectionRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={SECTION_PLACEHOLDERS[key]}
                            className={`${textareaCls} min-h-[80px]`}
                        />
                    </div>
                ))}
            </section>

            {/* 역량 키워드별 */}
            <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
                <h3 className="text-xl font-bold text-(--color-foreground)">
                    역량 키워드별 리스트
                </h3>
                {COMPETENCY_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                competencyRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={COMPETENCY_PLACEHOLDERS[key]}
                            className={`${textareaCls} min-h-[80px]`}
                        />
                    </div>
                ))}
            </section>

            {/* Sticky 저장 바 */}
            <AdminSaveBar>
                {status && (
                    <span
                        className={`text-sm ${status.type === "error" ? "text-red-500" : "text-green-600"}`}
                    >
                        {status.msg}
                    </span>
                )}
                {!status && (
                    <span className="text-sm text-(--color-muted)">
                        About 페이지에 즉시 반영됩니다.
                    </span>
                )}
                <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={saving}
                    className="shrink-0 bg-green-500 px-8 text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                >
                    {saving ? "저장 중..." : "변경사항 저장"}
                </Button>
            </AdminSaveBar>
        </div>
    );
}
