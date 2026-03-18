import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import ThumbnailUploadField from "@/components/admin/ThumbnailUploadField";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";

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

function fmtTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export default function BooksSubPanel({
    jobFields,
}: {
    jobFields: JobFieldItem[];
}) {
    const [books, setBooks] = useState<BookItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<BookItem | null | "new">(null);
    const [form, setForm] = useState<BookForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);

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
        setSavedAt(null);
    };

    const openNew = () => {
        const base = { ...EMPTY_FORM, order_idx: books.length };
        initialFormRef.current = base;
        setForm(base);
        setEditTarget("new");
        setError(null);
        setSuccess(null);
        setSavedAt(null);
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
                setSavedAt(new Date());
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
                setSavedAt(new Date());
            }
        }
    };

    useAutoSave(isDirty, true, autoSave);

    const handleSave = async () => {
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
    };

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

    const handleBack = () => {
        if (isDirty && !confirmLeave()) return;
        setEditTarget(null);
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

    /* ── 편집 폼 ── */
    if (editTarget !== null) {
        const field = (
            key: keyof BookForm,
            label: string,
            opts?: { placeholder?: string; type?: string; rows?: number }
        ) => (
            <div>
                <label className="mb-1 block text-base font-medium text-(--color-muted)">
                    {label}
                </label>
                {opts?.rows ? (
                    <textarea
                        value={(form[key] as string) ?? ""}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        rows={opts.rows}
                        placeholder={opts?.placeholder}
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                    />
                ) : (
                    <input
                        type={opts?.type ?? "text"}
                        value={(form[key] as string) ?? ""}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        placeholder={opts?.placeholder}
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                    />
                )}
            </div>
        );

        const toggle = (key: "published" | "featured", label: string) => (
            <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3">
                <span className="text-base font-medium text-(--color-foreground)">
                    {label}
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={form[key]}
                    onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none ${
                        form[key] ? "bg-green-500" : "bg-(--color-border)"
                    }`}
                >
                    <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            form[key] ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                </button>
            </div>
        );

        return (
            <div className="w-full max-w-5xl pb-24">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-lg text-(--color-muted) transition-colors hover:border-(--color-accent)/30 hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        ← 목록
                    </button>
                    <h2 className="text-3xl font-bold text-(--color-foreground)">
                        {editTarget === "new" ? "새 도서" : "도서 편집"}
                    </h2>
                    <div className="text-sm">
                        {savedAt && (
                            <span className="text-green-600">
                                자동 저장 완료 {fmtTime(savedAt)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 섹션 1: 기본 정보 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                1
                            </span>
                            기본 정보
                        </h3>

                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                제목 <span className="text-red-500">*</span>
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
                                placeholder="도서 제목을 입력하세요"
                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                Slug <span className="text-red-500">*</span>
                                <span className="ml-1 text-xs font-normal text-(--color-muted)">
                                    URL 경로
                                </span>
                            </label>
                            <input
                                type="text"
                                value={form.slug}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        slug: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-mono text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                            />
                        </div>

                        <JobFieldSelector
                            value={form.jobField}
                            fields={jobFields}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, jobField: v }))
                            }
                        />

                        {field("author", "저자", { placeholder: "저자명" })}
                        {field("description", "한줄 소개", {
                            placeholder: "도서 한줄 소개",
                            rows: 2,
                        })}
                        {field("tags", "태그", {
                            placeholder: "쉼표로 구분 (예: TypeScript, React)",
                        })}
                    </section>

                    {/* 섹션 2: 표지 + 평점 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                2
                            </span>
                            표지 &amp; 평점
                        </h3>

                        <ThumbnailUploadField
                            value={form.cover_url}
                            onChange={(url) =>
                                setForm((f) => ({ ...f, cover_url: url }))
                            }
                            folderPath="books"
                        />

                        <div>
                            <label className="mb-2 block text-base font-medium text-(--color-muted)">
                                평점
                            </label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() =>
                                            setForm((f) => ({
                                                ...f,
                                                rating:
                                                    f.rating === n ? null : n,
                                            }))
                                        }
                                        className="transition-transform hover:scale-110"
                                        aria-label={`${n}점`}
                                    >
                                        <Star
                                            className={`h-7 w-7 ${
                                                form.rating !== null &&
                                                n <= form.rating
                                                    ? "fill-(--color-accent) text-(--color-accent)"
                                                    : "text-(--color-border)"
                                            }`}
                                        />
                                    </button>
                                ))}
                                {form.rating && (
                                    <span className="ml-2 text-sm text-(--color-muted)">
                                        {form.rating} / 5
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 섹션 3: 본문 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                3
                            </span>
                            리뷰 본문
                        </h3>
                        <RichMarkdownEditor
                            value={form.content}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, content: v }))
                            }
                        />
                    </section>

                    {/* 섹션 4: 발행 설정 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                4
                            </span>
                            발행 설정
                        </h3>
                        {toggle("published", "발행")}
                        {toggle("featured", "Featured")}
                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                순서
                            </label>
                            <input
                                type="number"
                                value={form.order_idx}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        order_idx: Number(e.target.value),
                                    }))
                                }
                                className="w-32 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                            />
                        </div>
                    </section>

                    {/* 섹션 5: SEO */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                5
                            </span>
                            SEO / OG
                        </h3>
                        {field("meta_title", "Meta Title")}
                        {field("meta_description", "Meta Description", {
                            rows: 2,
                        })}
                        {field("og_image", "OG Image URL")}
                    </section>
                </div>

                {/* 오류 / 성공 */}
                {error && (
                    <div className="mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                {/* 저장 버튼 (하단 고정) */}
                <div className="fixed right-0 bottom-0 left-0 z-40 flex justify-end border-t border-(--color-border) bg-(--color-surface) px-8 py-4 shadow-lg">
                    <button
                        onClick={handleBack}
                        className="mr-3 rounded-lg border border-(--color-border) px-5 py-2.5 text-base font-medium text-(--color-muted) hover:bg-(--color-surface-subtle)"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.title || !form.slug}
                        className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? "저장 중…" : "저장"}
                    </button>
                </div>
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
                <ul className="space-y-2">
                    {displayedBooks.map((book) => (
                        <li
                            key={book.id}
                            className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                        >
                            {book.cover_url && (
                                <img
                                    src={book.cover_url}
                                    alt=""
                                    className="h-12 w-8 shrink-0 rounded object-cover"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate font-medium text-(--color-foreground)">
                                        {book.title}
                                    </span>
                                    {!book.job_field?.length && (
                                        <AlertTriangle
                                            className="h-3.5 w-3.5 shrink-0 text-amber-500"
                                            aria-label="직무 분야 미설정"
                                        />
                                    )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
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
                                    {book.tags?.slice(0, 3).map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                    {book.tags?.length > 3 && (
                                        <span className="text-xs text-(--color-muted)">
                                            +{book.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 액션 버튼 */}
                            <div className="flex shrink-0 items-center gap-1">
                                {/* Featured 토글 */}
                                <button
                                    onClick={() => toggleFeatured(book)}
                                    title={
                                        book.featured
                                            ? "Featured 해제"
                                            : "Featured 설정"
                                    }
                                    className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                                        book.featured
                                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                            : "border border-(--color-border) text-(--color-muted) hover:border-indigo-300 hover:text-indigo-600"
                                    }`}
                                >
                                    {book.featured ? (
                                        <Star className="h-3.5 w-3.5 fill-current" />
                                    ) : (
                                        <StarOff className="h-3.5 w-3.5" />
                                    )}
                                </button>

                                {/* 발행 토글 */}
                                <button
                                    onClick={() => togglePublish(book)}
                                    title={
                                        book.published ? "발행됨" : "임시저장"
                                    }
                                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                                        book.published
                                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                            : "bg-green-100 text-green-700 hover:bg-green-200"
                                    }`}
                                >
                                    {book.published ? (
                                        <>
                                            <EyeOff className="h-3.5 w-3.5" />
                                            발행됨
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-3.5 w-3.5" />
                                            발행
                                        </>
                                    )}
                                </button>

                                {/* 편집 */}
                                <button
                                    onClick={() => openEdit(book)}
                                    title="편집"
                                    className="rounded-lg border border-(--color-border) p-1.5 text-(--color-muted) hover:border-(--color-accent)/50 hover:text-(--color-accent)"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>

                                {/* 삭제 */}
                                <button
                                    onClick={() => handleDelete(book.id)}
                                    title="삭제"
                                    className="rounded-lg border border-(--color-border) p-1.5 text-(--color-muted) hover:border-red-300 hover:text-red-600"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
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
