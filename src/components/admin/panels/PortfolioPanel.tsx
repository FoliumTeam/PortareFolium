import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import ThumbnailUploadField from "@/components/admin/ThumbnailUploadField";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";

interface PortfolioItem {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail: string | null;
    content: string;
    data: Record<string, unknown>;
    featured: boolean;
    order_idx: number;
    published: boolean;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
}

interface ItemForm {
    slug: string;
    title: string;
    description: string;
    tags: string;
    thumbnail: string;
    content: string;
    featured: boolean;
    order_idx: number;
    published: boolean;
    // data 필드 (구조화된 메타데이터)
    startDate: string;
    endDate: string;
    goal: string;
    role: string;
    teamSize: string;
    github: string;
    liveUrl: string;
    jobField: string[];
    meta_title: string;
    meta_description: string;
    og_image: string;
}

const EMPTY_FORM: ItemForm = {
    slug: "",
    title: "",
    description: "",
    tags: "",
    thumbnail: "",
    content: "",
    featured: false,
    order_idx: 0,
    published: true,
    startDate: "",
    endDate: "",
    goal: "",
    role: "",
    teamSize: "",
    github: "",
    liveUrl: "",
    jobField: [],
    meta_title: "",
    meta_description: "",
    og_image: "",
};

function toSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

/** PortfolioItem의 data JSONB에서 폼 필드를 추출한다 */
function itemToForm(item: PortfolioItem): ItemForm {
    const d = item.data ?? {};
    return {
        slug: item.slug,
        title: item.title,
        description: item.description ?? "",
        tags: item.tags.join(", "),
        thumbnail: item.thumbnail ?? "",
        content: item.content,
        featured: item.featured,
        order_idx: item.order_idx,
        published: item.published,
        startDate: (d.startDate as string) ?? "",
        endDate: (d.endDate as string) ?? "",
        goal: (d.goal as string) ?? "",
        role: (d.role as string) ?? "",
        teamSize: String(d.teamSize ?? ""),
        github: (d.github as string) ?? "",
        liveUrl: (d.liveUrl as string) ?? "",
        jobField: Array.isArray(d.jobField)
            ? (d.jobField as string[])
            : d.jobField
              ? [d.jobField as string]
              : [],
        meta_title: item.meta_title ?? "",
        meta_description: item.meta_description ?? "",
        og_image: item.og_image ?? "",
    };
}

// 타임스탬프 포맷 (초 단위)
function fmtTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export default function PortfolioPanel() {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<PortfolioItem | null | "new">(
        null
    );
    const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);

    const initialFormRef = useRef<ItemForm>(EMPTY_FORM);

    // dirty 상태
    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { confirmLeave } = useUnsavedWarning(isDirty);

    const loadItems = async () => {
        if (!browserClient) return;
        setLoading(true);
        const { data, error: err } = await browserClient
            .from("portfolio_items")
            .select("*")
            .order("order_idx");
        if (err) setError(err.message);
        else setItems(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        loadItems();
        if (browserClient) {
            browserClient
                .from("site_config")
                .select("value")
                .eq("key", "job_fields")
                .single()
                .then(({ data }) => {
                    if (data?.value) setJobFields(data.value as JobFieldItem[]);
                });
        }
    }, []);

    // form → DB payload 변환
    const buildPayload = () => ({
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        thumbnail: form.thumbnail || null,
        content: form.content,
        featured: form.featured,
        order_idx: form.order_idx,
        published: form.published,
        job_field: form.jobField.length ? form.jobField : null,
        data: {
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            goal: form.goal || undefined,
            role: form.role || undefined,
            teamSize: form.teamSize ? Number(form.teamSize) : undefined,
            github: form.github || undefined,
            liveUrl: form.liveUrl || undefined,
            jobField: form.jobField.length ? form.jobField : undefined,
        },
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    });

    const openEdit = (item: PortfolioItem) => {
        const f = itemToForm(item);
        initialFormRef.current = f;
        setForm(f);
        setEditTarget(item);
        setError(null);
        setSuccess(null);
        setSavedAt(null);
    };

    const openNew = () => {
        const base = { ...EMPTY_FORM, order_idx: items.length };
        initialFormRef.current = base;
        setForm(base);
        setEditTarget("new");
        setError(null);
        setSuccess(null);
        setSavedAt(null);
    };

    // 자동 저장 (DB에 직접 저장)
    const autoSave = async () => {
        if (!browserClient || !form.title || !form.slug) return;
        const payload = buildPayload();
        if (editTarget === "new") {
            // 신규: insert 후 editTarget을 실제 item으로 전환
            const { data: newItem, error: err } = await browserClient
                .from("portfolio_items")
                .insert(payload)
                .select("*")
                .single();
            if (!err && newItem) {
                initialFormRef.current = form;
                setEditTarget(newItem);
                setSavedAt(new Date());
            }
        } else if (editTarget !== null) {
            const { error: err } = await browserClient
                .from("portfolio_items")
                .update(payload)
                .eq("id", (editTarget as PortfolioItem).id);
            if (!err) {
                initialFormRef.current = form;
                setSavedAt(new Date());
            }
        }
    };

    useAutoSave(isDirty, editTarget !== null, autoSave);

    // 수동 저장 (신규 insert / 수정 update)
    const handleSave = async () => {
        if (!browserClient || !form.title || !form.slug) {
            setError("제목과 slug는 필수입니다.");
            return;
        }
        setSaving(true);
        setError(null);

        const payload = buildPayload();
        let err;
        if (editTarget === "new") {
            ({ error: err } = await browserClient
                .from("portfolio_items")
                .insert(payload));
        } else {
            ({ error: err } = await browserClient
                .from("portfolio_items")
                .update(payload)
                .eq("id", (editTarget as PortfolioItem).id));
        }

        setSaving(false);
        if (err) {
            setError(err.message);
        } else {
            initialFormRef.current = form;
            setSavedAt(null);
            setSuccess("수동 저장 완료 " + fmtTime(new Date()));
            loadItems();
            if (editTarget === "new") setEditTarget(null);
        }
    };

    // 목록으로 이탈 (dirty 확인 포함)
    const handleBack = () => {
        if (confirmLeave()) setEditTarget(null);
    };

    const handleDelete = async (id: string) => {
        if (!browserClient || !confirm("정말 삭제하시겠습니까?")) return;
        await browserClient.from("portfolio_items").delete().eq("id", id);
        loadItems();
    };

    const toggleFeatured = async (item: PortfolioItem) => {
        if (!browserClient) return;
        await browserClient
            .from("portfolio_items")
            .update({ featured: !item.featured })
            .eq("id", item.id);
        loadItems();
    };

    // ── 편집 화면 ─────────────────────────────────────────────
    if (editTarget !== null) {
        const field = (
            key: keyof ItemForm,
            label: string,
            opts?: {
                mono?: boolean;
                type?: string;
                rows?: number;
                placeholder?: string;
            }
        ) => (
            <div>
                <label className="mb-1 block text-base font-medium text-(--color-muted)">
                    {label}
                </label>
                {opts?.rows ? (
                    <textarea
                        value={form[key] as string}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        rows={opts.rows}
                        placeholder={opts.placeholder}
                        className={`w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none ${opts.mono ? "font-mono" : ""}`}
                    />
                ) : (
                    <input
                        type={opts?.type ?? "text"}
                        value={form[key] as string}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        placeholder={opts?.placeholder}
                        className={`w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none ${opts?.mono ? "font-mono" : ""}`}
                    />
                )}
            </div>
        );

        return (
            <div className="w-full max-w-5xl">
                <button
                    onClick={handleBack}
                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-lg text-(--color-muted) transition-colors hover:border-(--color-accent) hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                >
                    ← 목록
                </button>
                <h2 className="mt-6 text-3xl font-bold text-(--color-foreground)">
                    {editTarget === "new" ? "새 포트폴리오" : "포트폴리오 편집"}
                </h2>

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            제목 *
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => {
                                const t = e.target.value;
                                setForm((f) => ({
                                    ...f,
                                    title: t,
                                    slug: f.slug || toSlug(t),
                                }));
                            }}
                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                        />
                    </div>
                    <div>{field("slug", "Slug *", { mono: true })}</div>
                    <JobFieldSelector
                        value={form.jobField}
                        fields={jobFields}
                        onChange={(v) =>
                            setForm((f) => ({ ...f, jobField: v }))
                        }
                    />
                    {field("description", "요약", { rows: 2 })}
                    {field("tags", "키워드/태그 (쉼표 구분)", {
                        placeholder: "Next.js, React, TypeScript",
                    })}
                    <ThumbnailUploadField
                        value={form.thumbnail}
                        onChange={(url) =>
                            setForm((f) => ({ ...f, thumbnail: url }))
                        }
                        placeholder="파일 업로드 또는 URL 입력"
                        folderPath={`portfolio/${form.slug || "untitled"}`}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        {field("startDate", "시작일", {
                            placeholder: "2024-01-01",
                        })}
                        {field("endDate", "종료일", {
                            placeholder: "2024-06-01 (진행 중이면 비워두세요)",
                        })}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {field("role", "역할", {
                            placeholder: "풀스택 개발 (리드)",
                        })}
                        {field("teamSize", "팀 규모", {
                            type: "number",
                            placeholder: "1",
                        })}
                    </div>
                    {field("goal", "목표/기획 의도", { rows: 2 })}
                    <div className="grid grid-cols-2 gap-4">
                        {field("github", "GitHub URL", { mono: true })}
                        {field("liveUrl", "라이브 URL", { mono: true })}
                    </div>

                    {/* SEO 설정 (선택사항) */}
                    <details className="group rounded-lg border border-(--color-border) bg-(--color-surface-subtle) open:bg-(--color-surface)">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)">
                            <span>SEO 설정 (선택사항)</span>
                            <span className="text-(--color-muted) transition-transform group-open:rotate-180">
                                ▼
                            </span>
                        </summary>
                        <div className="space-y-4 border-t border-(--color-border) p-4">
                            {field("meta_title", "SEO 제목 (Meta Title)", {
                                placeholder:
                                    "비워두면 프로젝트 제목이 사용됩니다",
                            })}
                            {field(
                                "meta_description",
                                "SEO 설명 (Meta Description)",
                                {
                                    rows: 2,
                                    placeholder:
                                        "비워두면 프로젝트 요약이 사용됩니다",
                                }
                            )}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                    소셜 공유 이미지 (OG Image)
                                </label>
                                <ThumbnailUploadField
                                    value={form.og_image}
                                    onChange={(url) =>
                                        setForm((f) => ({
                                            ...f,
                                            og_image: url,
                                        }))
                                    }
                                    placeholder="비워두면 썸네일 혹은 전역 설정이 사용됩니다"
                                    folderPath={`portfolio/${form.slug || "untitled"}`}
                                />
                            </div>
                        </div>
                    </details>

                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            본문 (Markdown)
                        </label>
                        <RichMarkdownEditor
                            value={form.content}
                            onChange={(c) =>
                                setForm((f) => ({ ...f, content: c }))
                            }
                            placeholder="본문을 작성하세요. ## 제목, **굵게** 등 마크다운 문법이 즉시 반영됩니다."
                            folderPath={`portfolio/${form.slug || "untitled"}`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        featured: e.target.checked,
                                    }))
                                }
                                className="h-4 w-4 accent-(--color-accent)"
                            />
                            <span className="text-base font-medium text-(--color-foreground)">
                                랜딩 페이지에 노출 (featured)
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.published}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        published: e.target.checked,
                                    }))
                                }
                                className="h-4 w-4 accent-(--color-accent)"
                            />
                            <span className="text-base font-medium text-(--color-foreground)">
                                Publish
                            </span>
                        </label>
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-base text-red-500 dark:bg-red-950/30">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p className="rounded-lg bg-green-50 px-3 py-2 text-base text-green-600 dark:bg-green-950/30">
                            {success}
                        </p>
                    )}
                    {savedAt && (
                        <p className="rounded-lg bg-green-50 px-3 py-2 text-base text-green-600 dark:bg-green-950/30">
                            {"자동 저장 완료 " + fmtTime(savedAt)}
                        </p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                            className="rounded-lg bg-(--color-accent) px-5 py-2 text-base font-semibold text-(--color-on-accent) hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? "저장 중..." : "저장"}
                        </button>
                        <button
                            onClick={handleBack}
                            className="rounded-lg border border-(--color-border) px-5 py-2 text-base font-medium text-(--color-muted) hover:text-(--color-foreground)"
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 목록 화면 ─────────────────────────────────────────────
    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-(--color-foreground)">
                    포트폴리오
                </h2>
                <button
                    onClick={openNew}
                    className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold text-(--color-on-accent) hover:opacity-90"
                >
                    + 새 항목
                </button>
            </div>

            {error && <p className="mb-4 text-base text-red-500">{error}</p>}
            {loading ? (
                <p className="text-base text-(--color-muted)">불러오는 중...</p>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-accent)/50"
                        >
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                    {item.featured && (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-sm font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                            ★ featured
                                        </span>
                                    )}
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-sm font-medium ${item.published ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"}`}
                                    >
                                        {item.published ? "Published" : "Draft"}
                                    </span>
                                </div>
                                <p className="truncate text-base font-semibold text-(--color-foreground)">
                                    {item.title}
                                </p>
                                <p className="font-mono text-sm text-(--color-muted)">
                                    {item.slug}
                                </p>
                                <JobFieldBadges
                                    value={
                                        item.data?.jobField as
                                            | string
                                            | string[]
                                            | null
                                            | undefined
                                    }
                                    fields={jobFields}
                                />
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    onClick={() => toggleFeatured(item)}
                                    className="rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    {item.featured
                                        ? "featured 해제"
                                        : "featured"}
                                </button>
                                <button
                                    onClick={() => openEdit(item)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    편집
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
