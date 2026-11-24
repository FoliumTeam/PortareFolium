"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, FileText, Loader2 } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import { useUILocale } from "@/components/LocaleProvider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { translateUI } from "@/lib/ui-messages";
import {
    getResumePdfDefaults,
    type ResumePdfDefaults,
} from "@/app/admin/actions/resume-pdf";
import {
    deleteResumePdfPreset,
    listResumePdfPresets,
    saveResumePdfPreset,
    type ResumePdfPreset,
} from "@/app/admin/actions/resume-pdf-presets";
import { defaultSectionLabels } from "@/types/resume";
import type {
    PdfDetailKey,
    PdfLang,
    PdfVariant,
    PdfWarning,
} from "@/types/resume-pdf";

export type ResumePdfSourceProps = {
    sourceKind: "job_field" | "application_profile";
    jobField: string;
    applicationProfileId?: string;
};

type Overrides = {
    sections: Record<string, boolean>;
    basics: Record<string, boolean>;
    projects: {
        order?: string[];
        hiddenSubsections: Record<string, string[]>;
        compactPersonal: boolean;
    };
    details: Partial<Record<PdfDetailKey, boolean>> & {
        excludedCore?: string[];
    };
};

const EMPTY: Overrides = {
    sections: {},
    basics: {},
    projects: { hiddenSubsections: {}, compactPersonal: false },
    details: {},
};

const BASICS_LABELS: Record<string, string> = {
    image: "사진",
    name: "이름",
    headline: "직무 머리글",
    summary: "자기소개",
    email: "이메일",
    phone: "전화",
    url: "웹사이트",
    location: "거주지",
    profiles: "프로필 링크",
    birthDate: "생년월일",
    military: "병역",
};

const DETAIL_LABELS: Record<PdfDetailKey, string> = {
    educationGpa: "학점(GPA)",
    educationCourses: "수강 과목",
    educationArea: "전공",
    skillLevel: "기술 수준",
    workHighlights: "경력 성과 목록",
    projectTech: "프로젝트 기술",
    projectLinks: "프로젝트 링크",
    projectTeam: "프로젝트 인원",
    shokumuSelfPr: "職務経歴書 自己PR 블록 (PDF-F)",
};

const WARNING_LABELS: Record<string, string> = {
    "missing-introduction": "직무 소개 글 없음",
    "unsupported-section": "PDF 미지원 섹션",
    "unknown-project-type": "프로젝트 종류 미지정",
    "unknown-country": "국가명 미등록",
    "phone-trunk-prefix": "국제번호 뒤 0이 붙은 전화번호",
    "missing-project": "찾을 수 없는 프로젝트",
    "image-skipped": "그림 생략",
    "external-request-blocked": "외부 요청 차단",
};

const Row = ({
    label,
    checked,
    onChange,
    disabled,
    hint,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    hint?: string;
}) => (
    <label className="flex items-center justify-between gap-3 py-1 text-sm">
        <span className={disabled ? "text-(--color-muted)" : ""}>
            <LocalizedText text={label} />
            {hint && (
                <span className="ml-2 text-xs text-(--color-muted)">
                    <LocalizedText text={hint} />
                </span>
            )}
        </span>
        <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
        />
    </label>
);

const Group = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section className="rounded-lg border border-(--color-border) p-3">
        <h3 className="mb-2 text-sm font-bold">
            <LocalizedText text={title} />
        </h3>
        {children}
    </section>
);

// 이력서 PDF 생성 대화상자: 사이트 표시가 기본값, 바꾼 값만 이 PDF·프리셋에 적용
export default function ResumePdfDialog({
    open,
    onOpenChange,
    source,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    source: ResumePdfSourceProps;
}) {
    const { messages } = useUILocale();
    const t = (text: string) => translateUI(text, messages);
    const [lang, setLang] = useState<PdfLang>("ko");
    const [variant, setVariant] = useState<PdfVariant>("C");
    const [defaults, setDefaults] = useState<ResumePdfDefaults | null>(null);
    const [over, setOver] = useState<Overrides>(EMPTY);
    const [presets, setPresets] = useState<ResumePdfPreset[]>([]);
    const [presetId, setPresetId] = useState("");
    const [presetName, setPresetName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [failures, setFailures] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<PdfWarning[]>([]);
    const [pdfUrl, setPdfUrl] = useState("");

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setDefaults(null);
        void getResumePdfDefaults({ ...source, lang }).then((r) => {
            if (!alive) return;
            if (r.success) setDefaults(r.data);
            else setError(r.error);
        });
        return () => {
            alive = false;
        };
    }, [open, lang, source]);

    const refreshPresets = useCallback(async () => {
        const r = await listResumePdfPresets(source);
        if (r.success) setPresets(r.data);
    }, [source]);

    useEffect(() => {
        if (open) void refreshPresets();
    }, [open, refreshPresets]);

    useEffect(
        () => () => void (pdfUrl && URL.revokeObjectURL(pdfUrl)),
        [pdfUrl]
    );

    // 바꾼 값만 남김: 기본값과 같아지면 덮어쓰기 제거
    const setFlag = (
        group: "sections" | "basics",
        key: string,
        value: boolean,
        base: boolean
    ) =>
        setOver((o) => {
            const next = { ...o[group] };
            if (value === base) delete next[key];
            else next[key] = value;
            return { ...o, [group]: next };
        });

    const included = useMemo(
        () =>
            over.projects.order ??
            defaults?.projects.filter((p) => p.on).map((p) => p.slug) ??
            [],
        [over.projects.order, defaults]
    );
    const setOrder = (order: string[]) =>
        setOver((o) => ({ ...o, projects: { ...o.projects, order } }));
    const move = (slug: string, delta: number) => {
        const list = [...included];
        const i = list.indexOf(slug);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        setOrder(list);
    };
    const projectBySlug = new Map(defaults?.projects.map((p) => [p.slug, p]));
    const excludedCore = new Set(over.details.excludedCore ?? []);

    const applyPreset = (id: string) => {
        setPresetId(id);
        const p = presets.find((x) => x.id === id);
        if (!p) return;
        setPresetName(p.name);
        setLang(p.lang);
        setVariant(p.variant);
        setOver({
            sections: p.options.sections,
            basics: p.options.basics as Record<string, boolean>,
            projects: p.options.projects,
            details: p.options.details,
        });
    };

    const savePreset = async () => {
        const r = await saveResumePdfPreset({
            ...(presetId ? { id: presetId } : {}),
            name: presetName,
            sourceKind: source.sourceKind,
            jobField: source.jobField,
            applicationProfileId: source.applicationProfileId ?? null,
            lang,
            variant,
            options: over,
        });
        if (!r.success) return setError(r.error);
        setError("");
        setPresetId(r.data.id);
        await refreshPresets();
    };

    const removePreset = async () => {
        if (!presetId || !window.confirm(t("이 프리셋을 삭제할까요?"))) return;
        const r = await deleteResumePdfPreset(presetId);
        if (!r.success) return setError(r.error);
        setPresetId("");
        setPresetName("");
        await refreshPresets();
    };

    const generate = async () => {
        setBusy(true);
        setError("");
        setFailures([]);
        try {
            const res = await fetch("/api/resume-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...source,
                    lang,
                    variant,
                    options: over,
                }),
            });
            if (res.ok) {
                const header = res.headers.get("X-Resume-Pdf-Warnings");
                setWarnings(
                    header ? JSON.parse(decodeURIComponent(header)) : []
                );
                setPdfUrl(URL.createObjectURL(await res.blob()));
                return;
            }
            const body = (await res.json().catch(() => ({}))) as {
                error?: string;
                failures?: { gate: string; detail: string }[];
                warnings?: PdfWarning[];
            };
            setError(body.error ?? `HTTP ${res.status}`);
            setFailures(
                (body.failures ?? []).map((f) => `${f.gate} ${f.detail}`)
            );
            setWarnings(body.warnings ?? []);
        } catch {
            setError(t("PDF 생성 요청 실패"));
        } finally {
            setBusy(false);
        }
    };

    const fileName = `resume-${lang}-${variant.toLowerCase()}.pdf`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        <LocalizedText text="이력서 PDF 만들기" />
                    </DialogTitle>
                    <DialogDescription>
                        <LocalizedText text="처음 상태는 사이트 표시와 같습니다. 여기서 바꾼 값은 이 PDF와 저장한 프리셋에만 적용되고 사이트 설정은 바뀌지 않습니다." />
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <Group title="형식">
                        <div className="flex flex-wrap gap-2 text-sm">
                            <select
                                aria-label={t("PDF 언어")}
                                value={lang}
                                onChange={(e) =>
                                    setLang(e.target.value as PdfLang)
                                }
                                className="rounded border border-(--color-border) bg-transparent px-2 py-1"
                            >
                                <option value="ko">한국어</option>
                                <option value="ja">日本語</option>
                            </select>
                            <select
                                aria-label={t("PDF 형식")}
                                value={variant}
                                onChange={(e) =>
                                    setVariant(e.target.value as PdfVariant)
                                }
                                className="rounded border border-(--color-border) bg-transparent px-2 py-1"
                            >
                                <option value="C">
                                    {t("PDF-C 화면용 컬러")}
                                </option>
                                <option value="F">
                                    {t("PDF-F 일본 기업 양식 (흑백)")}
                                </option>
                            </select>
                        </div>
                    </Group>

                    <Group title="프리셋">
                        <div className="flex flex-wrap gap-2 text-sm">
                            <select
                                aria-label={t("프리셋 선택")}
                                value={presetId}
                                onChange={(e) =>
                                    e.target.value
                                        ? applyPreset(e.target.value)
                                        : (setPresetId(""), setOver(EMPTY))
                                }
                                className="rounded border border-(--color-border) bg-transparent px-2 py-1"
                            >
                                <option value="">{t("사이트 기본값")}</option>
                                {presets.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.lang} · {p.variant})
                                    </option>
                                ))}
                            </select>
                            <input
                                aria-label={t("프리셋 이름")}
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder={t("프리셋 이름")}
                                className="min-w-0 flex-1 rounded border border-(--color-border) bg-transparent px-2 py-1"
                            />
                            <button
                                type="button"
                                onClick={() => void savePreset()}
                                className="rounded border border-(--color-border) px-2 py-1 hover:border-(--color-accent)"
                            >
                                <LocalizedText
                                    text={presetId ? "덮어쓰기" : "저장"}
                                />
                            </button>
                            {presetId && (
                                <button
                                    type="button"
                                    onClick={() => void removePreset()}
                                    className="rounded border border-(--color-border) px-2 py-1 hover:border-red-500"
                                >
                                    <LocalizedText text="삭제" />
                                </button>
                            )}
                        </div>
                    </Group>
                </div>

                {!defaults ? (
                    <p className="flex items-center gap-2 py-6 text-sm text-(--color-muted)">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <LocalizedText text="사이트 표시 설정을 불러오는 중" />
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Group title="섹션">
                            {defaults.sections.map((s) => (
                                <Row
                                    key={s.key}
                                    label={defaultSectionLabels[s.key] ?? s.key}
                                    checked={
                                        s.supported &&
                                        (over.sections[s.key] ?? s.on)
                                    }
                                    disabled={!s.supported}
                                    hint={
                                        s.supported ? undefined : "PDF 미지원"
                                    }
                                    onChange={(v) =>
                                        setFlag("sections", s.key, v, s.on)
                                    }
                                />
                            ))}
                        </Group>
                        <Group title="인적사항">
                            {Object.entries(defaults.basics).map(
                                ([k, base]) => (
                                    <Row
                                        key={k}
                                        label={BASICS_LABELS[k] ?? k}
                                        checked={over.basics[k] ?? base}
                                        onChange={(v) =>
                                            setFlag("basics", k, v, base)
                                        }
                                    />
                                )
                            )}
                        </Group>
                        <Group title="프로젝트">
                            <p className="mb-2 text-xs text-(--color-muted)">
                                <LocalizedText text="순서는 같은 묶음(회사 → AI 에이전트 → 개인) 안에서만 적용됩니다." />
                            </p>
                            <ul className="space-y-1">
                                {[
                                    ...included,
                                    ...defaults.projects
                                        .map((p) => p.slug)
                                        .filter((s) => !included.includes(s)),
                                ].map((slug) => {
                                    const p = projectBySlug.get(slug);
                                    if (!p) return null;
                                    const on = included.includes(slug);
                                    const hidden = new Set(
                                        over.projects.hiddenSubsections[slug] ??
                                            []
                                    );
                                    return (
                                        <li
                                            key={slug}
                                            className="rounded border border-(--color-border) p-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    aria-label={p.name}
                                                    checked={on}
                                                    onChange={(e) =>
                                                        setOrder(
                                                            e.target.checked
                                                                ? [
                                                                      ...included,
                                                                      slug,
                                                                  ]
                                                                : included.filter(
                                                                      (s) =>
                                                                          s !==
                                                                          slug
                                                                  )
                                                        )
                                                    }
                                                />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {p.name}
                                                </span>
                                                <span className="text-xs text-(--color-muted)">
                                                    {p.ai ? "AI · " : ""}
                                                    <LocalizedText
                                                        text={
                                                            p.type === "work"
                                                                ? "회사"
                                                                : p.type ===
                                                                    "personal"
                                                                  ? "개인"
                                                                  : "종류 미지정"
                                                        }
                                                    />
                                                </span>
                                                {on && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            aria-label={t(
                                                                "위로"
                                                            )}
                                                            onClick={() =>
                                                                move(slug, -1)
                                                            }
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label={t(
                                                                "아래로"
                                                            )}
                                                            onClick={() =>
                                                                move(slug, 1)
                                                            }
                                                        >
                                                            <ArrowDown className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {on && p.subsections.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-x-3 pl-6 text-xs">
                                                    {p.subsections.map(
                                                        (title) => (
                                                            <label
                                                                key={title}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        !hidden.has(
                                                                            title
                                                                        )
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const next =
                                                                            new Set(
                                                                                hidden
                                                                            );
                                                                        if (
                                                                            e
                                                                                .target
                                                                                .checked
                                                                        )
                                                                            next.delete(
                                                                                title
                                                                            );
                                                                        else
                                                                            next.add(
                                                                                title
                                                                            );
                                                                        setOver(
                                                                            (
                                                                                o
                                                                            ) => ({
                                                                                ...o,
                                                                                projects:
                                                                                    {
                                                                                        ...o.projects,
                                                                                        hiddenSubsections:
                                                                                            {
                                                                                                ...o
                                                                                                    .projects
                                                                                                    .hiddenSubsections,
                                                                                                [slug]: [
                                                                                                    ...next,
                                                                                                ],
                                                                                            },
                                                                                    },
                                                                            })
                                                                        );
                                                                    }}
                                                                />
                                                                {title}
                                                            </label>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            <Row
                                label="개인 프로젝트 압축 (설명·기술·링크만)"
                                checked={over.projects.compactPersonal}
                                onChange={(v) =>
                                    setOver((o) => ({
                                        ...o,
                                        projects: {
                                            ...o.projects,
                                            compactPersonal: v,
                                        },
                                    }))
                                }
                            />
                        </Group>
                        <Group title="세부 항목">
                            {(Object.keys(DETAIL_LABELS) as PdfDetailKey[]).map(
                                (k) => (
                                    <Row
                                        key={k}
                                        label={DETAIL_LABELS[k]}
                                        checked={over.details[k] ?? true}
                                        onChange={(v) =>
                                            setOver((o) => {
                                                const details = {
                                                    ...o.details,
                                                };
                                                if (v) delete details[k];
                                                else details[k] = false;
                                                return { ...o, details };
                                            })
                                        }
                                    />
                                )
                            )}
                            {defaults.core.length > 0 && (
                                <div className="mt-2 border-t border-(--color-border) pt-2">
                                    <p className="mb-1 text-xs font-bold">
                                        <LocalizedText text="핵심 역량" />
                                    </p>
                                    {defaults.core.map((c) => (
                                        <Row
                                            key={c.id}
                                            label={c.title}
                                            checked={!excludedCore.has(c.id)}
                                            onChange={(v) =>
                                                setOver((o) => {
                                                    const set = new Set(
                                                        o.details
                                                            .excludedCore ?? []
                                                    );
                                                    if (v) set.delete(c.id);
                                                    else set.add(c.id);
                                                    return {
                                                        ...o,
                                                        details: {
                                                            ...o.details,
                                                            excludedCore: [
                                                                ...set,
                                                            ],
                                                        },
                                                    };
                                                })
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </Group>
                    </div>
                )}

                {(error || failures.length > 0) && (
                    <div
                        role="alert"
                        className="rounded border border-red-500 p-2 text-sm text-red-600"
                    >
                        <p>{error}</p>
                        {failures.map((f) => (
                            <p key={f} className="text-xs">
                                {f}
                            </p>
                        ))}
                    </div>
                )}
                {warnings.length > 0 && (
                    <ul className="rounded border border-amber-500 p-2 text-xs">
                        {warnings.map((w, i) => (
                            <li key={`${w.code}-${i}`}>
                                <LocalizedText
                                    text={WARNING_LABELS[w.code] ?? w.code}
                                />
                                {w.detail ? `: ${w.detail}` : ""}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {pdfUrl && (
                        <a
                            href={pdfUrl}
                            download={fileName}
                            className="flex items-center gap-1 rounded border border-(--color-border) px-3 py-2 text-sm hover:border-(--color-accent)"
                        >
                            <Download className="h-4 w-4" />
                            <LocalizedText text="내려받기" />
                        </a>
                    )}
                    <button
                        type="button"
                        disabled={busy || !defaults}
                        onClick={() => void generate()}
                        className="flex items-center gap-1 rounded bg-(--color-accent) px-3 py-2 text-sm font-bold text-(--color-on-accent) disabled:opacity-50"
                    >
                        {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                        <LocalizedText
                            text={busy ? "만드는 중" : "PDF 만들기"}
                        />
                    </button>
                </div>
                {pdfUrl && (
                    <iframe
                        title={t("PDF 미리보기")}
                        src={pdfUrl}
                        className="h-[70vh] w-full rounded border border-(--color-border)"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
