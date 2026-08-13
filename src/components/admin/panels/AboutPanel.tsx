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
import {
    BriefcaseBusiness,
    Brain,
    Globe2,
    Layers3,
    Mail,
    RotateCcw,
    Sparkles,
    Trash2,
    UserRound,
} from "lucide-react";
import AdminSaveBar from "@/components/admin/AdminSaveBar";

type JobFieldItem = { id: string; name: string; emoji: string };

function AboutSection({
    Icon,
    title,
    description,
    children,
}: {
    Icon: typeof UserRound;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="tablet:p-6 space-y-5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface-subtle) text-(--color-accent)">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-(--color-foreground)">
                        {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                        {description}
                    </p>
                </div>
            </div>
            {children}
        </section>
    );
}

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
    const [activeJobFieldId, setActiveJobFieldId] = useState<string | null>(
        null
    );

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

    // 직무 분야별 소개 기본값 상속
    const handleCreateFieldIntroduction = (fieldId: string) => {
        if (!fieldId || introductions[fieldId]) return;
        setIntroductions((prev) => ({
            ...prev,
            [fieldId]: {
                description: descriptionRef.current?.value ?? "",
                descriptionSub: descriptionSubRef.current?.value ?? "",
                valuePillars: valuePillars.map((pillar) => ({ ...pillar })),
                sections: Object.fromEntries(
                    ABOUT_SECTION_KEYS.map((key) => [
                        key,
                        parseSectionText(sectionRefs.current[key]?.value ?? ""),
                    ])
                ),
                competencySections: Object.fromEntries(
                    COMPETENCY_SECTION_KEYS.map((key) => [
                        key,
                        parseSectionText(
                            competencyRefs.current[key]?.value ?? ""
                        ),
                    ])
                ),
            },
        }));
        setActiveJobFieldId(fieldId);
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
    const updateIntroduction = (
        fieldId: string,
        patch: Partial<FieldIntroduction>
    ) => {
        setIntroductions((prev) => ({
            ...prev,
            [fieldId]: { ...prev[fieldId], ...patch },
        }));
    };

    const handleIntroChange = (
        fieldId: string,
        key: "description" | "descriptionSub",
        value: string
    ) => updateIntroduction(fieldId, { [key]: value });

    const updateFieldPillar = (
        fieldId: string,
        index: number,
        key: keyof ValuePillar,
        value: string
    ) => {
        const pillars = [...(introductions[fieldId]?.valuePillars ?? [])];
        pillars[index] = { ...pillars[index], [key]: value };
        updateIntroduction(fieldId, { valuePillars: pillars });
    };

    const updateFieldList = (
        fieldId: string,
        group: "sections" | "competencySections",
        key: AboutSectionKey | CompetencySectionKey,
        value: string
    ) => {
        const introduction = introductions[fieldId];
        updateIntroduction(fieldId, {
            [group]: {
                ...introduction?.[group],
                [key]: parseSectionText(value),
            },
        });
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

    const activeField = jobFields.find(
        (field) => field.id === activeJobFieldId
    );
    const activeIntroduction = activeJobFieldId
        ? introductions[activeJobFieldId]
        : undefined;

    return (
        <div className="tablet:h-full tablet:overflow-y-auto space-y-5 pb-8">
            <div className="border-b border-(--color-border) pb-5">
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    Profile Content
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-(--color-foreground)">
                    About 관리
                </h2>
                <p className="mt-2 text-sm text-(--color-muted)">
                    공통 프로필과 직무 분야별 소개·핵심 가치·경험을 분리해
                    관리합니다.
                </p>
            </div>

            <AboutSection
                Icon={UserRound}
                title="공통 프로필"
                description="모든 직무 분야에서 공유하는 기본 인물 정보와 연락처입니다."
            >
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
                            className="bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
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
                <div className="max-w-xl rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                    <label className="mb-2 block text-sm font-semibold text-(--color-foreground)">
                        이름
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="정호진"
                        className={inputCls}
                    />
                </div>
            </AboutSection>

            <AboutSection
                Icon={Mail}
                title="공통 연락처"
                description="About과 Resume에서 함께 사용하는 기본 연락처입니다."
            >
                <div className="tablet:grid-cols-3 grid gap-3">
                    {[
                        ["Email", email, setEmail],
                        ["GitHub URL", github, setGithub],
                        ["LinkedIn URL", linkedin, setLinkedin],
                    ].map(([label, value, setValue]) => (
                        <div
                            key={label as string}
                            className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                        >
                            <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                {label as string}
                            </label>
                            <input
                                value={value as string}
                                onChange={(event) =>
                                    (
                                        setValue as React.Dispatch<
                                            React.SetStateAction<string>
                                        >
                                    )(event.target.value)
                                }
                                className={`${inputCls} mt-2 bg-(--color-surface)`}
                            />
                        </div>
                    ))}
                </div>
            </AboutSection>

            <AboutSection
                Icon={Globe2}
                title="직무 분야 콘텐츠"
                description="선택한 직무 분야의 Landing과 About 콘텐츠만 편집합니다. 직무 분야별 값은 다른 공개 프로필에 섞이지 않습니다."
            >
                <div className="tablet:grid-cols-3 grid gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveJobFieldId(null)}
                        aria-label="공통 기본 콘텐츠 편집"
                        aria-pressed={activeJobFieldId === null}
                        className={`rounded-2xl border p-4 text-left transition-colors ${activeJobFieldId === null ? "border-(--color-accent) bg-(--color-accent)/8 ring-1 ring-(--color-accent)/30" : "border-(--color-border) bg-(--color-surface-subtle)/55 hover:border-(--color-accent)/50"}`}
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-surface) text-(--color-accent)">
                            <Layers3 className="h-5 w-5" />
                        </span>
                        <span className="mt-4 block text-sm font-semibold text-(--color-foreground)">
                            공통 기본값
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                            별도 콘텐츠가 없는 직무 분야의 fallback
                        </span>
                    </button>
                    {jobFields.map((field) => {
                        const isolated = Boolean(introductions[field.id]);
                        const selected = activeJobFieldId === field.id;
                        return (
                            <button
                                key={field.id}
                                type="button"
                                onClick={() => setActiveJobFieldId(field.id)}
                                aria-label={`${field.name} 직무 분야 콘텐츠 편집`}
                                aria-pressed={selected}
                                className={`rounded-2xl border p-4 text-left transition-colors ${selected ? "border-(--color-accent) bg-(--color-accent)/8 ring-1 ring-(--color-accent)/30" : "border-(--color-border) bg-(--color-surface-subtle)/55 hover:border-(--color-accent)/50"}`}
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-surface) text-xl">
                                    {field.emoji}
                                </span>
                                <span className="mt-4 flex items-center gap-2 text-sm font-semibold text-(--color-foreground)">
                                    {field.name}
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs ${isolated ? "bg-green-500/12 text-green-700 dark:text-green-400" : "bg-(--color-surface) text-(--color-muted)"}`}
                                    >
                                        {isolated
                                            ? "독립 콘텐츠"
                                            : "공통값 사용"}
                                    </span>
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                    /{field.id} 공개 프로필
                                </span>
                            </button>
                        );
                    })}
                </div>
            </AboutSection>

            {activeJobFieldId === null ? (
                <AboutSection
                    Icon={Sparkles}
                    title="공통 기본 콘텐츠"
                    description="직무 분야의 독립 콘텐츠를 만들기 전까지 Landing과 About에 표시되는 기본 내용입니다."
                >
                    <div className="tablet:grid-cols-2 grid gap-3">
                        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                            <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                메인 소개
                            </label>
                            <textarea
                                ref={descriptionRef}
                                rows={4}
                                className={`${textareaCls} mt-2 bg-(--color-surface)`}
                            />
                        </div>
                        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                            <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                보조 소개
                            </label>
                            <textarea
                                ref={descriptionSubRef}
                                rows={4}
                                className={`${textareaCls} mt-2 bg-(--color-surface)`}
                            />
                        </div>
                    </div>
                </AboutSection>
            ) : activeField && activeIntroduction ? (
                <AboutSection
                    Icon={Sparkles}
                    title={`${activeField.emoji} ${activeField.name} 독립 콘텐츠`}
                    description={`/${activeField.id} Landing과 About에만 적용되는 소개입니다.`}
                >
                    <div className="flex justify-end border-b border-(--color-border) pb-4">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRemoveIntro(activeField.id)}
                            className="bg-red-600 text-white hover:bg-red-500"
                        >
                            <RotateCcw size={13} />
                            공통값으로 되돌리기
                        </Button>
                    </div>
                    <div className="tablet:grid-cols-2 grid gap-3">
                        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                            <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                메인 소개
                            </label>
                            <textarea
                                rows={4}
                                value={activeIntroduction.description}
                                onChange={(event) =>
                                    handleIntroChange(
                                        activeField.id,
                                        "description",
                                        event.target.value
                                    )
                                }
                                className={`${textareaCls} mt-2 bg-(--color-surface)`}
                            />
                        </div>
                        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                            <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                보조 소개
                            </label>
                            <textarea
                                rows={4}
                                value={activeIntroduction.descriptionSub}
                                onChange={(event) =>
                                    handleIntroChange(
                                        activeField.id,
                                        "descriptionSub",
                                        event.target.value
                                    )
                                }
                                className={`${textareaCls} mt-2 bg-(--color-surface)`}
                            />
                        </div>
                    </div>
                </AboutSection>
            ) : activeField ? (
                <AboutSection
                    Icon={Sparkles}
                    title={`${activeField.emoji} ${activeField.name} 콘텐츠`}
                    description="현재 공통 기본값을 사용 중입니다. 독립 콘텐츠를 만들면 이 직무 분야만 따로 편집할 수 있습니다."
                >
                    <Button
                        onClick={() =>
                            handleCreateFieldIntroduction(activeField.id)
                        }
                        className="bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                    >
                        독립 콘텐츠 만들기
                    </Button>
                </AboutSection>
            ) : null}

            {activeJobFieldId === null ? (
                <>
                    <AboutSection
                        Icon={Sparkles}
                        title="공통 Landing 핵심 가치"
                        description="직무 분야가 별도 핵심 가치를 갖지 않을 때 표시되는 기본 3개 항목입니다."
                    >
                        <div className="tablet:grid-cols-3 grid gap-3">
                            {valuePillars.map((pillar, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-(--color-foreground)">
                                            핵심 가치 {index + 1}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setValuePillars((current) =>
                                                    current.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index
                                                    )
                                                )
                                            }
                                            className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-500"
                                            aria-label={`핵심 가치 ${index + 1} 삭제`}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(
                                            [
                                                ["키워드", "label"],
                                                ["보조 문구", "sub"],
                                                ["설명", "description"],
                                            ] as const
                                        ).map(([label, key]) => (
                                            <div key={key}>
                                                <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                    {label}
                                                </label>
                                                <input
                                                    value={pillar[key]}
                                                    onChange={(event) =>
                                                        setValuePillars(
                                                            (current) =>
                                                                current.map(
                                                                    (
                                                                        item,
                                                                        itemIndex
                                                                    ) =>
                                                                        itemIndex ===
                                                                        index
                                                                            ? {
                                                                                  ...item,
                                                                                  [key]: event
                                                                                      .target
                                                                                      .value,
                                                                              }
                                                                            : item
                                                                )
                                                        )
                                                    }
                                                    className={`${inputCls} mt-2 bg-(--color-surface)`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {valuePillars.length < 3 && (
                            <Button
                                onClick={() =>
                                    setValuePillars((current) => [
                                        ...current,
                                        {
                                            label: "",
                                            sub: "",
                                            description: "",
                                        },
                                    ])
                                }
                                className="bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                            >
                                핵심 가치 추가
                            </Button>
                        )}
                    </AboutSection>
                    <AboutSection
                        Icon={BriefcaseBusiness}
                        title="공통 경험"
                        description="한 줄이 About의 한 항목입니다. 비어 있는 분야는 공개하지 않습니다."
                    >
                        <div className="tablet:grid-cols-2 grid gap-3">
                            {ABOUT_SECTION_KEYS.map((key) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                >
                                    <label className="text-sm font-semibold text-(--color-foreground)">
                                        {key}
                                    </label>
                                    <textarea
                                        ref={(element) => {
                                            sectionRefs.current[key] = element;
                                        }}
                                        rows={4}
                                        placeholder={SECTION_PLACEHOLDERS[key]}
                                        className={`${textareaCls} mt-2 min-h-[96px] bg-(--color-surface)`}
                                    />
                                </div>
                            ))}
                        </div>
                    </AboutSection>
                    <AboutSection
                        Icon={Brain}
                        title="공통 역량"
                        description="한 줄이 About의 한 항목입니다. 직무 분야별 override가 없는 경우에 사용됩니다."
                    >
                        <div className="tablet:grid-cols-2 grid gap-3">
                            {COMPETENCY_SECTION_KEYS.map((key) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                >
                                    <label className="text-sm font-semibold text-(--color-foreground)">
                                        {key}
                                    </label>
                                    <textarea
                                        ref={(element) => {
                                            competencyRefs.current[key] =
                                                element;
                                        }}
                                        rows={4}
                                        placeholder={
                                            COMPETENCY_PLACEHOLDERS[key]
                                        }
                                        className={`${textareaCls} mt-2 min-h-[96px] bg-(--color-surface)`}
                                    />
                                </div>
                            ))}
                        </div>
                    </AboutSection>
                </>
            ) : activeField && activeIntroduction ? (
                <>
                    <AboutSection
                        Icon={Sparkles}
                        title={`${activeField.name} Landing 핵심 가치`}
                        description="이 직무 분야 Landing에만 표시되는 3개 항목입니다."
                    >
                        <div className="tablet:grid-cols-3 grid gap-3">
                            {[0, 1, 2].map((index) => {
                                const pillar = activeIntroduction
                                    .valuePillars?.[index] ?? {
                                    label: "",
                                    sub: "",
                                    description: "",
                                };
                                return (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                    >
                                        <p className="mb-3 text-sm font-semibold text-(--color-foreground)">
                                            핵심 가치 {index + 1}
                                        </p>
                                        <div className="space-y-3">
                                            {(
                                                [
                                                    ["키워드", "label"],
                                                    ["보조 문구", "sub"],
                                                    ["설명", "description"],
                                                ] as const
                                            ).map(([label, key]) => (
                                                <div key={key}>
                                                    <label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                        {label}
                                                    </label>
                                                    <input
                                                        value={pillar[key]}
                                                        onChange={(event) =>
                                                            updateFieldPillar(
                                                                activeField.id,
                                                                index,
                                                                key,
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        className={`${inputCls} mt-2 bg-(--color-surface)`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AboutSection>
                    <AboutSection
                        Icon={BriefcaseBusiness}
                        title={`${activeField.name} 경험`}
                        description="이 직무 분야의 About에만 표시되는 경험입니다."
                    >
                        <div className="tablet:grid-cols-2 grid gap-3">
                            {ABOUT_SECTION_KEYS.map((key) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                >
                                    <label className="text-sm font-semibold text-(--color-foreground)">
                                        {key}
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={(
                                            activeIntroduction.sections?.[
                                                key
                                            ] ?? []
                                        ).join("\n")}
                                        onChange={(event) =>
                                            updateFieldList(
                                                activeField.id,
                                                "sections",
                                                key,
                                                event.target.value
                                            )
                                        }
                                        className={`${textareaCls} mt-2 min-h-[96px] bg-(--color-surface)`}
                                    />
                                </div>
                            ))}
                        </div>
                    </AboutSection>
                    <AboutSection
                        Icon={Brain}
                        title={`${activeField.name} 역량`}
                        description="이 직무 분야의 About에만 표시되는 역량입니다."
                    >
                        <div className="tablet:grid-cols-2 grid gap-3">
                            {COMPETENCY_SECTION_KEYS.map((key) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                >
                                    <label className="text-sm font-semibold text-(--color-foreground)">
                                        {key}
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={(
                                            activeIntroduction
                                                .competencySections?.[key] ?? []
                                        ).join("\n")}
                                        onChange={(event) =>
                                            updateFieldList(
                                                activeField.id,
                                                "competencySections",
                                                key,
                                                event.target.value
                                            )
                                        }
                                        className={`${textareaCls} mt-2 min-h-[96px] bg-(--color-surface)`}
                                    />
                                </div>
                            ))}
                        </div>
                    </AboutSection>
                </>
            ) : null}

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
