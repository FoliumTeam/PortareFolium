"use client";

import { useEffect, useRef, useState } from "react";
import {
    addSiteJobField,
    deleteSiteJobField,
    getSiteConfigBootstrap,
    saveSiteConfig,
    updateSiteJobField,
} from "@/app/admin/actions/site-config";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { dedupeJobFieldsById } from "@/lib/job-field";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Check,
    ChevronDown,
    Globe2,
    Monitor,
    Moon,
    Palette,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Sun,
    Trash2,
} from "lucide-react";
import { COLOR_SCHEMES, type ColorScheme } from "@/lib/color-schemes";
import AdminSaveBar from "@/components/admin/AdminSaveBar";
import { normalizeThemeMode, type ThemeMode } from "@/lib/theme-mode";
import {
    getJobFieldSeoConfig,
    normalizeSeoConfig,
    type JobFieldSeoConfig,
} from "@/lib/seo-config";

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
    headerTitle?: string;
};

type SeoFormState = {
    defaultTitle: string;
    defaultDescription: string;
    defaultOgImage: string;
    jobFields: Record<string, JobFieldSeoConfig>;
};

const THEME_MODE_OPTIONS: {
    value: ThemeMode;
    title: string;
    description: string;
    Icon: typeof Sun;
}[] = [
    {
        value: "light",
        title: "라이트 고정",
        description: "모든 방문자에게 라이트 화면 표시",
        Icon: Sun,
    },
    {
        value: "dark",
        title: "다크 고정",
        description: "모든 방문자에게 다크 화면 표시",
        Icon: Moon,
    },
    {
        value: "system",
        title: "시스템 따름",
        description: "방문자의 기기 화면 모드에 맞춰 표시",
        Icon: Monitor,
    },
];

function parseSiteConfigValue(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function isJobFieldItem(value: unknown): value is JobFieldItem {
    if (!value || typeof value !== "object") return false;
    const item = value as Partial<JobFieldItem>;
    return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.emoji === "string"
    );
}

function normalizeJobFields(value: unknown): JobFieldItem[] {
    if (!Array.isArray(value)) return [];
    return dedupeJobFieldsById(value.filter(isJobFieldItem));
}

function ConfigSection({
    Icon,
    title,
    description,
    children,
}: {
    Icon: typeof Sun;
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

export default function SiteConfigPanel() {
    const { confirm } = useConfirmDialog();
    const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
        if (typeof document !== "undefined") {
            const attr =
                document.documentElement.getAttribute("data-color-scheme");
            if (attr) return attr as ColorScheme;
        }
        return "blue";
    });
    const [plainMode, setPlainMode] = useState<boolean>(() => {
        if (typeof document !== "undefined") {
            return document.documentElement.hasAttribute("data-plain");
        }
        return false;
    });
    const [themeMode, setThemeMode] = useState<ThemeMode>("system");
    const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
    const schemeDropdownRef = useRef<HTMLDivElement>(null);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [headerName, setHeaderName] = useState("");
    const [seoConfig, setSeoConfig] = useState<SeoFormState>({
        defaultTitle: "",
        defaultDescription: "포트폴리오 & 기술 블로그",
        defaultOgImage: "",
        jobFields: {},
    });
    const [githubUrl, setGithubUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // 새 job field 추가 폼 상태
    const [newName, setNewName] = useState("");
    const [newHeaderTitle, setNewHeaderTitle] = useState("");
    const [newEmoji, setNewEmoji] = useState("✨");
    const [inheritFrom, setInheritFrom] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [editingJobFieldId, setEditingJobFieldId] = useState<string | null>(
        null
    );
    const [editingName, setEditingName] = useState("");
    const [editingHeaderTitle, setEditingHeaderTitle] = useState("");
    const [editingEmoji, setEditingEmoji] = useState("");
    const [editingPickerOpen, setEditingPickerOpen] = useState(false);
    const editingPickerRef = useRef<HTMLDivElement>(null);

    // Supabase에서 현재 설정 로드
    useEffect(() => {
        getSiteConfigBootstrap().then(
            ({ rows }: { rows: { key: string; value: unknown }[] }) => {
                const ordered = [...rows].sort((a) =>
                    a.key === "site_name" ? -1 : 1
                );
                for (const row of ordered) {
                    const v = parseSiteConfigValue(row.value);
                    if (row.key === "color_scheme") {
                        setColorScheme(v as ColorScheme);
                        document.documentElement.setAttribute(
                            "data-color-scheme",
                            v as ColorScheme
                        );
                    }
                    if (row.key === "plain_mode") {
                        const plain = v === true || v === "true";
                        setPlainMode(plain);
                        localStorage.setItem(
                            "folium_plain_mode",
                            String(plain)
                        );
                        if (plain) {
                            document.documentElement.setAttribute(
                                "data-plain",
                                ""
                            );
                        } else {
                            document.documentElement.removeAttribute(
                                "data-plain"
                            );
                        }
                    }
                    if (row.key === "theme_mode") {
                        setThemeMode(normalizeThemeMode(v));
                    }
                    if (row.key === "job_fields")
                        setJobFields(normalizeJobFields(v));
                    if (row.key === "header_name" && typeof v === "string") {
                        setHeaderName(v);
                    }
                    if (row.key === "site_name" && typeof v === "string") {
                        setSeoConfig((prev) => ({ ...prev, defaultTitle: v }));
                    }
                    if (row.key === "seo_config") {
                        const seo = normalizeSeoConfig(v);
                        setSeoConfig((prev) => ({
                            ...prev,
                            defaultDescription: seo.defaultDescription,
                            defaultOgImage: seo.defaultOgImage,
                            jobFields: seo.jobFields,
                        }));
                    }
                    if (row.key === "github_url" && typeof v === "string") {
                        setGithubUrl(v);
                    }
                }
            }
        );
    }, []);

    // picker 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node)
            ) {
                setShowPicker(false);
            }
        };
        if (showPicker) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showPicker]);

    // 편집 emoji picker 외부 클릭 처리
    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (
                editingPickerRef.current &&
                !editingPickerRef.current.contains(event.target as Node)
            ) {
                setEditingPickerOpen(false);
            }
        };
        if (editingPickerOpen)
            document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [editingPickerOpen]);

    // 스킴 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                schemeDropdownRef.current &&
                !schemeDropdownRef.current.contains(e.target as Node)
            ) {
                setSchemeDropdownOpen(false);
            }
        };
        if (schemeDropdownOpen)
            document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [schemeDropdownOpen]);

    // job field 추가
    const handleAddJobField = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;

        setSaving(true);
        setStatus(null);

        const result = await addSiteJobField({
            name: trimmed,
            emoji: newEmoji,
            headerTitle: newHeaderTitle.trim(),
            inheritFrom,
        });

        setSaving(false);

        if (!result.success) {
            setStatus({ type: "error", msg: result.error });
            return;
        }

        setJobFields(dedupeJobFieldsById(result.jobFields));
        setNewName("");
        setNewHeaderTitle("");
        setNewEmoji("✨");
        setInheritFrom("");
        setStatus({ type: "success", msg: "직무 분야가 추가됐습니다" });
    };

    // job field 삭제 + cascade 처리
    const handleDeleteJobField = async (id: string) => {
        setSaving(true);
        setStatus(null);

        const result = await deleteSiteJobField(id);

        setSaving(false);

        if (!result.success) {
            setStatus({ type: "error", msg: result.error });
            return;
        }

        setJobFields(dedupeJobFieldsById(result.jobFields));
        setStatus({ type: "success", msg: "직무 분야가 삭제됐습니다" });
    };

    const handleUpdateJobField = async (id: string) => {
        const name = editingName.trim();
        if (!name) return;
        setSaving(true);
        setStatus(null);

        const result = await updateSiteJobField({
            id,
            name,
            emoji: editingEmoji,
            headerTitle: editingHeaderTitle,
        });

        setSaving(false);

        if (!result.success) {
            setStatus({ type: "error", msg: result.error });
            return;
        }

        setJobFields(dedupeJobFieldsById(result.jobFields));
        setEditingJobFieldId(null);
        setStatus({ type: "success", msg: "직무 분야가 수정됐습니다" });
    };

    const updateJobFieldSeo = (
        jobField: string,
        key: keyof JobFieldSeoConfig,
        value: string
    ) => {
        setSeoConfig((previous) => {
            const current = getJobFieldSeoConfig(
                {
                    defaultDescription: previous.defaultDescription,
                    defaultOgImage: previous.defaultOgImage,
                    jobFields: previous.jobFields,
                },
                jobField,
                {
                    title: previous.defaultTitle,
                    description: previous.defaultDescription,
                    ogImage: previous.defaultOgImage,
                }
            );

            return {
                ...previous,
                jobFields: {
                    ...previous.jobFields,
                    [jobField]: { ...current, [key]: value },
                },
            };
        });
    };

    // site_config 저장
    const handleSave = async () => {
        setSaving(true);
        setStatus(null);

        const result = await saveSiteConfig({
            headerName,
            colorScheme,
            plainMode,
            themeMode,
            seoConfig,
            githubUrl,
        });

        setSaving(false);

        if (!result.success) {
            setStatus({ type: "error", msg: result.error });
            return;
        }

        localStorage.setItem("folium_plain_mode", String(plainMode));
        setStatus({
            type: "success",
            msg: "설정이 저장됐습니다. 변경 사항이 사이트에 반영됐습니다.",
        });
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-(--color-border) pb-5">
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    Configuration
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-(--color-foreground)">
                    사이트 설정
                </h2>
                <p className="mt-2 text-sm text-(--color-muted)">
                    공개 사이트의 표현 방식과 프로필 기준을 한곳에서 관리합니다.
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-5">
                <div className="mx-auto max-w-6xl space-y-5 pb-8">
                    <ConfigSection
                        Icon={Palette}
                        title="대시보드 표현"
                        description="관리자 화면에서 사용할 색상과 단순 표시 방식을 선택합니다. 저장 전에도 현재 화면에서 바로 확인할 수 있습니다."
                    >
                        <div className="tablet:grid-cols-[minmax(0,1fr)_auto] grid gap-3">
                            {/* 스킴 드롭다운 */}
                            <div
                                className="relative rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-3"
                                ref={schemeDropdownRef}
                            >
                                <Label className="mb-2 block text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                    Color Scheme
                                </Label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSchemeDropdownOpen((v) => !v)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2.5 text-left transition-colors hover:border-(--color-accent)/50"
                                >
                                    <span
                                        className="h-4 w-4 shrink-0 rounded"
                                        style={{
                                            backgroundColor:
                                                COLOR_SCHEMES.find(
                                                    (s) =>
                                                        s.value === colorScheme
                                                )?.swatch ?? "#6b7280",
                                        }}
                                    />
                                    <span className="flex-1 text-sm font-medium text-(--color-foreground)">
                                        {COLOR_SCHEMES.find(
                                            (s) => s.value === colorScheme
                                        )?.label ?? colorScheme}
                                    </span>
                                    <ChevronDown
                                        className={`h-4 w-4 text-(--color-muted) transition-transform ${schemeDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {schemeDropdownOpen && (
                                    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg">
                                        {COLOR_SCHEMES.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setColorScheme(opt.value);
                                                    document.documentElement.setAttribute(
                                                        "data-color-scheme",
                                                        opt.value
                                                    );
                                                    setSchemeDropdownOpen(
                                                        false
                                                    );
                                                }}
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${colorScheme === opt.value ? "bg-(--color-accent)/10 font-semibold text-(--color-accent)" : "text-(--color-foreground) hover:bg-(--color-surface-subtle)"}`}
                                            >
                                                <span
                                                    className="h-3.5 w-3.5 shrink-0 rounded"
                                                    style={{
                                                        backgroundColor:
                                                            opt.swatch,
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                                <span className="ml-auto text-xs text-(--color-muted)">
                                                    {opt.desc}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* plain 모드 토글 */}
                            <div className="tablet:min-w-64 flex min-h-24 items-center justify-between gap-5 rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 px-4 py-3">
                                <span>
                                    <Label
                                        htmlFor="plain-toggle"
                                        className="text-sm font-semibold text-(--color-foreground)"
                                    >
                                        Plain
                                    </Label>
                                    <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                        장식 요소를 줄인 간결한 화면
                                    </span>
                                </span>
                                <Switch
                                    id="plain-toggle"
                                    checked={plainMode}
                                    onCheckedChange={(checked) => {
                                        setPlainMode(checked);
                                        if (checked) {
                                            document.documentElement.setAttribute(
                                                "data-plain",
                                                ""
                                            );
                                        } else {
                                            document.documentElement.removeAttribute(
                                                "data-plain"
                                            );
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </ConfigSection>

                    <ConfigSection
                        Icon={Monitor}
                        title="화면 모드"
                        description="공개 사이트 방문자에게 적용할 화면 모드 정책입니다."
                    >
                        <div className="laptop:grid-cols-3 grid gap-3">
                            {THEME_MODE_OPTIONS.map(
                                ({ value, title, description, Icon }) => {
                                    const selected = themeMode === value;
                                    const darkPreview = value === "dark";
                                    return (
                                        <label
                                            key={value}
                                            className={`group relative cursor-pointer rounded-2xl border p-4 transition-colors ${selected ? "border-(--color-accent) bg-(--color-accent)/8 ring-1 ring-(--color-accent)/30" : "border-(--color-border) bg-(--color-surface-subtle)/55 hover:border-(--color-accent)/50"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="theme-mode"
                                                value={value}
                                                checked={selected}
                                                onChange={() =>
                                                    setThemeMode(value)
                                                }
                                                className="sr-only"
                                            />
                                            <span
                                                className={`mb-4 flex h-20 items-center justify-center rounded-[1.25rem] border p-3 shadow-inner ${darkPreview ? "border-white/10 bg-[#1c1c1e]" : "border-zinc-200 bg-[#f2f2f7]"}`}
                                                aria-hidden="true"
                                            >
                                                <span
                                                    className={`flex h-11 w-11 items-center justify-center rounded-[14px] shadow-sm ${darkPreview ? "bg-[#2c2c2e] text-[#ff9f0a]" : "bg-white text-[#007aff]"}`}
                                                >
                                                    <Icon
                                                        className="h-6 w-6"
                                                        strokeWidth={1.8}
                                                    />
                                                </span>
                                            </span>
                                            <span className="flex items-start gap-2">
                                                <span
                                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-(--color-accent) bg-(--color-accent)" : "border-(--color-muted)"}`}
                                                >
                                                    {selected && (
                                                        <Check
                                                            className="h-3 w-3 text-white"
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-semibold text-(--color-foreground)">
                                                        {title}
                                                    </span>
                                                    <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                                        {description}
                                                    </span>
                                                </span>
                                            </span>
                                        </label>
                                    );
                                }
                            )}
                        </div>
                    </ConfigSection>

                    <ConfigSection
                        Icon={SlidersHorizontal}
                        title="헤더 브랜드"
                        description="공개 Header 홈 링크의 앞부분에 표시되는 전역 이름입니다. 직무 분야별 제목은 아래 프로필 관리에서 설정합니다."
                    >
                        <div className="max-w-xl rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                            <Label className="text-sm font-semibold text-(--color-foreground)">
                                헤더 이름
                            </Label>
                            <Input
                                value={headerName}
                                onChange={(event) =>
                                    setHeaderName(event.target.value)
                                }
                                placeholder="정호진"
                                className="mt-2 border-(--color-border) bg-(--color-surface)"
                            />
                        </div>
                    </ConfigSection>

                    <ConfigSection
                        Icon={Globe2}
                        title="직무 분야 프로필"
                        description="각 분야는 독립된 공개 URL과 Resume, Portfolio, Blog, About me 기준을 가집니다."
                    >
                        <div className="laptop:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] grid gap-4">
                            <div className="space-y-3">
                                {jobFields.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-subtle)/55 px-5 py-10 text-center text-sm text-(--color-muted)">
                                        아직 등록된 직무 분야가 없습니다
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {jobFields.map((field) => {
                                            const isEditing =
                                                editingJobFieldId === field.id;
                                            const headerTitle =
                                                field.headerTitle ?? field.name;

                                            return (
                                                <article
                                                    key={field.id}
                                                    className={`relative rounded-2xl border transition-colors ${editingPickerOpen && isEditing ? "overflow-visible" : "overflow-hidden"} ${isEditing ? "border-(--color-accent) bg-(--color-accent)/6 ring-1 ring-(--color-accent)/20" : "border-(--color-border) bg-(--color-surface-subtle)/55 hover:border-(--color-accent)/45"}`}
                                                >
                                                    <div className="tablet:p-5 flex items-start gap-4 p-4">
                                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-(--color-border) bg-(--color-surface) text-2xl shadow-sm">
                                                            {field.emoji}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-base font-semibold text-(--color-foreground)">
                                                                    {field.name}
                                                                </p>
                                                                <span className="rounded-full bg-green-500/12 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                                                    공개 프로필
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm text-(--color-muted)">
                                                                <code className="rounded-md bg-(--color-surface) px-1.5 py-0.5 font-mono text-xs text-(--color-foreground)">
                                                                    /{field.id}
                                                                </code>
                                                                <span className="ml-2">
                                                                    독립 공개
                                                                    경로
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => {
                                                                    setEditingJobFieldId(
                                                                        field.id
                                                                    );
                                                                    setEditingName(
                                                                        field.name
                                                                    );
                                                                    setEditingHeaderTitle(
                                                                        headerTitle
                                                                    );
                                                                    setEditingEmoji(
                                                                        field.emoji
                                                                    );
                                                                    setEditingPickerOpen(
                                                                        false
                                                                    );
                                                                }}
                                                                disabled={
                                                                    saving
                                                                }
                                                                className="bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                                                            >
                                                                <Pencil
                                                                    size={13}
                                                                />
                                                                수정
                                                            </Button>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                disabled={
                                                                    saving
                                                                }
                                                                onClick={async () => {
                                                                    const ok =
                                                                        await confirm(
                                                                            {
                                                                                title: "직무 분야 삭제",
                                                                                description: `"${field.name}" 직무 분야를 정말 삭제하시겠습니까?`,
                                                                                confirmText:
                                                                                    "삭제",
                                                                                cancelText:
                                                                                    "취소",
                                                                                variant:
                                                                                    "destructive",
                                                                            }
                                                                        );
                                                                    if (!ok)
                                                                        return;
                                                                    handleDeleteJobField(
                                                                        field.id
                                                                    );
                                                                }}
                                                                className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                                            >
                                                                <Trash2
                                                                    size={13}
                                                                />
                                                                삭제
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="tablet:grid-cols-2 grid gap-px border-y border-(--color-border) bg-(--color-border)">
                                                        <div className="tablet:px-5 bg-(--color-surface) px-4 py-3">
                                                            <p className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                                Header 미리보기
                                                            </p>
                                                            <p className="mt-1.5 text-sm font-semibold text-(--color-foreground)">
                                                                [{" "}
                                                                {headerName.trim() ||
                                                                    "헤더 이름"}{" "}
                                                                · {headerTitle}{" "}
                                                                ]
                                                            </p>
                                                        </div>
                                                        <div className="tablet:px-5 bg-(--color-surface) px-4 py-3">
                                                            <p className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                                적용 범위
                                                            </p>
                                                            <p className="mt-1.5 text-sm text-(--color-muted)">
                                                                Home · About ·
                                                                Resume ·
                                                                Portfolio · Blog
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {isEditing && (
                                                        <div className="tablet:p-5 space-y-4 bg-(--color-accent)/5 p-4">
                                                            <div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-(--color-foreground)">
                                                                        프로필
                                                                        편집
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-(--color-muted)">
                                                                        Header
                                                                        표시와
                                                                        공개 URL
                                                                        기준
                                                                        정보
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="tablet:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] grid gap-3">
                                                                <div>
                                                                    <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                                        Emoji
                                                                    </Label>
                                                                    <div
                                                                        className="relative mt-2"
                                                                        ref={
                                                                            editingPickerRef
                                                                        }
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setEditingPickerOpen(
                                                                                    (
                                                                                        open
                                                                                    ) =>
                                                                                        !open
                                                                                )
                                                                            }
                                                                            aria-label="직무 분야 이모지 선택"
                                                                            aria-expanded={
                                                                                editingPickerOpen
                                                                            }
                                                                            className="flex h-10 w-full items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface) text-xl transition-colors hover:border-(--color-accent)/50"
                                                                        >
                                                                            {
                                                                                editingEmoji
                                                                            }
                                                                        </button>
                                                                        {editingPickerOpen && (
                                                                            <div className="absolute top-12 left-0 z-50">
                                                                                <Picker
                                                                                    data={
                                                                                        data
                                                                                    }
                                                                                    onEmojiSelect={(emoji: {
                                                                                        native: string;
                                                                                    }) => {
                                                                                        setEditingEmoji(
                                                                                            emoji.native
                                                                                        );
                                                                                        setEditingPickerOpen(
                                                                                            false
                                                                                        );
                                                                                    }}
                                                                                    locale="ko"
                                                                                    previewPosition="none"
                                                                                    skinTonePosition="none"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                                        프로필
                                                                        이름
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            editingName
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setEditingName(
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        aria-label="직무 분야 이름"
                                                                        className="mt-2 bg-(--color-surface)"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                                        Header
                                                                        제목
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            editingHeaderTitle
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setEditingHeaderTitle(
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        aria-label="헤더 직무 제목"
                                                                        placeholder="게임 개발자"
                                                                        className="mt-2 bg-(--color-surface)"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setEditingJobFieldId(
                                                                            null
                                                                        );
                                                                        setEditingPickerOpen(
                                                                            false
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                >
                                                                    취소
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleUpdateJobField(
                                                                            field.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        saving ||
                                                                        !editingName.trim() ||
                                                                        !editingHeaderTitle.trim()
                                                                    }
                                                                    className="bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                                                                >
                                                                    저장
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <aside className="tablet:p-6 h-fit rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-5">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-accent) text-white">
                                        <Plus className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-base font-semibold text-(--color-foreground)">
                                            새 프로필
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                                            이름과 Header 제목을 정한 뒤 기존
                                            분야의 콘텐츠를 선택적으로
                                            상속합니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="relative"
                                            ref={pickerRef}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPicker((v) => !v)
                                                }
                                                className="flex h-12 w-12 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface) text-2xl transition-colors hover:border-(--color-accent)/50"
                                            >
                                                {newEmoji}
                                            </button>
                                            {showPicker && (
                                                <div className="absolute top-14 left-0 z-50">
                                                    <Picker
                                                        data={data}
                                                        onEmojiSelect={(emoji: {
                                                            native: string;
                                                        }) => {
                                                            setNewEmoji(
                                                                emoji.native
                                                            );
                                                            setShowPicker(
                                                                false
                                                            );
                                                        }}
                                                        locale="ko"
                                                        previewPosition="none"
                                                        skinTonePosition="none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                프로필 이름
                                            </Label>
                                            <Input
                                                value={newName}
                                                onChange={(e) =>
                                                    setNewName(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        handleAddJobField();
                                                }}
                                                placeholder="직무 분야 이름"
                                                className="mt-2 border-(--color-border) bg-(--color-surface)"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                            Header 제목
                                        </Label>
                                        <Input
                                            value={newHeaderTitle}
                                            onChange={(event) =>
                                                setNewHeaderTitle(
                                                    event.target.value
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter")
                                                    handleAddJobField();
                                            }}
                                            aria-label="새 직무 분야 헤더 제목"
                                            placeholder="예: 게임 개발자"
                                            className="mt-2 border-(--color-border) bg-(--color-surface)"
                                        />
                                    </div>

                                    {jobFields.length > 0 && (
                                        <div>
                                            <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                상속 시작점
                                            </Label>
                                            <select
                                                value={inheritFrom}
                                                onChange={(e) =>
                                                    setInheritFrom(
                                                        e.target.value
                                                    )
                                                }
                                                className="mt-2 h-11 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                                            >
                                                <option
                                                    value=""
                                                    className="bg-(--color-surface) text-(--color-foreground)"
                                                >
                                                    없음
                                                </option>
                                                {jobFields.map((f) => (
                                                    <option
                                                        key={f.id}
                                                        value={f.id}
                                                        className="bg-(--color-surface) text-(--color-foreground)"
                                                    >
                                                        {f.emoji} {f.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleAddJobField}
                                        disabled={
                                            saving ||
                                            !newName.trim() ||
                                            !newHeaderTitle.trim()
                                        }
                                        className="w-full bg-(--color-accent) text-white hover:bg-(--color-accent)/85"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        프로필 추가
                                    </Button>
                                </div>
                            </aside>
                        </div>
                    </ConfigSection>

                    <ConfigSection
                        Icon={Search}
                        title="SEO 기본값"
                        description="공통 기본값과 직무 분야별 검색·공유 metadata를 관리합니다. 직무 분야 값은 해당 공개 경로 전체에 우선 적용됩니다."
                    >
                        <p className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                            공통 기본값
                        </p>
                        <div className="tablet:grid-cols-2 grid gap-3">
                            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                                <Label className="text-sm font-semibold text-(--color-foreground)">
                                    기본 사이트 제목 (Title)
                                </Label>
                                <Input
                                    value={seoConfig.defaultTitle}
                                    onChange={(e) =>
                                        setSeoConfig({
                                            ...seoConfig,
                                            defaultTitle: e.target.value,
                                        })
                                    }
                                    className="mt-2 border-(--color-border) bg-(--color-surface)"
                                />
                            </div>
                            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                                <Label className="text-sm font-semibold text-(--color-foreground)">
                                    기본 사이트 설명 (Description)
                                </Label>
                                <textarea
                                    value={seoConfig.defaultDescription}
                                    onChange={(e) =>
                                        setSeoConfig({
                                            ...seoConfig,
                                            defaultDescription: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="mt-2 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                                />
                            </div>
                            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                                <Label className="text-sm font-semibold text-(--color-foreground)">
                                    기본 OG 이미지 URL
                                </Label>
                                <Input
                                    value={seoConfig.defaultOgImage}
                                    onChange={(e) =>
                                        setSeoConfig({
                                            ...seoConfig,
                                            defaultOgImage: e.target.value,
                                        })
                                    }
                                    placeholder="https://..."
                                    className="mt-2 border-(--color-border) bg-(--color-surface)"
                                />
                            </div>
                            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4">
                                <Label className="text-sm font-semibold text-(--color-foreground)">
                                    GitHub URL
                                </Label>
                                <Input
                                    value={githubUrl}
                                    onChange={(e) =>
                                        setGithubUrl(e.target.value)
                                    }
                                    placeholder="https://github.com/username"
                                    className="mt-2 border-(--color-border) bg-(--color-surface)"
                                />
                            </div>
                        </div>
                        {jobFields.length > 0 && (
                            <div className="space-y-4 border-t border-(--color-border) pt-5">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                        직무 분야별 SEO
                                    </p>
                                    <p className="mt-1 text-sm text-(--color-muted)">
                                        비워 둔 값은 공통 기본값을 사용합니다.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {jobFields.map((field) => {
                                        const fieldSeo = getJobFieldSeoConfig(
                                            {
                                                defaultDescription:
                                                    seoConfig.defaultDescription,
                                                defaultOgImage:
                                                    seoConfig.defaultOgImage,
                                                jobFields: seoConfig.jobFields,
                                            },
                                            field.id,
                                            {
                                                title: seoConfig.defaultTitle,
                                                description:
                                                    seoConfig.defaultDescription,
                                                ogImage:
                                                    seoConfig.defaultOgImage,
                                            }
                                        );

                                        return (
                                            <div
                                                key={field.id}
                                                className="tablet:p-5 rounded-xl border border-(--color-border) bg-(--color-surface-subtle)/55 p-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface) text-xl">
                                                        {field.emoji}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-(--color-foreground)">
                                                            {field.name} SEO
                                                        </p>
                                                        <p className="mt-1 text-xs text-(--color-muted)">
                                                            /{field.id} 공개
                                                            경로 전체
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="tablet:grid-cols-2 mt-4 grid gap-3">
                                                    <div>
                                                        <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                            제목
                                                        </Label>
                                                        <Input
                                                            value={
                                                                fieldSeo.title
                                                            }
                                                            onChange={(event) =>
                                                                updateJobFieldSeo(
                                                                    field.id,
                                                                    "title",
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                            className="mt-2 bg-(--color-surface)"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                            OG 이미지 URL
                                                        </Label>
                                                        <Input
                                                            value={
                                                                fieldSeo.ogImage
                                                            }
                                                            onChange={(event) =>
                                                                updateJobFieldSeo(
                                                                    field.id,
                                                                    "ogImage",
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="https://..."
                                                            className="mt-2 bg-(--color-surface)"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <Label className="text-xs font-semibold tracking-wide text-(--color-muted) uppercase">
                                                        설명
                                                    </Label>
                                                    <textarea
                                                        value={
                                                            fieldSeo.description
                                                        }
                                                        onChange={(event) =>
                                                            updateJobFieldSeo(
                                                                field.id,
                                                                "description",
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        rows={3}
                                                        className="mt-2 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </ConfigSection>

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
                                &apos;저장&apos; 버튼을 누르면 다른
                                사용자들에게도 배포됩니다.
                            </span>
                        )}
                        <Button
                            variant="default"
                            onClick={handleSave}
                            disabled={saving}
                            className="shrink-0 bg-green-500 px-8 text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            {saving ? "저장 중..." : "설정 저장"}
                        </Button>
                    </AdminSaveBar>
                </div>
            </div>
        </div>
    );
}
