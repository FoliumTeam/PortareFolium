/**
 * PostsPanel
 *
 * 블로그 포스트 목록 조회, 생성, 편집, 삭제, 발행/초안 전환을 담당한다.
 * - 목록 화면과 편집 화면을 같은 패널 내에서 전환한다.
 * - 마크다운 편집 시 좌측 에디터 + 우측 라이브 미리보기 (Keystatic/Notion 스타일).
 */
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import TagSelector from "@/components/admin/TagSelector";
import CategorySelect from "@/components/admin/CategorySelect";
import ThumbnailUploadField from "@/components/admin/ThumbnailUploadField";
import { useAutoSave, getAutoSaveDraft } from "@/lib/hooks/useAutoSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";

// 포스트 행 타입 (Supabase posts 테이블)
interface Post {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
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
    pub_date: new Date().toISOString().slice(0, 16),
    category: "",
    tags: "",
    thumbnail: "",
    content: "",
    published: false,
    meta_title: "",
    meta_description: "",
    og_image: "",
};

/** slug 자동 생성: 제목에서 공백→하이픈, 영소문자/숫자/하이픈만 허용 */
function toSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

export default function PostsPanel() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Post | null | "new">(null);
    const [form, setForm] = useState<PostForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showRestoreBanner, setShowRestoreBanner] = useState(false);

    const initialFormRef = useRef<PostForm>(EMPTY_FORM);

    // auto-save key 계산
    const autoSaveKey =
        editTarget === null
            ? "__none__"
            : editTarget === "new"
              ? "admin_autosave_post_new"
              : `admin_autosave_post_${(editTarget as Post).id}`;

    // dirty 상태
    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { savedAt, clear } = useAutoSave(
        autoSaveKey,
        form,
        editTarget !== null
    );
    const { confirmLeave } = useUnsavedWarning(isDirty);

    // 포스트 목록 로드 (인증된 어드민이므로 draft 포함 전체 조회)
    const loadPosts = async () => {
        if (!browserClient) return;
        setLoading(true);
        const { data, error: err } = await browserClient
            .from("posts")
            .select(
                "id, slug, title, description, pub_date, category, tags, thumbnail, content, published, updated_at, meta_title, meta_description, og_image"
            )
            .order("pub_date", { ascending: false });
        if (err) setError(err.message);
        else setPosts(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    // 편집 화면 열기
    const openEdit = (post: Post) => {
        const f: PostForm = {
            slug: post.slug,
            title: post.title,
            description: post.description ?? "",
            pub_date: post.pub_date.slice(0, 16),
            category: post.category ?? "",
            tags: post.tags.join(", "),
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
        setShowRestoreBanner(
            !!localStorage.getItem(`admin_autosave_post_${post.id}`)
        );
    };

    // 신규 생성 화면 열기
    const openNew = () => {
        initialFormRef.current = EMPTY_FORM;
        setForm(EMPTY_FORM);
        setEditTarget("new");
        setError(null);
        setSuccess(null);
        setShowRestoreBanner(!!localStorage.getItem("admin_autosave_post_new"));
    };

    // 저장 (신규 insert / 수정 update)
    const handleSave = async () => {
        if (!browserClient || !form.title || !form.slug) {
            setError("제목과 slug는 필수입니다.");
            return;
        }
        setSaving(true);
        setError(null);

        const payload = {
            slug: form.slug,
            title: form.title,
            description: form.description || null,
            pub_date: new Date(form.pub_date).toISOString(),
            category: form.category || null,
            tags: form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            thumbnail: form.thumbnail || null,
            content: form.content,
            published: form.published,
            meta_title: form.meta_title || null,
            meta_description: form.meta_description || null,
            og_image: form.og_image || null,
        };

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
            setSuccess("저장됐습니다.");
            clear();
            initialFormRef.current = form;
            loadPosts();
            // 새 글이면 목록으로 돌아감, 수정이면 유지
            if (editTarget === "new") setEditTarget(null);
        }
    };

    // 목록으로 이탈 (dirty 확인 포함)
    const handleBack = () => {
        if (confirmLeave()) {
            setEditTarget(null);
            setShowRestoreBanner(false);
        }
    };

    // 임시 저장본 복원
    const handleRestore = () => {
        const draft = getAutoSaveDraft<PostForm>(autoSaveKey);
        if (draft) setForm(draft);
        setShowRestoreBanner(false);
    };

    // 임시 저장본 무시
    const handleDiscardDraft = () => {
        clear();
        setShowRestoreBanner(false);
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
            <div className="w-full max-w-6xl">
                {showRestoreBanner && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <span className="flex-1">
                            저장되지 않은 임시 저장본이 있습니다.
                            복원하시겠습니까?
                        </span>
                        <button
                            onClick={handleRestore}
                            className="font-semibold underline"
                        >
                            복원
                        </button>
                        <button
                            onClick={handleDiscardDraft}
                            className="text-(--color-muted) hover:text-(--color-foreground)"
                        >
                            무시
                        </button>
                    </div>
                )}
                <button
                    onClick={handleBack}
                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-lg text-(--color-muted) transition-colors hover:border-(--color-accent) hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                >
                    ← 목록
                </button>
                <h2 className="mt-6 text-3xl font-bold text-(--color-foreground)">
                    {editTarget === "new" ? "새 포스트" : "포스트 편집"}
                </h2>

                <div className="mt-6 space-y-4">
                    {/* 제목 */}
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

                    {/* slug + 발행일 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-base font-medium text-(--color-muted)">
                                Slug *
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
                                                (c): c is string => !!c?.trim()
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

                    {/* 요약 */}
                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            요약
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
                            className="w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                        />
                    </div>

                    {/* 썸네일: 파일 업로드 또는 URL 입력 */}
                    <ThumbnailUploadField
                        value={form.thumbnail}
                        onChange={(url) =>
                            setForm((f) => ({ ...f, thumbnail: url }))
                        }
                        placeholder="파일 업로드 또는 URL 입력"
                        folderPath={`blog/${form.slug || "untitled"}`}
                    />

                    {/* SEO 설정 (선택사항) */}
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
                                            meta_description: e.target.value,
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

                    {/* 본문: WYSIWYG 마크다운 에디터 */}
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

                    {/* 발행 여부 */}
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
                            Publish immediately
                        </span>
                        <span className="text-sm text-(--color-muted)">
                            (Uncheck to save as Draft)
                        </span>
                    </label>

                    {/* 피드백 */}
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

                    {/* 저장 버튼 */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-(--color-accent) px-5 py-2 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? "저장 중..." : "저장"}
                        </button>
                        <button
                            onClick={handleBack}
                            className="rounded-lg border border-(--color-border) px-5 py-2 text-base font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                        >
                            취소
                        </button>
                        {savedAt && (
                            <span className="text-sm text-(--color-muted)">
                                자동 저장:{" "}
                                {savedAt.toLocaleTimeString("ko-KR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        )}
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
                    블로그 포스트
                </h2>
                <button
                    onClick={openNew}
                    className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90"
                >
                    + 새 포스트
                </button>
            </div>

            {error && <p className="mb-4 text-base text-red-500">{error}</p>}

            {loading ? (
                <p className="text-base text-(--color-muted)">불러오는 중...</p>
            ) : posts.length === 0 ? (
                <p className="text-base text-(--color-muted)">
                    포스트가 없습니다.
                </p>
            ) : (
                <div className="space-y-2">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="flex items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-accent)/50"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex items-center gap-2">
                                    <span
                                        className={`inline-block rounded-full px-2 py-0.5 text-sm font-medium ${
                                            post.published
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                        }`}
                                    >
                                        {post.published ? "Published" : "Draft"}
                                    </span>
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
                                    {post.slug} ·{" "}
                                    {new Date(post.pub_date).toLocaleDateString(
                                        "ko-KR"
                                    )}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    onClick={() => togglePublish(post)}
                                    className="rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    {post.published ? "Unpublish" : "Publish"}
                                </button>
                                <button
                                    onClick={() => openEdit(post)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    편집
                                </button>
                                <button
                                    onClick={() => handleDelete(post.id)}
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
