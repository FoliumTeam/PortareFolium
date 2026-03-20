"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import {
    Eye,
    EyeOff,
    Star,
    StarOff,
    ArrowUpAZ,
    ArrowDownAZ,
    CalendarArrowDown,
    CalendarArrowUp,
    Pencil,
    Trash2,
    AlertTriangle,
    ChevronDown,
    Settings,
} from "lucide-react";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import {
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import MetadataSheet from "@/components/admin/MetadataSheet";
import SaveIndicator from "@/components/admin/SaveIndicator";
import BooksSubPanel from "@/components/admin/panels/BooksSubPanel";

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

// PortfolioItem의 data JSONB에서 폼 필드를 추출
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

export default function PortfolioPanel() {
    const [tab, setTab] = useState<"portfolio" | "books">("portfolio");
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<PortfolioItem | null | "new">(
        null
    );
    const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [activeJobField, setActiveJobField] = useState<string>("");
    // MetadataSheet 상태
    const [metadataOpen, setMetadataOpen] = useState(false);

    const initialFormRef = useRef<ItemForm>(EMPTY_FORM);

    // 정렬 + 필터 + 선택 상태
    const [sortKey, setSortKey] = useState<string>(
        () =>
            (typeof window !== "undefined"
                ? localStorage.getItem("portfolio_sort")
                : null) ?? "order_idx"
    );
    const [filterStatus, setFilterStatus] = useState<
        "all" | "published" | "draft"
    >("all");
    const [filterJobField, setFilterJobField] = useState("");
    const [filterSearch, setFilterSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [batchJobField, setBatchJobField] = useState("");
    const [batchSaving, setBatchSaving] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    // 토스트 알림
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const setSortAndSave = (key: string) => {
        setSortKey(key);
        localStorage.setItem("portfolio_sort", key);
        setShowSortMenu(false);
    };

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
            browserClient
                .from("site_config")
                .select("value")
                .eq("key", "job_field")
                .single()
                .then(({ data }) => {
                    if (data?.value && typeof data.value === "string")
                        setActiveJobField(data.value);
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
    };

    const openNew = () => {
        const base: ItemForm = {
            ...EMPTY_FORM,
            order_idx: items.length,
            jobField: activeJobField ? [activeJobField] : [],
        };
        initialFormRef.current = base;
        setForm(base);
        setEditTarget("new");
        setError(null);
        setSuccess(null);
    };

    // 자동 저장 (DB에 직접 저장)
    const autoSave = async () => {
        if (!browserClient || !form.title || !form.slug) return;
        const payload = buildPayload();
        if (editTarget === "new") {
            const { data: newItem, error: err } = await browserClient
                .from("portfolio_items")
                .insert(payload)
                .select("*")
                .single();
            if (!err && newItem) {
                initialFormRef.current = form;
                setEditTarget(newItem);
            }
        } else if (editTarget !== null) {
            const { error: err } = await browserClient
                .from("portfolio_items")
                .update(payload)
                .eq("id", (editTarget as PortfolioItem).id);
            if (!err) {
                initialFormRef.current = form;
            }
        }
    };

    const { savedAt: autoSavedAt, saving: autoSaving } = useAutoSave(
        isDirty,
        editTarget !== null,
        autoSave
    );

    // 수동 저장 (신규 insert / 수정 update)
    const handleSave = useCallback(async () => {
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
            setSuccess("저장 완료");
            loadItems();
            if (editTarget === "new") setEditTarget(null);
        }
    }, [form, editTarget]);

    useKeyboardSave(handleSave);

    // 목록으로 이탈 (dirty 확인 포함)
    const handleBack = () => {
        if (confirmLeave()) {
            setEditTarget(null);
            setMetadataOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!browserClient || !confirm("정말 삭제하시겠습니까?")) return;
        await browserClient.from("portfolio_items").delete().eq("id", id);
        if (
            editTarget !== null &&
            editTarget !== "new" &&
            editTarget.id === id
        ) {
            setEditTarget(null);
        }
        loadItems();
    };

    const togglePublish = async (item: PortfolioItem) => {
        if (!browserClient) return;
        await browserClient
            .from("portfolio_items")
            .update({ published: !item.published })
            .eq("id", item.id);
        loadItems();
    };

    const toggleFeatured = async (item: PortfolioItem) => {
        if (!browserClient) return;
        if (!item.featured) {
            const featuredCount = items.filter((i) => i.featured).length;
            if (featuredCount >= 5) {
                showToast("Featured 항목은 최대 5개까지만 설정할 수 있습니다.");
                return;
            }
        }
        await browserClient
            .from("portfolio_items")
            .update({ featured: !item.featured })
            .eq("id", item.id);
        loadItems();
    };

    // MetadataSheet onChange 핸들러
    const handleMetaChange = (field: string, value: unknown) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    // 발행 상태 즉시 저장 (Sheet 토글 시 DB 직접 반영)
    const handlePublishToggle = async (published: boolean) => {
        if (!browserClient || editTarget === null || editTarget === "new")
            return;
        await browserClient
            .from("portfolio_items")
            .update({ published })
            .eq("id", editTarget.id);
        setItems((prev) =>
            prev.map((p) => (p.id === editTarget.id ? { ...p, published } : p))
        );
    };

    // ── 편집 화면 (Ghost 에디터 레이아웃) ──
    if (editTarget !== null) {
        return (
            <div className="flex w-full max-w-6xl flex-col pb-20">
                {/* 헤더 */}
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        ← 목록
                    </button>
                    <button
                        onClick={() => setMetadataOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        <Settings size={15} />
                        설정
                    </button>
                </div>

                {/* 제목 입력 */}
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
                    placeholder="프로젝트 이름을 입력하세요"
                    className="w-full border-none bg-transparent py-4 text-3xl font-bold text-(--color-foreground) placeholder:text-(--color-muted) focus:outline-none"
                />

                {/* 본문 에디터 */}
                <div className="min-h-[400px] flex-1">
                    <RichMarkdownEditor
                        value={form.content}
                        onChange={(c) => setForm((f) => ({ ...f, content: c }))}
                        placeholder="본문을 작성하세요. ## 제목, **굵게** 등 마크다운 문법이 즉시 반영됩니다."
                        folderPath={`portfolio/${form.slug || "untitled"}`}
                    />
                </div>

                {/* 피드백 */}
                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-950/30">
                        {error}
                    </p>
                )}
                {success && (
                    <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-950/30">
                        {success}
                    </p>
                )}

                {/* Sticky 저장 바 */}
                <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-(--color-border) bg-(--color-surface)/90 px-6 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                        <SaveIndicator
                            saving={autoSaving}
                            savedAt={autoSavedAt}
                            isDirty={isDirty}
                        />
                        <div className="flex items-center gap-3">
                            {editTarget !== "new" && (
                                <button
                                    onClick={() =>
                                        handleDelete(
                                            (editTarget as PortfolioItem).id
                                        )
                                    }
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    삭제
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className="rounded-lg bg-(--color-accent) px-5 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* MetadataSheet */}
                <MetadataSheet
                    open={metadataOpen}
                    onOpenChange={setMetadataOpen}
                    type="portfolio"
                    form={form}
                    onChange={handleMetaChange}
                    onPublishToggle={handlePublishToggle}
                    jobFields={jobFields}
                    folderPath={`portfolio/${form.slug || "untitled"}`}
                />
            </div>
        );
    }

    // ── 목록 화면 ──

    // 정렬 + 필터 적용
    const displayedItems = items
        .filter((item) => {
            if (filterStatus === "published" && !item.published) return false;
            if (filterStatus === "draft" && item.published) return false;
            if (filterJobField) {
                const jf = item.data?.jobField as string | string[] | undefined;
                if (!jf) return false;
                const arr = Array.isArray(jf) ? jf : [jf];
                if (!arr.includes(filterJobField)) return false;
            }
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (
                    !item.title.toLowerCase().includes(q) &&
                    !item.slug.includes(q)
                )
                    return false;
            }
            return true;
        })
        .sort((a, b) => {
            switch (sortKey) {
                case "title_az":
                    return a.title.localeCompare(b.title);
                case "title_za":
                    return b.title.localeCompare(a.title);
                case "published_first":
                    return (b.published ? 1 : 0) - (a.published ? 1 : 0);
                case "draft_first":
                    return (a.published ? 1 : 0) - (b.published ? 1 : 0);
                case "featured_first":
                    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
                default:
                    return a.order_idx - b.order_idx;
            }
        });

    const allSelected =
        displayedItems.length > 0 &&
        displayedItems.every((i) => selected.has(i.id));
    const someSelected = selected.size > 0;

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) setSelected(new Set());
        else setSelected(new Set(displayedItems.map((i) => i.id)));
    };

    const batchPublish = async (publish: boolean) => {
        if (!browserClient || selected.size === 0) return;
        setBatchSaving(true);
        await browserClient
            .from("portfolio_items")
            .update({ published: publish })
            .in("id", [...selected]);
        setBatchSaving(false);
        setSelected(new Set());
        loadItems();
        showToast(
            `${selected.size}개 항목을 ${publish ? "Published" : "Draft"}로 변경했습니다.`
        );
    };

    const batchSetJobField = async () => {
        if (!browserClient || selected.size === 0 || !batchJobField) return;
        setBatchSaving(true);
        const selectedItems = items.filter((i) => selected.has(i.id));
        await Promise.all(
            selectedItems.map((item) =>
                browserClient!
                    .from("portfolio_items")
                    .update({
                        data: { ...item.data, jobField: [batchJobField] },
                    })
                    .eq("id", item.id)
            )
        );
        setBatchSaving(false);
        setSelected(new Set());
        setBatchJobField("");
        loadItems();
        showToast(`${selected.size}개 항목의 직무 분야를 변경했습니다.`);
    };

    const SORT_LABELS: Record<string, string> = {
        order_idx: "순서 (기본)",
        title_az: "제목 A→Z",
        title_za: "제목 Z→A",
        published_first: "Published 먼저",
        draft_first: "Draft 먼저",
        featured_first: "Featured 먼저",
    };

    const featuredCount = items.filter((i) => i.featured).length;

    return (
        <div>
            {/* 탭 */}
            <div className="mb-6 flex gap-1 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-1">
                {(
                    [
                        { key: "portfolio", label: "포트폴리오" },
                        { key: "books", label: "도서" },
                    ] as const
                ).map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            tab === key
                                ? "bg-(--color-surface) text-(--color-foreground) shadow-sm"
                                : "text-(--color-muted) hover:text-(--color-foreground)"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "books" && (
                <BooksSubPanel
                    jobFields={jobFields}
                    activeJobField={activeJobField}
                />
            )}

            {tab === "portfolio" && (
                <div>
                    {/* 헤더 */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-(--color-foreground)">
                                포트폴리오
                            </h2>
                            <p className="mt-0.5 text-sm text-(--color-muted)">
                                Featured: {featuredCount}/5
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* 보기 방식 설정 */}
                            <button
                                onClick={openNew}
                                className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold whitespace-nowrap text-(--color-on-accent) hover:opacity-90"
                            >
                                + 새 항목
                            </button>
                        </div>
                    </div>

                    {/* 필터 + 정렬 */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            placeholder="제목 또는 slug 검색"
                            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                        />
                        <select
                            value={filterStatus}
                            onChange={(e) =>
                                setFilterStatus(
                                    e.target.value as
                                        | "all"
                                        | "published"
                                        | "draft"
                                )
                            }
                            className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:outline-none"
                        >
                            <option value="all">전체</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                        {jobFields.length > 0 && (
                            <select
                                value={filterJobField}
                                onChange={(e) =>
                                    setFilterJobField(e.target.value)
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:outline-none"
                            >
                                <option value="">직무 분야 전체</option>
                                {jobFields.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.emoji} {f.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {/* 정렬 드롭다운 */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowSortMenu((v) => !v)}
                                className="flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm font-medium text-(--color-foreground) hover:bg-(--color-surface-subtle)"
                            >
                                {sortKey === "title_az" ? (
                                    <ArrowUpAZ size={14} />
                                ) : sortKey === "title_za" ? (
                                    <ArrowDownAZ size={14} />
                                ) : sortKey.includes("date_desc") ? (
                                    <CalendarArrowDown size={14} />
                                ) : sortKey.includes("date_asc") ? (
                                    <CalendarArrowUp size={14} />
                                ) : null}
                                {SORT_LABELS[sortKey]}
                                <ChevronDown size={14} />
                            </button>
                            {showSortMenu && (
                                <div className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg">
                                    {Object.entries(SORT_LABELS).map(
                                        ([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() =>
                                                    setSortAndSave(key)
                                                }
                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-(--color-surface-subtle) ${sortKey === key ? "font-semibold text-(--color-accent)" : "text-(--color-foreground)"}`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 배치 액션 바 */}
                    {someSelected && (
                        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-(--color-accent)/30 bg-(--color-surface-subtle) px-4 py-3">
                            <span className="text-sm font-medium text-(--color-foreground)">
                                {selected.size}개 선택됨
                            </span>
                            <button
                                type="button"
                                onClick={() => batchPublish(true)}
                                disabled={batchSaving}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white hover:opacity-90 disabled:opacity-50"
                            >
                                <Eye size={13} /> Publish
                            </button>
                            <button
                                type="button"
                                onClick={() => batchPublish(false)}
                                disabled={batchSaving}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white hover:opacity-90 disabled:opacity-50"
                            >
                                <EyeOff size={13} /> Unpublish
                            </button>
                            {jobFields.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={batchJobField}
                                        onChange={(e) =>
                                            setBatchJobField(e.target.value)
                                        }
                                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-sm text-(--color-foreground)"
                                    >
                                        <option value="">직무 분야 선택</option>
                                        {jobFields.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.emoji} {f.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={batchSetJobField}
                                        disabled={batchSaving || !batchJobField}
                                        className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) hover:opacity-90 disabled:opacity-50"
                                    >
                                        적용
                                    </button>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelected(new Set())}
                                className="ml-auto text-sm text-(--color-muted) hover:text-(--color-foreground)"
                            >
                                선택 해제
                            </button>
                        </div>
                    )}

                    {error && (
                        <p className="mb-4 text-base text-red-500">{error}</p>
                    )}
                    {loading ? (
                        <p className="text-base text-(--color-muted)">
                            불러오는 중...
                        </p>
                    ) : displayedItems.length === 0 ? (
                        <p className="text-base text-(--color-muted)">
                            {items.length === 0
                                ? "항목이 없습니다."
                                : "필터 조건에 맞는 항목이 없습니다."}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {/* 전체 선택 행 */}
                            <div className="flex items-center gap-3 px-2 pb-1">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 cursor-pointer rounded"
                                />
                                <span className="text-sm text-(--color-muted)">
                                    전체 선택 ({displayedItems.length}개)
                                </span>
                            </div>
                            {displayedItems.map((item) => {
                                const jf = item.data?.jobField as
                                    | string
                                    | string[]
                                    | undefined;
                                const hasJobField =
                                    !!jf &&
                                    (Array.isArray(jf) ? jf.length > 0 : true);
                                const tags = item.tags ?? [];
                                return (
                                    <div
                                        key={item.id}
                                        className={`group flex items-center gap-3 border-b border-(--color-border) px-2 py-3 transition-colors hover:bg-(--color-surface-subtle) ${
                                            selected.has(item.id)
                                                ? "bg-(--color-surface-subtle)"
                                                : ""
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(item.id)}
                                            onChange={() =>
                                                toggleSelect(item.id)
                                            }
                                            className="h-4 w-4 flex-shrink-0 cursor-pointer rounded"
                                        />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {item.featured && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                                        <Star size={10} />{" "}
                                                        Featured
                                                    </span>
                                                )}
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        item.published
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                                    }`}
                                                >
                                                    {item.published ? (
                                                        <Eye size={10} />
                                                    ) : (
                                                        <EyeOff size={10} />
                                                    )}
                                                    {item.published
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>
                                                {!hasJobField && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                                        <AlertTriangle
                                                            size={10}
                                                        />
                                                        직무 분야 없음
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-sm font-semibold text-(--color-foreground)">
                                                {item.title}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs text-(--color-muted)">
                                                    {item.slug}
                                                </span>
                                                <JobFieldBadges
                                                    value={
                                                        jf as
                                                            | string
                                                            | string[]
                                                            | null
                                                            | undefined
                                                    }
                                                    fields={jobFields}
                                                />
                                                {tags.slice(0, 3).map((t) => (
                                                    <span
                                                        key={t}
                                                        className="rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {tags.length > 3 && (
                                                    <span className="text-xs text-(--color-muted)">
                                                        +{tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={() =>
                                                    toggleFeatured(item)
                                                }
                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                                    item.featured
                                                        ? "bg-slate-500"
                                                        : "bg-indigo-600"
                                                }`}
                                            >
                                                {item.featured ? (
                                                    <StarOff size={12} />
                                                ) : (
                                                    <Star size={12} />
                                                )}
                                                {item.featured
                                                    ? "Featured 해제"
                                                    : "Featured"}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    togglePublish(item)
                                                }
                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                                    item.published
                                                        ? "bg-amber-500"
                                                        : "bg-green-600"
                                                }`}
                                            >
                                                {item.published ? (
                                                    <EyeOff size={12} />
                                                ) : (
                                                    <Eye size={12} />
                                                )}
                                                {item.published
                                                    ? "Unpublish"
                                                    : "Publish"}
                                            </button>
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                            >
                                                <Pencil size={12} />
                                                편집
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(item.id)
                                                }
                                                className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                            >
                                                <Trash2 size={12} />
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 토스트 알림 */}
                    {toast && (
                        <div className="fixed right-6 bottom-6 z-[100] rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
                            {toast}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
