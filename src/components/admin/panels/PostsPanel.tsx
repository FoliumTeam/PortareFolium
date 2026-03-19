"use client";

import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import {
    Eye,
    EyeOff,
    ArrowUpAZ,
    ArrowDownAZ,
    CalendarArrowDown,
    CalendarArrowUp,
    Pencil,
    Trash2,
    AlertTriangle,
    ChevronDown,
} from "lucide-react";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import TagSelector from "@/components/admin/TagSelector";
import CategorySelect from "@/components/admin/CategorySelect";
import ThumbnailUploadField from "@/components/admin/ThumbnailUploadField";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import {
    JobFieldSelector,
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";

// 포스트 행 타입 (Supabase posts 테이블)
interface Post {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
    job_field: string[] | string | null;
    thumbnail: string | null;
    content: string;
    published: boolean;
    updated_at: string;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
}

// 편집 폼 상태 (신규/수정 공통)
interface PostForm {
    slug: string;
    title: string;
    description: string;
    pub_date: string;
    category: string;
    tags: string; // 쉼표 구분 문자열로 입력받아 저장 시 배열로 변환
    jobField: string[];
    thumbnail: string;
    content: string;
    published: boolean;
    meta_title: string;
    meta_description: string;
    og_image: string;
}

const EMPTY_FORM: PostForm = {
    slug: "",
    title: "",
    description: "",
    pub_date: new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
    category: "",
    tags: "",
    jobField: [],
    thumbnail: "",
    content: "",
    published: false,
    meta_title: "",
    meta_description: "",
    og_image: "",
};

// POST_SELECT_FIELDS: loadPosts 및 insert select에서 공통으로 사용할 필드
const POST_SELECT_FIELDS =
    "id, slug, title, description, pub_date, category, tags, job_field, thumbnail, content, published, updated_at, meta_title, meta_description, og_image";

/** slug 자동 생성: 제목에서 공백→하이픈, 영소문자/숫자/하이픈만 허용 */
function toSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

// 타임스탬프 포맷 (초 단위)
function fmtTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export default function PostsPanel() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Post | null | "new">(null);
    const [form, setForm] = useState<PostForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    // slug → 목차 스타일 ('hover' | 'github' | 'both')
    const [postTocStyles, setPostTocStyles] = useState<Record<string, string>>(
        {}
    );

    const initialFormRef = useRef<PostForm>(EMPTY_FORM);

    // 정렬 + 필터 + 선택 상태
    const [sortKey, setSortKey] = useState<string>(
        () =>
            (typeof window !== "undefined"
                ? localStorage.getItem("post_sort")
                : null) ?? "date_desc"
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
        setTimeout(() => setToast(null), 3000);
    };

    const setSortAndSave = (key: string) => {
        setSortKey(key);
        localStorage.setItem("post_sort", key);
        setShowSortMenu(false);
    };

    // dirty 상태
    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { confirmLeave } = useUnsavedWarning(isDirty);

    // 포스트 목록 로드 (인증된 어드민이므로 draft 포함 전체 조회)
    const loadPosts = async () => {
        if (!browserClient) return;
        setLoading(true);
        const { data, error: err } = await browserClient
            .from("posts")
            .select(POST_SELECT_FIELDS)
            .order("pub_date", { ascending: false });
        if (err) setError(err.message);
        else setPosts(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        loadPosts();
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
                .eq("key", "post_toc_styles")
                .single()
                .then(({ data }) => {
                    if (data?.value && typeof data.value === "object")
                        setPostTocStyles(data.value as Record<string, string>);
                });
        }
    }, []);

    // 포스트 목차 스타일 저장 (site_config upsert)
    const saveTocStyle = async (slug: string, style: string) => {
        if (!browserClient) return;
        const next = { ...postTocStyles, [slug]: style };
        setPostTocStyles(next);
        await browserClient
            .from("site_config")
            .upsert(
                { key: "post_toc_styles", value: next },
                { onConflict: "key" }
            );
    };

    // form → DB payload 변환
    const buildPayload = () => ({
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        pub_date: new Date(form.pub_date).toISOString(),
        category: form.category || null,
        tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        job_field: form.jobField.length ? form.jobField : null,
        thumbnail: form.thumbnail || null,
        content: form.content,
        published: form.published,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    });

    // 편집 화면 열기
    const openEdit = (post: Post) => {
        const jf = post.job_field;
        const f: PostForm = {
            slug: post.slug,
            title: post.title,
            description: post.description ?? "",
            pub_date: post.pub_date.slice(0, 16),
            category: post.category ?? "",
            tags: post.tags.join(", "),
            jobField: Array.isArray(jf) ? jf : jf ? [jf] : [],
            thumbnail: post.thumbnail ?? "",
            content: post.content,
            published: post.published,
            meta_title: post.meta_title ?? "",
            meta_description: post.meta_description ?? "",
            og_image: post.og_image ?? "",
        };
        initialFormRef.current = f;
        setForm(f);
        setEditTarget(post);
        setError(null);
        setSuccess(null);
        setSavedAt(null);
    };

    // 신규 생성 화면 열기
    const openNew = () => {
        initialFormRef.current = EMPTY_FORM;
        setForm(EMPTY_FORM);
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
            // 신규: insert 후 editTarget을 실제 post로 전환
            const { data: newPost, error: err } = await browserClient
                .from("posts")
                .insert(payload)
                .select(POST_SELECT_FIELDS)
                .single();
            if (!err && newPost) {
                initialFormRef.current = form;
                setEditTarget(newPost);
                setSavedAt(new Date());
            }
        } else if (editTarget !== null) {
            const { error: err } = await browserClient
                .from("posts")
                .update(payload)
                .eq("id", editTarget.id);
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
                .from("posts")
                .insert(payload));
        } else {
            ({ error: err } = await browserClient
                .from("posts")
                .update(payload)
                .eq("id", (editTarget as Post).id));
        }

        setSaving(false);
        if (err) {
            setError(err.message);
        } else {
            initialFormRef.current = form;
            setSavedAt(null);
            setSuccess("수동 저장 완료 " + fmtTime(new Date()));
            loadPosts();
            // 새 글이면 목록으로 돌아감, 수정이면 유지
            if (editTarget === "new") setEditTarget(null);
        }
    };

    // 목록으로 이탈 (dirty 확인 포함)
    const handleBack = () => {
        if (confirmLeave()) setEditTarget(null);
    };

    // 삭제
    const handleDelete = async (id: string) => {
        if (!browserClient || !confirm("정말 삭제하시겠습니까?")) return;
        const { error: err } = await browserClient
            .from("posts")
            .delete()
            .eq("id", id);
        if (err) setError(err.message);
        else loadPosts();
    };

    // 발행/초안 토글
    const togglePublish = async (post: Post) => {
        if (!browserClient) return;
        await browserClient
            .from("posts")
            .update({ published: !post.published })
            .eq("id", post.id);
        loadPosts();
    };

    // ── 편집 화면 ────────────────────────────────────────────
    if (editTarget !== null) {
        return (
            <div className="w-full max-w-6xl pb-24">
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-lg text-(--color-muted) transition-colors hover:border-(--color-accent)/30 hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        ← 목록
                    </button>
                    <h2 className="text-3xl font-bold text-(--color-foreground)">
                        {editTarget === "new" ? "새 포스트" : "포스트 편집"}
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

                        {/* 제목 */}
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
                                placeholder="포스트 제목을 입력하세요"
                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                            />
                        </div>

                        {/* slug + 발행일 */}
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                    발행일
                                </label>
                                <input
                                    type="datetime-local"
                                    value={form.pub_date}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            pub_date: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* 카테고리 + 태그 */}
                        <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                            <div>
                                <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                    카테고리
                                </label>
                                <CategorySelect
                                    value={form.category}
                                    onChange={(v) =>
                                        setForm((f) => ({
                                            ...f,
                                            category: v,
                                        }))
                                    }
                                    options={[
                                        ...new Set(
                                            posts
                                                .map((p) => p.category)
                                                .filter(
                                                    (c): c is string =>
                                                        !!c?.trim()
                                                )
                                        ),
                                    ]}
                                    placeholder="선택 또는 새로 입력"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                    태그
                                </label>
                                <TagSelector
                                    value={form.tags}
                                    onChange={(v) =>
                                        setForm((f) => ({ ...f, tags: v }))
                                    }
                                />
                            </div>
                        </div>

                        {/* 직무 분야 */}
                        <JobFieldSelector
                            value={form.jobField}
                            fields={jobFields}
                            onChange={(v) =>
                                setForm((f) => ({ ...f, jobField: v }))
                            }
                        />
                    </section>

                    {/* 섹션 2: 본문 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                2
                            </span>
                            본문
                        </h3>

                        {/* 요약 */}
                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                요약
                                <span className="ml-1 text-xs font-normal text-(--color-muted)">
                                    검색 결과 및 카드에 표시
                                </span>
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        description: e.target.value,
                                    }))
                                }
                                rows={2}
                                placeholder="포스트를 한 두 줄로 소개하세요"
                                className="w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                            />
                        </div>

                        {/* 썸네일 */}
                        <ThumbnailUploadField
                            value={form.thumbnail}
                            onChange={(url) =>
                                setForm((f) => ({ ...f, thumbnail: url }))
                            }
                            placeholder="파일 업로드 또는 URL 입력"
                            folderPath={`blog/${form.slug || "untitled"}`}
                        />

                        {/* 본문 에디터 */}
                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                본문 (Markdown)
                            </label>
                            <RichMarkdownEditor
                                value={form.content}
                                onChange={(c) =>
                                    setForm((f) => ({ ...f, content: c }))
                                }
                                placeholder="본문을 작성하세요. ## 제목, **굵게**, [링크](url) 등 마크다운 문법이 즉시 반영됩니다."
                                folderPath={`blog/${form.slug || "untitled"}`}
                            />
                        </div>
                    </section>

                    {/* 섹션 3: 발행 설정 */}
                    <section className="space-y-4 rounded-xl border border-(--color-accent)/30 bg-(--color-surface-subtle) p-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-(--color-foreground)">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-(--color-on-accent)">
                                3
                            </span>
                            발행 설정
                        </h3>

                        {/* Published 토글 */}
                        <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3">
                            <div>
                                <p className="text-base font-medium text-(--color-foreground)">
                                    {form.published ? "Published" : "Draft"}
                                </p>
                                <p className="text-sm text-(--color-muted)">
                                    {form.published
                                        ? "저장 시 즉시 공개됩니다"
                                        : "저장해도 공개되지 않습니다"}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form.published}
                                onClick={() =>
                                    setForm((f) => ({
                                        ...f,
                                        published: !f.published,
                                    }))
                                }
                                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none ${
                                    form.published
                                        ? "bg-green-500"
                                        : "bg-(--color-border)"
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        form.published
                                            ? "translate-x-5"
                                            : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* SEO 설정 */}
                        <details className="group rounded-lg border border-(--color-border) bg-(--color-surface-subtle) open:bg-(--color-surface)">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)">
                                <span>SEO 설정 (선택사항)</span>
                                <span className="text-(--color-muted) transition-transform group-open:rotate-180">
                                    ▼
                                </span>
                            </summary>
                            <div className="space-y-4 border-t border-(--color-border) p-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                        SEO 제목 (Meta Title)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.meta_title}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                meta_title: e.target.value,
                                            }))
                                        }
                                        placeholder="비워두면 포스트 제목이 사용됩니다"
                                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                        SEO 설명 (Meta Description)
                                    </label>
                                    <textarea
                                        value={form.meta_description}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                meta_description:
                                                    e.target.value,
                                            }))
                                        }
                                        placeholder="비워두면 포스트 요약이 사용됩니다"
                                        rows={2}
                                        className="w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                    />
                                </div>
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
                                        placeholder="비워두면 썸네일 또는 전역 SEO 이미지가 사용됩니다"
                                        folderPath={`blog/${form.slug || "untitled"}`}
                                    />
                                </div>
                            </div>
                        </details>

                        {/* 목차 스타일 설정 */}
                        <details className="group rounded-lg border border-(--color-border) bg-(--color-surface-subtle) open:bg-(--color-surface)">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)">
                                <span>목차 (TOC) 설정</span>
                                <span className="text-(--color-muted) transition-transform group-open:rotate-180">
                                    ▼
                                </span>
                            </summary>
                            <div className="border-t border-(--color-border) p-4">
                                <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                    목차 표시 방식
                                </label>
                                <select
                                    value={postTocStyles[form.slug] ?? "hover"}
                                    onChange={(e) => {
                                        if (form.slug)
                                            saveTocStyle(
                                                form.slug,
                                                e.target.value
                                            );
                                    }}
                                    disabled={!form.slug}
                                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                >
                                    <option value="hover">
                                        호버링 사이드바 목차
                                    </option>
                                    <option value="github">
                                        GitHub 형식 목차 (본문 상단)
                                    </option>
                                    <option value="both">둘 다 표시</option>
                                </select>
                                <p className="mt-1 text-xs text-(--color-muted)">
                                    슬러그를 먼저 저장해야 적용됩니다.
                                </p>
                            </div>
                        </details>
                    </section>
                </div>

                {/* 피드백 */}
                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-base text-red-500 dark:bg-red-950/30">
                        {error}
                    </p>
                )}
                {success && (
                    <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-base text-green-600 dark:bg-green-950/30">
                        {success}
                    </p>
                )}

                {/* Sticky 저장 바 */}
                <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-(--color-border) bg-(--color-surface)/90 px-6 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                        <div className="text-sm text-(--color-muted)">
                            {savedAt && (
                                <span className="text-green-600">
                                    자동 저장 완료 {fmtTime(savedAt)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBack}
                                className="rounded-lg border border-(--color-border) px-5 py-2 text-base font-medium whitespace-nowrap text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className="rounded-lg bg-(--color-accent) px-5 py-2 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── 목록 화면 ─────────────────────────────────────────────

    // 정렬 + 필터 적용
    const displayedPosts = posts
        .filter((p) => {
            if (filterStatus === "published" && !p.published) return false;
            if (filterStatus === "draft" && p.published) return false;
            if (filterJobField) {
                const jf = p.job_field;
                if (!jf) return false;
                const arr = Array.isArray(jf) ? jf : [jf];
                if (!arr.includes(filterJobField)) return false;
            }
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (!p.title.toLowerCase().includes(q) && !p.slug.includes(q))
                    return false;
            }
            return true;
        })
        .sort((a, b) => {
            switch (sortKey) {
                case "date_asc":
                    return (
                        new Date(a.pub_date).getTime() -
                        new Date(b.pub_date).getTime()
                    );
                case "title_az":
                    return a.title.localeCompare(b.title);
                case "title_za":
                    return b.title.localeCompare(a.title);
                case "published_first":
                    return (b.published ? 1 : 0) - (a.published ? 1 : 0);
                case "draft_first":
                    return (a.published ? 1 : 0) - (b.published ? 1 : 0);
                default:
                    return (
                        new Date(b.pub_date).getTime() -
                        new Date(a.pub_date).getTime()
                    );
            }
        });

    const allSelected =
        displayedPosts.length > 0 &&
        displayedPosts.every((p) => selected.has(p.id));
    const someSelected = selected.size > 0;

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(displayedPosts.map((p) => p.id)));
        }
    };

    const batchPublish = async (publish: boolean) => {
        if (!browserClient || selected.size === 0) return;
        setBatchSaving(true);
        await browserClient
            .from("posts")
            .update({ published: publish })
            .in("id", [...selected]);
        setBatchSaving(false);
        setSelected(new Set());
        loadPosts();
        showToast(
            `${selected.size}개 포스트를 ${publish ? "Published" : "Draft"}로 변경했습니다.`
        );
    };

    const batchSetJobField = async () => {
        if (!browserClient || selected.size === 0 || !batchJobField) return;
        setBatchSaving(true);
        await browserClient
            .from("posts")
            .update({ job_field: [batchJobField] })
            .in("id", [...selected]);
        setBatchSaving(false);
        setSelected(new Set());
        setBatchJobField("");
        loadPosts();
        showToast(`${selected.size}개 포스트의 직무 분야를 변경했습니다.`);
    };

    const SORT_LABELS: Record<string, string> = {
        date_desc: "최신순",
        date_asc: "오래된순",
        title_az: "제목 A→Z",
        title_za: "제목 Z→A",
        published_first: "Published 먼저",
        draft_first: "Draft 먼저",
    };

    return (
        <div>
            {/* 헤더 */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-(--color-foreground)">
                    블로그 포스트
                </h2>
                <button
                    onClick={openNew}
                    className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                >
                    + 새 포스트
                </button>
            </div>

            {/* 필터 + 정렬 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {/* 검색 */}
                <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="제목 또는 slug 검색"
                    className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                />
                {/* 발행 상태 필터 */}
                <select
                    value={filterStatus}
                    onChange={(e) =>
                        setFilterStatus(
                            e.target.value as "all" | "published" | "draft"
                        )
                    }
                    className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:outline-none"
                >
                    <option value="all">전체</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                </select>
                {/* 직무 분야 필터 */}
                {jobFields.length > 0 && (
                    <select
                        value={filterJobField}
                        onChange={(e) => setFilterJobField(e.target.value)}
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
                        {sortKey.startsWith("date") ? (
                            sortKey === "date_desc" ? (
                                <CalendarArrowDown size={14} />
                            ) : (
                                <CalendarArrowUp size={14} />
                            )
                        ) : sortKey.includes("az") ? (
                            <ArrowUpAZ size={14} />
                        ) : sortKey.includes("za") ? (
                            <ArrowDownAZ size={14} />
                        ) : null}
                        {SORT_LABELS[sortKey]}
                        <ChevronDown size={14} />
                    </button>
                    {showSortMenu && (
                        <div className="absolute top-full right-0 z-20 mt-1 w-40 rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg">
                            {Object.entries(SORT_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSortAndSave(key)}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-(--color-surface-subtle) ${sortKey === key ? "font-semibold text-(--color-accent)" : "text-(--color-foreground)"}`}
                                >
                                    {label}
                                </button>
                            ))}
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

            {error && <p className="mb-4 text-base text-red-500">{error}</p>}

            {loading ? (
                <p className="text-base text-(--color-muted)">불러오는 중...</p>
            ) : displayedPosts.length === 0 ? (
                <p className="text-base text-(--color-muted)">
                    {posts.length === 0
                        ? "포스트가 없습니다."
                        : "필터 조건에 맞는 포스트가 없습니다."}
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
                            전체 선택 ({displayedPosts.length}개)
                        </span>
                    </div>
                    {displayedPosts.map((post) => {
                        const hasJobField =
                            !!post.job_field &&
                            (Array.isArray(post.job_field)
                                ? post.job_field.length > 0
                                : true);
                        return (
                            <div
                                key={post.id}
                                className={`flex items-center gap-3 rounded-lg border bg-(--color-surface) p-4 transition-colors ${
                                    selected.has(post.id)
                                        ? "border-(--color-accent)/50"
                                        : "border-(--color-border)"
                                }`}
                            >
                                {/* 체크박스 */}
                                <input
                                    type="checkbox"
                                    checked={selected.has(post.id)}
                                    onChange={() => toggleSelect(post.id)}
                                    className="h-4 w-4 flex-shrink-0 cursor-pointer rounded"
                                />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${
                                                post.published
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                            }`}
                                        >
                                            {post.published ? (
                                                <Eye size={11} />
                                            ) : (
                                                <EyeOff size={11} />
                                            )}
                                            {post.published
                                                ? "Published"
                                                : "Draft"}
                                        </span>
                                        {!hasJobField && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                                <AlertTriangle size={11} />
                                                직무 분야 없음
                                            </span>
                                        )}
                                        {post.category && (
                                            <span className="text-sm text-(--color-muted)">
                                                {post.category}
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-base font-semibold text-(--color-foreground)">
                                        {post.title}
                                    </p>
                                    <p className="font-mono text-sm text-(--color-muted)">
                                        {post.slug}
                                    </p>
                                    <p className="text-sm text-(--color-muted)">
                                        {new Date(
                                            post.pub_date
                                        ).toLocaleDateString("ko-KR")}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <JobFieldBadges
                                            value={post.job_field}
                                            fields={jobFields}
                                        />
                                        {post.tags.slice(0, 4).map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                        {post.tags.length > 4 && (
                                            <span className="text-xs text-(--color-muted)">
                                                +{post.tags.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        onClick={() => togglePublish(post)}
                                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                            post.published
                                                ? "bg-amber-500"
                                                : "bg-green-600"
                                        }`}
                                    >
                                        {post.published ? (
                                            <EyeOff size={13} />
                                        ) : (
                                            <Eye size={13} />
                                        )}
                                        {post.published
                                            ? "Unpublish"
                                            : "Publish"}
                                    </button>
                                    <button
                                        onClick={() => openEdit(post)}
                                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                    >
                                        <Pencil size={13} />
                                        편집
                                    </button>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                    >
                                        <Trash2 size={13} />
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
    );
}
