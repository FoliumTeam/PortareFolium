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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Check,
    ChevronDown,
    Monitor,
    Moon,
    Pencil,
    Plus,
    Sun,
    Trash2,
} from "lucide-react";
import { COLOR_SCHEMES, type ColorScheme } from "@/lib/color-schemes";
import AdminSaveBar from "@/components/admin/AdminSaveBar";
import { normalizeThemeMode, type ThemeMode } from "@/lib/theme-mode";

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
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
    const [seoConfig, setSeoConfig] = useState({
        defaultTitle: "",
        defaultDescription: "포트폴리오 & 기술 블로그",
        defaultOgImage: "",
    });
    const [githubUrl, setGithubUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // 새 job field 추가 폼 상태
    const [newName, setNewName] = useState("");
    const [newEmoji, setNewEmoji] = useState("✨");
    const [inheritFrom, setInheritFrom] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [editingJobFieldId, setEditingJobFieldId] = useState<string | null>(
        null
    );
    const [editingName, setEditingName] = useState("");
    const [editingEmoji, setEditingEmoji] = useState("");

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
                    if (row.key === "site_name" && typeof v === "string") {
                        setSeoConfig((prev) => ({ ...prev, defaultTitle: v }));
                    }
                    if (row.key === "seo_config") {
                        setSeoConfig((prev) => ({
                            ...prev,
                            defaultDescription:
                                (v as { default_description?: string })
                                    .default_description ||
                                "포트폴리오 & 기술 블로그",
                            defaultOgImage:
                                (v as { default_og_image?: string })
                                    .default_og_image || "",
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
            inheritFrom,
        });

        setSaving(false);

        if (!result.success) {
            setStatus({ type: "error", msg: result.error });
            return;
        }

        setJobFields(dedupeJobFieldsById(result.jobFields));
        setNewName("");
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

    // site_config 저장
    const handleSave = async () => {
        setSaving(true);
        setStatus(null);

        const result = await saveSiteConfig({
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
            <div className="shrink-0 pb-3">
                <h2 className="text-3xl font-bold text-(--color-foreground)">
                    사이트 설정
                </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-8">
                    {/* Color Scheme */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-(--color-foreground)">
                            Color Scheme
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            새로운 테마를 선택하면 대시보드 화면에 즉시
                            반영되며, '설정 저장' 버튼을 누르면 다른
                            사용자들에게도 배포됩니다.
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* 스킴 드롭다운 */}
                            <div
                                className="relative flex-1"
                                ref={schemeDropdownRef}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSchemeDropdownOpen((v) => !v)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg border border-(--color-border) px-3 py-2.5 text-left transition-colors hover:border-(--color-accent)/50"
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
                            <div className="flex shrink-0 items-center gap-2">
                                <Label
                                    htmlFor="plain-toggle"
                                    className="text-sm text-(--color-muted)"
                                >
                                    Plain
                                </Label>
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
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-(--color-foreground)">
                                화면 모드
                            </h3>
                            <p className="mt-1 text-sm text-(--color-muted)">
                                공개 사이트 방문자에게 적용할 화면 모드
                                정책입니다.
                            </p>
                        </div>
                        <div className="laptop:grid-cols-3 grid gap-3">
                            {THEME_MODE_OPTIONS.map(
                                ({ value, title, description, Icon }) => {
                                    const selected = themeMode === value;
                                    const darkPreview = value === "dark";
                                    return (
                                        <label
                                            key={value}
                                            className={`group relative cursor-pointer rounded-2xl border p-4 transition-colors ${selected ? "border-(--color-accent) bg-(--color-accent)/8 ring-1 ring-(--color-accent)/30" : "border-(--color-border) bg-(--color-surface) hover:border-(--color-accent)/50"}`}
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
                    </section>

                    <Separator />

                    {/* 직무 분야 관리 */}
                    <section className="space-y-5">
                        <h3 className="text-lg font-semibold text-(--color-foreground)">
                            직무 분야 관리
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            공개 URL과 Resume, Portfolio, Blog, About me의 필터
                            기준입니다. 등록된 분야마다 독립된 공개 프로필을
                            제공합니다.
                        </p>

                        <div className="laptop:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] grid gap-4">
                            <div className="space-y-4">
                                {jobFields.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-5 py-8 text-sm text-(--color-muted)">
                                        등록된 직무 분야가 없습니다
                                    </div>
                                ) : (
                                    <div className="tablet:grid-cols-2 grid gap-3">
                                        {jobFields.map((field) => {
                                            const isEditing =
                                                editingJobFieldId === field.id;

                                            return (
                                                <div
                                                    key={field.id}
                                                    className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[28%] bg-(--color-surface-subtle) text-2xl shadow-sm">
                                                            {field.emoji}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-(--color-foreground)">
                                                                {field.name}
                                                            </p>
                                                            <p className="mt-1 font-mono text-xs text-(--color-muted)">
                                                                {field.id}
                                                            </p>
                                                            <p className="mt-3 text-sm text-(--color-muted)">
                                                                /{field.id}에서
                                                                독립 공개 프로필
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-(--color-border) pt-3">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setEditingJobFieldId(
                                                                    field.id
                                                                );
                                                                setEditingName(
                                                                    field.name
                                                                );
                                                                setEditingEmoji(
                                                                    field.emoji
                                                                );
                                                            }}
                                                            disabled={saving}
                                                        >
                                                            <Pencil size={13} />
                                                            수정
                                                        </Button>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            disabled={saving}
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
                                                                if (!ok) return;
                                                                handleDeleteJobField(
                                                                    field.id
                                                                );
                                                            }}
                                                            className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                                        >
                                                            <Trash2 size={13} />
                                                            삭제
                                                        </Button>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="mt-3 grid grid-cols-[3rem_1fr_auto] gap-2 border-t border-(--color-border) pt-3">
                                                            <Input
                                                                value={
                                                                    editingEmoji
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditingEmoji(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                aria-label="직무 분야 이모지"
                                                            />
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
                                                            />
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleUpdateJobField(
                                                                        field.id
                                                                    )
                                                                }
                                                                disabled={
                                                                    saving ||
                                                                    !editingName.trim()
                                                                }
                                                            >
                                                                저장
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                                        새 직무 분야 추가
                                    </p>
                                    <p className="text-sm text-(--color-muted)">
                                        새 이름과 emoji를 정한 뒤 필요하면 기존
                                        분야를 상속해서 시작합니다.
                                    </p>
                                </div>

                                <div className="mt-4 space-y-3">
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
                                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-surface-subtle) text-2xl transition-colors hover:border-(--color-accent)/50"
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
                                            className="flex-1 border-(--color-border)"
                                        />
                                    </div>

                                    {jobFields.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-(--color-muted)">
                                                상속 시작점
                                            </Label>
                                            <select
                                                value={inheritFrom}
                                                onChange={(e) =>
                                                    setInheritFrom(
                                                        e.target.value
                                                    )
                                                }
                                                className="h-11 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
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
                                        disabled={saving || !newName.trim()}
                                        className="w-full bg-green-500 text-white hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        추가
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* 글로벌 SEO 설정 */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-(--color-foreground)">
                            글로벌 SEO 기본값
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            개별 포스트나 포트폴리오에 SEO 설정이 없을 때
                            사용되는 기본값입니다.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-sm font-medium text-(--color-muted)">
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
                                    className="border-(--color-border)"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-(--color-muted)">
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
                                    className="w-full rounded-md border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-(--color-muted)">
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
                                    className="border-(--color-border)"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-(--color-muted)">
                                    GitHub URL
                                </Label>
                                <Input
                                    value={githubUrl}
                                    onChange={(e) =>
                                        setGithubUrl(e.target.value)
                                    }
                                    placeholder="https://github.com/username"
                                    className="border-(--color-border)"
                                />
                            </div>
                        </div>
                    </section>

                    <Separator />

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
