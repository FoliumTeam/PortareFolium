// about_data 테이블 편집 + 프로필 이미지 업로드 + Job Field별 소개 관리
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { uploadImageToSupabase } from "@/lib/image-upload";
import type {
    AboutData,
    AboutSectionKey,
    CompetencySectionKey,
    FieldIntroduction,
} from "@/types/about";
import {
    ABOUT_SECTION_KEYS,
    COMPETENCY_SECTION_KEYS,
    SECTION_PLACEHOLDERS,
    COMPETENCY_PLACEHOLDERS,
} from "@/types/about";

type JobFieldItem = { id: string; name: string; emoji: string };

// 한 줄당 한 항목으로 파싱
function parseSectionText(text: string): string[] {
    return text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function AboutPanel() {
    const [profileImage, setProfileImage] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    // resume_data 행 참조 (basics.image 단일 출처)
    const [resumeRowId, setResumeRowId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [resumeFullData, setResumeFullData] = useState<any>(null);
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

    // about_data + resume_data(basics.image) + site_config(job_fields) 동시 로드
    useEffect(() => {
        if (!browserClient) return;
        Promise.all([
            browserClient
                .from("about_data")
                .select("id, data")
                .limit(1)
                .single(),
            browserClient
                .from("resume_data")
                .select("id, data")
                .eq("lang", "ko")
                .single(),
            browserClient
                .from("site_config")
                .select("key, value")
                .eq("key", "job_fields")
                .limit(1)
                .single(),
        ]).then(
            ([{ data: row, error }, { data: resumeRow }, { data: config }]) => {
                if (!error && row) {
                    const d = row.data as AboutData;
                    setRowId(row.id);
                    setName(d.name ?? "");
                    setEmail(d.contacts?.email ?? "");
                    setGithub(d.contacts?.github ?? "");
                    setLinkedin(d.contacts?.linkedin ?? "");
                    if (descriptionRef.current)
                        descriptionRef.current.value = d.description ?? "";
                    if (descriptionSubRef.current)
                        descriptionSubRef.current.value =
                            d.descriptionSub ?? "";
                    ABOUT_SECTION_KEYS.forEach((k) => {
                        const el = sectionRefs.current[k];
                        if (el) el.value = (d.sections?.[k] ?? []).join("\n");
                    });
                    COMPETENCY_SECTION_KEYS.forEach((k) => {
                        const el = competencyRefs.current[k];
                        if (el)
                            el.value = (d.competencySections?.[k] ?? []).join(
                                "\n"
                            );
                    });
                    setIntroductions(d.introductions ?? {});
                }
                // resume_data.basics.image를 프로필 이미지 단일 출처로 사용
                if (resumeRow) {
                    setResumeRowId(resumeRow.id);
                    setResumeFullData(resumeRow.data);
                    const img = resumeRow.data?.basics?.image?.trim();
                    if (img) setProfileImage(img);
                }
                if (config) {
                    setJobFields((config.value as JobFieldItem[]) ?? []);
                }
            }
        );
    }, []);

    // 프로필 이미지 파일 업로드
    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const url = await uploadImageToSupabase(file, "about/profile");
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
    const handleRemoveIntro = (fieldId: string) => {
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
        if (!browserClient) return;
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

        // resume_data.basics.image 업데이트 (단일 출처)
        if (resumeRowId && resumeFullData) {
            const mergedResume = {
                ...resumeFullData,
                basics: {
                    ...resumeFullData.basics,
                    image: profileImage.trim() || undefined,
                },
            };
            await browserClient
                .from("resume_data")
                .update({ data: mergedResume })
                .eq("id", resumeRowId);
        }

        let err;
        if (rowId) {
            ({ error: err } = await browserClient
                .from("about_data")
                .update({ data })
                .eq("id", rowId));
        } else {
            const res = await browserClient
                .from("about_data")
                .insert({ data })
                .select("id")
                .single();
            err = res.error;
            if (res.data) setRowId(res.data.id);
        }

        setSaving(false);
        setStatus(
            err
                ? { type: "error", msg: err.message }
                : {
                      type: "success",
                      msg: "저장됐습니다. About 페이지에 즉시 반영됩니다.",
                  }
        );
    };

    const inputCls =
        "w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40";
    const btnCls =
        "rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50";

    // override가 없는 job fields만 선택 목록에 표시
    const availableFields = jobFields.filter((f) => !introductions[f.id]);

    return (
        <div className="max-w-2xl space-y-8">
            <h2 className="text-2xl font-bold text-(--color-foreground)">
                About 편집
            </h2>

            {/* 프로필 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    프로필
                </h3>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        프로필 이미지
                    </label>
                    {profileImage && (
                        <img
                            src={profileImage}
                            alt="프로필 미리보기"
                            className="mb-2 h-24 w-24 rounded-full object-cover"
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={imageUploading}
                            className={btnCls}
                        >
                            {imageUploading ? "업로드 중..." : "이미지 업로드"}
                        </button>
                        {profileImage && (
                            <button
                                type="button"
                                onClick={() => setProfileImage("")}
                                className="rounded-lg bg-red-500 px-4 py-2 text-base font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                            >
                                삭제
                            </button>
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
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        이름
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="정호진"
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 소개 - Default */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    소개 (Default)
                </h3>
                <p className="text-sm text-(--color-muted)">
                    Job Field override가 없을 때 표시됩니다.
                </p>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        메인 소개
                    </label>
                    <textarea
                        ref={descriptionRef}
                        rows={3}
                        className={`${inputCls} resize-y`}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        보조 소개
                    </label>
                    <textarea
                        ref={descriptionSubRef}
                        rows={2}
                        className={`${inputCls} resize-y`}
                    />
                </div>
            </section>

            {/* Job Field별 소개 */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
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
                            className="space-y-3 rounded-lg border border-(--color-border) p-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-(--color-foreground)">
                                    {field
                                        ? `${field.emoji} ${field.name}`
                                        : fieldId}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveIntro(fieldId)}
                                    className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    삭제
                                </button>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-(--color-muted)">
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
                                    className={`${inputCls} resize-y`}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-(--color-muted)">
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
                                    className={`${inputCls} resize-y`}
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
                            className={`${inputCls} flex-1`}
                        >
                            <option value="">추가할 Job Field 선택</option>
                            {availableFields.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.emoji} {f.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAddIntro}
                            disabled={!newIntroFieldId}
                            className={btnCls}
                        >
                            소개 추가
                        </button>
                    </div>
                )}
            </section>

            {/* 연락처 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    연락처
                </h3>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        Email
                    </label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        GitHub URL
                    </label>
                    <input
                        type="text"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        LinkedIn URL
                    </label>
                    <input
                        type="text"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 경험 유형별 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    경험 유형별 리스트
                </h3>
                <p className="text-sm text-(--color-muted)">
                    한 줄 = 한 항목. 비워두면 표시 안 됨.
                </p>
                {ABOUT_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                sectionRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={SECTION_PLACEHOLDERS[key]}
                            className={`${inputCls} min-h-[80px] resize-y`}
                        />
                    </div>
                ))}
            </section>

            {/* 역량 키워드별 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    역량 키워드별 리스트
                </h3>
                {COMPETENCY_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                competencyRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={COMPETENCY_PLACEHOLDERS[key]}
                            className={`${inputCls} min-h-[80px] resize-y`}
                        />
                    </div>
                ))}
            </section>

            {/* 피드백 + 저장 */}
            {status && (
                <p
                    className={`rounded-lg px-3 py-2 text-base ${status.type === "error" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30"}`}
                >
                    {status.msg}
                </p>
            )}
            <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {saving ? "저장 중..." : "변경사항 저장"}
            </button>
        </div>
    );
}
