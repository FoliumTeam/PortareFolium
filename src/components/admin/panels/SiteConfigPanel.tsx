"use client";

import { useEffect, useRef, useState } from "react";
import {
    revalidateHome,
    revalidateLayout,
    revalidateResume,
} from "@/app/admin/actions/revalidate";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { browserClient } from "@/lib/supabase";
import { normalizeJobFieldValue } from "@/lib/job-field";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { COLOR_SCHEMES, type ColorScheme } from "@/lib/color-schemes";
import AdminSaveBar from "@/components/admin/AdminSaveBar";

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
};

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
    const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
    const schemeDropdownRef = useRef<HTMLDivElement>(null);
    const [activeJobField, setActiveJobField] = useState<string>("");
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
    const activeField =
        jobFields.find((field) => field.id === activeJobField) ?? null;

    // Supabase에서 현재 설정 로드
    useEffect(() => {
        if (!browserClient) return;
        browserClient
            .from("site_config")
            .select("key, value")
            .in("key", [
                "color_scheme",
                "plain_mode",
                "job_field",
                "job_fields",
                "site_name",
                "seo_config",
                "github_url",
            ])
            .then(({ data: rows }) => {
                if (!rows) return;
                const ordered = [...rows].sort((a) =>
                    a.key === "site_name" ? -1 : 1
                );
                for (const row of ordered) {
                    const v =
                        typeof row.value === "string"
                            ? JSON.parse(row.value)
                            : row.value;
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
                    if (row.key === "job_field")
                        setActiveJobField(normalizeJobFieldValue(v as string));
                    if (row.key === "job_fields")
                        setJobFields(v as JobFieldItem[]);
                    if (row.key === "site_name" && typeof v === "string") {
                        setSeoConfig((prev) => ({ ...prev, defaultTitle: v }));
                    }
                    if (row.key === "seo_config") {
                        setSeoConfig((prev) => ({
                            ...prev,
                            defaultDescription:
                                v.default_description ||
                                "포트폴리오 & 기술 블로그",
                            defaultOgImage: v.default_og_image || "",
                        }));
                    }
                    if (row.key === "github_url" && typeof v === "string") {
                        setGithubUrl(v);
                    }
                }
            });
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

    // job_fields + job_field upsert
    const saveJobFields = async (
        fields: JobFieldItem[],
        active: string
    ): Promise<boolean> => {
        if (!browserClient) return false;
        const { error } = await browserClient.from("site_config").upsert(
            [
                {
                    key: "job_fields",
                    value: fields,
                },
                {
                    key: "job_field",
                    value: active,
                },
            ],
            { onConflict: "key" }
        );
        return !error;
    };

    // parentId job_field를 가진 모든 항목에 newId 추가
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addFieldToItems = (jf: any, parentId: string, newId: string): any => {
        if (!jf) return jf;
        if (Array.isArray(jf))
            return jf.includes(parentId) ? [...jf, newId] : jf;
        return jf === parentId ? [jf, newId] : jf;
    };

    // 상속 cascade: parentId를 가진 posts, portfolio_items.data, resume_data 항목에 newId 추가
    const applyInheritance = async (parentId: string, newId: string) => {
        if (!browserClient) return;

        // posts.job_field 업데이트 (TEXT 또는 TEXT[] 모두 처리)
        const { data: allPosts } = await browserClient
            .from("posts")
            .select("id, job_field");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postsToUpdate = ((allPosts ?? []) as any[]).filter((p) => {
            const jf = p.job_field;
            if (!jf) return false;
            return Array.isArray(jf) ? jf.includes(parentId) : jf === parentId;
        });
        if (postsToUpdate.length) {
            await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                postsToUpdate.map((p: any) => {
                    const jf = p.job_field;
                    const existing: string[] = Array.isArray(jf)
                        ? jf
                        : jf
                          ? [jf]
                          : [];
                    return (
                        browserClient!
                            .from("posts")
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .update({ job_field: [...existing, newId] } as any)
                            .eq("id", p.id)
                    );
                })
            );
        }

        // portfolio_items.data.jobField (JSONB) 업데이트
        const { data: portfolioData } = await browserClient
            .from("portfolio_items")
            .select("id, data");
        if (portfolioData?.length) {
            const toUpdate = (
                portfolioData as { id: string; data: Record<string, unknown> }[]
            ).filter((item) => {
                const jf = item.data?.jobField;
                if (!jf) return false;
                if (Array.isArray(jf)) return jf.includes(parentId);
                return jf === parentId;
            });
            await Promise.all(
                toUpdate.map((item) => {
                    const jf = item.data?.jobField;
                    const existing: string[] = Array.isArray(jf)
                        ? (jf as string[])
                        : jf
                          ? [jf as string]
                          : [];
                    return browserClient!
                        .from("portfolio_items")
                        .update({
                            data: {
                                ...item.data,
                                jobField: [...existing, newId],
                            },
                        })
                        .eq("id", item.id);
                })
            );
        }

        // resume_data work + projects (lang=ko) 업데이트
        const { data: resumeRow } = await browserClient
            .from("resume_data")
            .select("id, data")
            .eq("lang", "ko")
            .single();
        if (resumeRow?.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resume = resumeRow.data as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedWork = (resume.work ?? []).map((w: any) => ({
                ...w,
                jobField: addFieldToItems(w.jobField, parentId, newId),
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedProjects = (resume.projects ?? []).map((p: any) => ({
                ...p,
                jobField: addFieldToItems(p.jobField, parentId, newId),
            }));
            await browserClient
                .from("resume_data")
                .update({
                    data: {
                        ...resume,
                        work: updatedWork,
                        projects: updatedProjects,
                    },
                })
                .eq("id", resumeRow.id);
        }
    };

    // job field 추가
    const handleAddJobField = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const id = trimmed.toLowerCase().replace(/\s+/g, "-");
        if (jobFields.some((f) => f.id === id)) {
            setStatus({ type: "error", msg: `"${id}" ID가 이미 존재합니다` });
            return;
        }
        const next = [...jobFields, { id, name: trimmed, emoji: newEmoji }];
        const ok = await saveJobFields(next, activeJobField);
        if (!ok) {
            setStatus({ type: "error", msg: "저장 실패" });
            return;
        }
        setJobFields(next);
        await revalidateHome();
        await revalidateResume();
        if (inheritFrom) await applyInheritance(inheritFrom, id);
        setNewName("");
        setNewEmoji("✨");
        setInheritFrom("");
        setStatus({ type: "success", msg: "직무 분야가 추가됐습니다" });
    };

    // job field 삭제 + cascade 처리 (TEXT[] 기준)
    const handleDeleteJobField = async (id: string) => {
        if (!browserClient) return;

        // posts.job_field cascade (TEXT 또는 TEXT[] 모두 처리)
        const { data: allPosts } = await browserClient
            .from("posts")
            .select("id, job_field");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postsWithField = ((allPosts ?? []) as any[]).filter((p) => {
            const jf = p.job_field;
            if (!jf) return false;
            return Array.isArray(jf) ? jf.includes(id) : jf === id;
        });
        if (postsWithField.length) {
            await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                postsWithField.map((p: any) => {
                    const jf = p.job_field;
                    const next = Array.isArray(jf)
                        ? jf.filter((f: string) => f !== id)
                        : [];
                    return (
                        browserClient!
                            .from("posts")
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .update({
                                job_field: next.length ? next : null,
                            } as any)
                            .eq("id", p.id)
                    );
                })
            );
        }

        // portfolio_items.job_field 컬럼 + data.jobField (JSONB) cascade
        const { data: allPortfolio } = await browserClient
            .from("portfolio_items")
            .select("id, job_field, data");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const portfolioToUpdate = ((allPortfolio ?? []) as any[]).filter(
            (p) => {
                const col = p.job_field;
                const jsonb = p.data?.jobField;
                const inCol = col
                    ? Array.isArray(col)
                        ? col.includes(id)
                        : col === id
                    : false;
                const inJsonb = jsonb
                    ? Array.isArray(jsonb)
                        ? jsonb.includes(id)
                        : jsonb === id
                    : false;
                return inCol || inJsonb;
            }
        );
        if (portfolioToUpdate.length) {
            await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                portfolioToUpdate.map((p: any) => {
                    const col = p.job_field;
                    const nextCol = Array.isArray(col)
                        ? col.filter((f: string) => f !== id)
                        : [];
                    const jf = p.data?.jobField;
                    const nextJf = Array.isArray(jf)
                        ? jf.filter((f: string) => f !== id)
                        : jf === id
                          ? []
                          : jf;
                    return (
                        browserClient!
                            .from("portfolio_items")
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .update({
                                job_field: nextCol.length ? nextCol : null,
                                data: {
                                    ...p.data,
                                    jobField: nextJf?.length
                                        ? nextJf
                                        : undefined,
                                },
                            } as any)
                            .eq("id", p.id)
                    );
                })
            );
        }

        // resume_data work + projects (lang=ko) cascade
        const { data: resumeRow } = await browserClient
            .from("resume_data")
            .select("id, data")
            .eq("lang", "ko")
            .single();
        if (resumeRow?.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resume = resumeRow.data as any;
            const removeField = (jf: string | string[] | undefined) => {
                if (!jf) return jf;
                if (Array.isArray(jf)) {
                    const next = jf.filter((f) => f !== id);
                    return next.length ? next : undefined;
                }
                return jf === id ? undefined : jf;
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedWork = (resume.work ?? []).map((w: any) => ({
                ...w,
                jobField: removeField(w.jobField),
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedProjects = (resume.projects ?? []).map((p: any) => ({
                ...p,
                jobField: removeField(p.jobField),
            }));
            await browserClient
                .from("resume_data")
                .update({
                    data: {
                        ...resume,
                        work: updatedWork,
                        projects: updatedProjects,
                    },
                })
                .eq("id", resumeRow.id);
        }

        const next = jobFields.filter((f) => f.id !== id);
        const nextActive =
            activeJobField === id ? (next[0]?.id ?? "") : activeJobField;
        const ok = await saveJobFields(next, nextActive);
        if (ok) {
            setJobFields(next);
            setActiveJobField(nextActive);
            setStatus({ type: "success", msg: "직무 분야가 삭제됐습니다" });
            await revalidateHome();
            await revalidateResume();
        } else {
            setStatus({ type: "error", msg: "삭제 실패" });
        }
    };

    // active job field 변경 (즉시 저장)
    const handleSelectJobField = async (id: string) => {
        setActiveJobField(id);
        if (!browserClient) return;
        await browserClient
            .from("site_config")
            .upsert([{ key: "job_field", value: id }], {
                onConflict: "key",
            });
        await revalidateHome();
        await revalidateResume();
    };

    // site_config upsert (색상 + SEO)
    const handleSave = async () => {
        if (!browserClient) return;
        setSaving(true);
        setStatus(null);

        const rows = [
            { key: "color_scheme", value: JSON.stringify(colorScheme) },
            { key: "plain_mode", value: plainMode },
            // site_name: 사이트명 단일 출처
            { key: "site_name", value: JSON.stringify(seoConfig.defaultTitle) },
            {
                key: "seo_config",
                value: {
                    default_description: seoConfig.defaultDescription,
                    default_og_image: seoConfig.defaultOgImage,
                },
            },
            { key: "github_url", value: JSON.stringify(githubUrl.trim()) },
        ];

        const { error } = await browserClient
            .from("site_config")
            .upsert(rows, { onConflict: "key" });

        if (!error) {
            localStorage.setItem("folium_plain_mode", String(plainMode));
            await revalidateHome();
            await revalidateResume();
            await revalidateLayout();
        }

        setSaving(false);
        setStatus(
            error
                ? { type: "error", msg: error.message }
                : {
                      type: "success",
                      msg: "설정이 저장됐습니다. 변경 사항이 사이트에 반영됐습니다.",
                  }
        );
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

                    {/* 직무 분야 관리 */}
                    <section className="space-y-5">
                        <h3 className="text-lg font-semibold text-(--color-foreground)">
                            이력서 직무 분야
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            Resume / Portfolio 페이지에서 이 값으로 항목을
                            필터링합니다. 기본으로 사용할 직무 분야를 먼저
                            선택하고, 아래에서 새 분야를 추가하세요.
                        </p>

                        <div className="laptop:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] grid gap-4">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                                                현재 활성 직무 분야
                                            </p>
                                            {activeField ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[28%] bg-(--color-surface) text-2xl shadow-sm">
                                                        {activeField.emoji}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-base font-semibold text-(--color-foreground)">
                                                            {activeField.name}
                                                        </p>
                                                        <p className="text-sm text-(--color-muted)">
                                                            {activeField.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-(--color-muted)">
                                                    아직 기본 직무 분야가
                                                    선택되지 않았습니다
                                                </p>
                                            )}
                                        </div>
                                        {activeField && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white dark:bg-green-600">
                                                <Check className="h-3.5 w-3.5" />
                                                기본 선택
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {jobFields.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-5 py-8 text-sm text-(--color-muted)">
                                        등록된 직무 분야가 없습니다
                                    </div>
                                ) : (
                                    <div className="tablet:grid-cols-2 grid gap-3">
                                        {jobFields.map((field) => {
                                            const isActive =
                                                activeJobField === field.id;

                                            return (
                                                <div
                                                    key={field.id}
                                                    className={`rounded-2xl border p-4 transition-colors ${
                                                        isActive
                                                            ? "border-(--color-accent) bg-(--color-accent)/8"
                                                            : "border-(--color-border) bg-(--color-surface)"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span
                                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[28%] text-2xl shadow-sm ${
                                                                isActive
                                                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                                                    : "bg-(--color-surface-subtle)"
                                                            }`}
                                                        >
                                                            {field.emoji}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-semibold text-(--color-foreground)">
                                                                    {field.name}
                                                                </p>
                                                                {isActive && (
                                                                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-green-600">
                                                                        현재
                                                                        사용 중
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 font-mono text-xs text-(--color-muted)">
                                                                {field.id}
                                                            </p>
                                                            <p className="mt-3 text-sm text-(--color-muted)">
                                                                {isActive
                                                                    ? "Resume / Portfolio 기본 필터로 사용 중"
                                                                    : "이 분야를 기본 직무 분야로 전환"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-(--color-border) pt-3">
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleSelectJobField(
                                                                    field.id
                                                                )
                                                            }
                                                            disabled={isActive}
                                                            className="bg-green-500 text-white hover:bg-green-400 disabled:bg-green-500/60 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                        >
                                                            {isActive
                                                                ? "선택됨"
                                                                : "기본으로 선택"}
                                                        </Button>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
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
                                        disabled={!newName.trim()}
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
