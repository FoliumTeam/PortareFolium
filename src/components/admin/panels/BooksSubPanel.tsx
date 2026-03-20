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

interface BookItem {
    id: string;
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    content: string;
    rating: number | null;
    tags: string[];
    job_field: string[];
    published: boolean;
    featured: boolean;
    order_idx: number;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
}

interface BookForm {
    slug: string;
    title: string;
    author: string;
    cover_url: string;
    description: string;
    content: string;
    rating: number | null;
    tags: string;
    jobField: string[];
    published: boolean;
    featured: boolean;
    order_idx: number;
    meta_title: string;
    meta_description: string;
    og_image: string;
}

const EMPTY_FORM: BookForm = {
    slug: "",
    title: "",
    author: "",
    cover_url: "",
    description: "",
    content: "",
    rating: null,
    tags: "",
    jobField: [],
    published: true,
    featured: false,
    order_idx: 0,
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

function itemToForm(item: BookItem): BookForm {
    return {
        slug: item.slug,
        title: item.title,
        author: item.author ?? "",
        cover_url: item.cover_url ?? "",
        description: item.description ?? "",
        content: item.content,
        rating: item.rating,
        tags: item.tags.join(", "),
        jobField: item.job_field ?? [],
        published: item.published,
        featured: item.featured,
        order_idx: item.order_idx,
        meta_title: item.meta_title ?? "",
        meta_description: item.meta_description ?? "",
        og_image: item.og_image ?? "",
    };
}

export default function BooksSubPanel({
    jobFields,
    activeJobField = "",
}: {
    jobFields: JobFieldItem[];
    activeJobField?: string;
}) {
    const [books, setBooks] = useState<BookItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<BookItem | null | "new">(null);
    const [form, setForm] = useState<BookForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [metadataOpen, setMetadataOpen] = useState(false);

    const initialFormRef = useRef<BookForm>(EMPTY_FORM);

    const [sortKey, setSortKey] = useState<string>(
        () =>
            (typeof window !== "undefined"
                ? localStorage.getItem("book_sort")
                : null) ?? "order_idx"
    );
    const [filterStatus, setFilterStatus] = useState<
        "all" | "published" | "draft"
    >("all");
    const [filterSearch, setFilterSearch] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const setSortAndSave = (key: string) => {
        setSortKey(key);
        localStorage.setItem("book_sort", key);
    };

    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { confirmLeave } = useUnsavedWarning(isDirty);

    const loadBooks = async () => {
        if (!browserClient) return;
        setLoading(true);
        const { data, error: err } = await browserClient
            .from("books")
            .select("*")
            .order("order_idx");
        if (err) setError(err.message);
        else setBooks(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        loadBooks();
    }, []);

    const buildPayload = () => ({
        slug: form.slug,
        title: form.title,
        author: form.author || null,
        cover_url: form.cover_url || null,
        description: form.description || null,
        content: form.content,
        rating: form.rating,
        tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        job_field: form.jobField.length ? form.jobField : [],
        published: form.published,
        featured: form.featured,
        order_idx: form.order_idx,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    });

    const openEdit = (book: BookItem) => {
        const f = itemToForm(book);
        initialFormRef.current = f;
        setForm(f);
        setEditTarget(book);
        setError(null);
        setSuccess(null);
    };

    const openNew = () => {
        const base: BookForm = {
            ...EMPTY_FORM,
            order_idx: books.length,
            jobField: activeJobField ? [activeJobField] : [],
        };
        initialFormRef.current = base;
        setForm(base);
        setEditTarget("new");
        setError(null);
        setSuccess(null);
    };

    const autoSave = async () => {
        if (!browserClient || !form.title || !form.slug) return;
        const payload = buildPayload();
        if (editTarget === "new") {
            const { data: newBook, error: err } = await browserClient
                .from("books")
                .insert(payload)
                .select("*")
                .single();
            if (!err && newBook) {
                setBooks((prev) => [...prev, newBook]);
                setEditTarget(newBook);
                initialFormRef.current = form;
            }
        } else if (editTarget) {
            const { error: err } = await browserClient
                .from("books")
                .update(payload)
                .eq("id", editTarget.id);
            if (!err) {
                setBooks((prev) =>
                    prev.map((b) =>
                        b.id === editTarget.id ? { ...b, ...payload } : b
                    )
                );
                initialFormRef.current = form;
            }
        }
    };

    const { savedAt: autoSavedAt, saving: autoSaving } = useAutoSave(
        isDirty,
        editTarget !== null,
        autoSave
    );

    const handleSave = useCallback(async () => {
        if (!browserClient || !form.title || !form.slug) return;
        setSaving(true);
        setError(null);
        const payload = buildPayload();
        if (editTarget === "new") {
            const { data: newBook, error: err } = await browserClient
                .from("books")
                .insert(payload)
                .select("*")
                .single();
            if (err) setError(err.message);
            else if (newBook) {
                setBooks((prev) => [...prev, newBook]);
                setEditTarget(newBook);
                initialFormRef.current = form;
                setSuccess("저장 완료");
            }
        } else if (editTarget) {
            const { error: err } = await browserClient
                .from("books")
                .update(payload)
                .eq("id", editTarget.id);
            if (err) setError(err.message);
            else {
                setBooks((prev) =>
                    prev.map((b) =>
                        b.id === editTarget.id ? { ...b, ...payload } : b
                    )
                );
                initialFormRef.current = form;
                setSuccess("저장 완료");
            }
        }
        setSaving(false);
    }, [form, editTarget]);

    const handleDelete = async (id: string) => {
        if (!browserClient || !confirm("도서를 삭제하시겠습니까?")) return;
        const { error: err } = await browserClient
            .from("books")
            .delete()
            .eq("id", id);
        if (err) {
            showToast("삭제 실패: " + err.message);
        } else {
            setBooks((prev) => prev.filter((b) => b.id !== id));
            if (
                editTarget !== null &&
                editTarget !== "new" &&
                editTarget.id === id
            ) {
                setEditTarget(null);
            }
        }
    };

    const togglePublish = async (book: BookItem) => {
        if (!browserClient) return;
        const next = !book.published;
        const { error: err } = await browserClient
            .from("books")
            .update({ published: next })
            .eq("id", book.id);
        if (!err) {
            setBooks((prev) =>
                prev.map((b) =>
                    b.id === book.id ? { ...b, published: next } : b
                )
            );
        }
    };

    const toggleFeatured = async (book: BookItem) => {
        if (!browserClient) return;
        const next = !book.featured;
        if (next && books.filter((b) => b.featured).length >= 5) {
            showToast("Featured는 최대 5개까지 설정할 수 있습니다.");
            return;
        }
        const { error: err } = await browserClient
            .from("books")
            .update({ featured: next })
            .eq("id", book.id);
        if (!err) {
            setBooks((prev) =>
                prev.map((b) =>
                    b.id === book.id ? { ...b, featured: next } : b
                )
            );
        }
    };

    useKeyboardSave(handleSave);

    // MetadataSheet onChange 핸들러
    const handleMetaChange = (field: string, value: unknown) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    // 발행 상태 즉시 저장 (Sheet 토글 시 DB 직접 반영)
    const handlePublishToggle = async (published: boolean) => {
        if (!browserClient || editTarget === null || editTarget === "new")
            return;
        await browserClient
            .from("books")
            .update({ published })
            .eq("id", editTarget.id);
        setBooks((prev) =>
            prev.map((b) => (b.id === editTarget.id ? { ...b, published } : b))
        );
    };

    const handleBack = () => {
        if (isDirty && !confirmLeave()) return;
        setEditTarget(null);
        setMetadataOpen(false);
        setError(null);
        setSuccess(null);
    };

    const displayedBooks = books
        .filter((b) => {
            if (filterStatus === "published" && !b.published) return false;
            if (filterStatus === "draft" && b.published) return false;
            if (
                filterSearch &&
                !b.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
                !(b.author ?? "")
                    .toLowerCase()
                    .includes(filterSearch.toLowerCase())
            )
                return false;
            return true;
        })
        .sort((a, b) => {
            if (sortKey === "order_idx") return a.order_idx - b.order_idx;
            if (sortKey === "alpha_az") return a.title.localeCompare(b.title);
            if (sortKey === "alpha_za") return b.title.localeCompare(a.title);
            if (sortKey === "newest") return b.order_idx - a.order_idx;
            if (sortKey === "featured")
                return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
            return 0;
        });

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
                    placeholder="도서 제목을 입력하세요"
                    className="w-full border-none bg-transparent py-4 text-3xl font-bold text-(--color-foreground) placeholder:text-(--color-muted) focus:outline-none"
                />

                {/* 본문 에디터 */}
                <div className="min-h-[400px] flex-1">
                    <RichMarkdownEditor
                        value={form.content}
                        onChange={(v) => setForm((f) => ({ ...f, content: v }))}
                        placeholder="리뷰를 작성하세요. ## 제목, **굵게** 등 마크다운 문법이 즉시 반영됩니다."
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
                                            (editTarget as BookItem).id
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
                    type="book"
                    form={form}
                    onChange={handleMetaChange}
                    onPublishToggle={handlePublishToggle}
                    jobFields={jobFields}
                />
            </div>
        );
    }

    /* ── 목록 뷰 ── */
    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        도서
                    </h2>
                    <p className="mt-0.5 text-sm text-(--color-muted)">
                        Featured: {books.filter((b) => b.featured).length}/5
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold whitespace-nowrap text-(--color-on-accent) hover:opacity-90"
                >
                    + 새 도서
                </button>
            </div>

            {/* 필터 + 정렬 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="제목 또는 저자 검색…"
                    className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                />
                <select
                    value={filterStatus}
                    onChange={(e) =>
                        setFilterStatus(
                            e.target.value as "all" | "published" | "draft"
                        )
                    }
                    className="rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-sm text-(--color-foreground)"
                >
                    <option value="all">전체</option>
                    <option value="published">발행됨</option>
                    <option value="draft">임시저장</option>
                </select>
                <div className="ml-auto flex items-center gap-1">
                    {[
                        {
                            key: "order_idx",
                            icon: <CalendarArrowDown className="h-4 w-4" />,
                            label: "순서",
                        },
                        {
                            key: "alpha_az",
                            icon: <ArrowUpAZ className="h-4 w-4" />,
                            label: "A→Z",
                        },
                        {
                            key: "alpha_za",
                            icon: <ArrowDownAZ className="h-4 w-4" />,
                            label: "Z→A",
                        },
                        {
                            key: "newest",
                            icon: <CalendarArrowUp className="h-4 w-4" />,
                            label: "역순",
                        },
                        {
                            key: "featured",
                            icon: <Star className="h-4 w-4" />,
                            label: "Featured 먼저",
                        },
                    ].map(({ key, icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setSortAndSave(key)}
                            title={label}
                            className={`rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                                sortKey === key
                                    ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                                    : "border-(--color-border) text-(--color-muted) hover:border-(--color-accent)/50"
                            }`}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="py-8 text-center text-(--color-muted)">
                    로딩 중…
                </p>
            ) : displayedBooks.length === 0 ? (
                <p className="py-8 text-center text-(--color-muted)">
                    도서가 없습니다.
                </p>
            ) : (
                <ul>
                    {displayedBooks.map((book) => (
                        <li
                            key={book.id}
                            className="group flex items-center gap-3 border-b border-(--color-border) px-2 py-3 transition-colors hover:bg-(--color-surface-subtle)"
                        >
                            {book.cover_url && (
                                <img
                                    src={book.cover_url}
                                    alt=""
                                    className="h-10 w-7 shrink-0 rounded object-cover"
                                />
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    {book.featured && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                            <Star className="h-2.5 w-2.5" />{" "}
                                            Featured
                                        </span>
                                    )}
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                            book.published
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                        }`}
                                    >
                                        {book.published ? (
                                            <Eye className="h-2.5 w-2.5" />
                                        ) : (
                                            <EyeOff className="h-2.5 w-2.5" />
                                        )}
                                        {book.published ? "Published" : "Draft"}
                                    </span>
                                    {!book.job_field?.length && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            직무 분야 없음
                                        </span>
                                    )}
                                </div>
                                <p className="truncate text-sm font-semibold text-(--color-foreground)">
                                    {book.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {book.author && (
                                        <span className="text-xs text-(--color-muted)">
                                            {book.author}
                                        </span>
                                    )}
                                    {book.rating && (
                                        <span className="flex items-center gap-0.5">
                                            {Array.from({
                                                length: book.rating,
                                            }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className="h-3 w-3 fill-(--color-accent) text-(--color-accent)"
                                                />
                                            ))}
                                        </span>
                                    )}
                                    {book.job_field?.length > 0 && (
                                        <JobFieldBadges
                                            value={book.job_field}
                                            fields={jobFields}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                    onClick={() => toggleFeatured(book)}
                                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                        book.featured
                                            ? "bg-slate-500"
                                            : "bg-indigo-600"
                                    }`}
                                >
                                    {book.featured ? (
                                        <StarOff className="h-3 w-3" />
                                    ) : (
                                        <Star className="h-3 w-3" />
                                    )}
                                    {book.featured
                                        ? "Featured 해제"
                                        : "Featured"}
                                </button>
                                <button
                                    onClick={() => togglePublish(book)}
                                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                        book.published
                                            ? "bg-amber-500"
                                            : "bg-green-600"
                                    }`}
                                >
                                    {book.published ? (
                                        <EyeOff className="h-3 w-3" />
                                    ) : (
                                        <Eye className="h-3 w-3" />
                                    )}
                                    {book.published ? "Unpublish" : "Publish"}
                                </button>
                                <button
                                    onClick={() => openEdit(book)}
                                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    <Pencil className="h-3 w-3" />
                                    편집
                                </button>
                                <button
                                    onClick={() => handleDelete(book.id)}
                                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    삭제
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* 토스트 */}
            {toast && (
                <div className="fixed right-6 bottom-6 z-50 rounded-xl bg-(--color-foreground) px-5 py-3 text-sm font-medium text-(--color-surface) shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
