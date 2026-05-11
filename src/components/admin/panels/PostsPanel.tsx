"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    moveStorageFolder,
    deleteStorageFolder,
    replaceImageUrls,
} from "@/lib/image-upload";
import {
    cleanupTrueOrphans,
    extractKeysFromText,
    baseKey,
} from "@/lib/orphan-cleanup";
import { maybeCleanupOnOpen } from "@/lib/snapshot-cleanup";
import { toSlug } from "@/lib/slug";
import { rewriteEditorSnapshotUrls } from "@/app/admin/actions/editor-states";
import {
    batchSetPostJobField,
    batchSetPostPublished,
    deletePostById,
    getPostsPanelBootstrap,
    savePost,
    savePostTocStyle,
    setPostPublished,
} from "@/app/admin/actions/posts";
import { createPostCategory } from "@/app/admin/actions/tags";
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
    Settings,
    ExternalLink,
    Clock3,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import RichMarkdownEditor from "@/components/admin/RichMarkdownEditor";
import EditorStatePreservation from "@/components/admin/EditorStatePreservation";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import {
    dedupeJobFieldsById,
    getInitialJobFieldSelection,
    normalizeUniqueJobFieldList,
    normalizeJobFieldValue,
} from "@/lib/job-field";
import {
    JobFieldBadges,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";
import MetadataSheet from "@/components/admin/MetadataSheet";
import SaveIndicator from "@/components/admin/SaveIndicator";
import AdminSaveBar from "@/components/admin/AdminSaveBar";
import { Badge } from "@/components/ui/badge";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

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

interface PostsPanelProps {
    editPath?: string;
    onEditPathChange?: (path: string) => void;
}

export default function PostsPanel({
    editPath = "",
    onEditPathChange,
}: PostsPanelProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<Post | null | "new">(null);
    const [form, setForm] = useState<PostForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
    const [stateModalOpen, setStateModalOpen] = useState(false);
    const [snapshotCount, setSnapshotCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeJobField, setActiveJobField] = useState<string>("");
    // slug → 목차 스타일 ('hover' | 'github' | 'both')
    const [postTocStyles, setPostTocStyles] = useState<Record<string, string>>(
        {}
    );
    // slug 수동 편집 잠금 + 에셋 이전 상태
    const [slugLocked, setSlugLocked] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const savedSlugRef = useRef<string>("");
    // MetadataSheet 상태
    const [metadataOpen, setMetadataOpen] = useState(false);

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
    // editor_states count (목록 yellow highlight용)
    const [stateCounts, setStateCounts] = useState<Record<string, number>>({});
    // 토스트 알림
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const setSortAndSave = (key: string) => {
        setSortKey(key);
        localStorage.setItem("post_sort", key);
    };

    // dirty 상태
    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { confirmLeave } = useUnsavedWarning(isDirty);
    const { confirm } = useConfirmDialog();

    // 포스트 목록 로드 (인증된 어드민이므로 draft 포함 전체 조회)
    const loadPosts = async () => {
        setLoading(true);
        const result = await getPostsPanelBootstrap();
        setPosts(result.posts);
        setStateCounts(result.stateCounts);
        setJobFields(dedupeJobFieldsById(result.jobFields));
        setCategories(result.categories);
        setActiveJobField(normalizeJobFieldValue(result.activeJobField));
        setPostTocStyles(result.postTocStyles);
        setLoading(false);
    };

    useEffect(() => {
        void loadPosts();
    }, []);

    // editPath로 편집 상태 복원 (새로고침 시)
    const editPathRestoredRef = useRef(false);
    useEffect(() => {
        if (
            editPathRestoredRef.current ||
            !editPath ||
            loading ||
            !posts.length
        )
            return;
        editPathRestoredRef.current = true;
        if (editPath === "new") {
            openNew();
        } else if (editPath.startsWith("edit/")) {
            const slug = editPath.slice(5);
            const post = posts.find((p) => p.slug === slug);
            if (post) openEdit(post);
            else onEditPathChange?.("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editPath, loading, posts]);

    // 포스트 목차 스타일 저장 (site_config upsert)
    const saveTocStyle = async (slug: string, style: string) => {
        const next = { ...postTocStyles, [slug]: style };
        setPostTocStyles(next);
        await savePostTocStyle(slug, style);
    };

    // form → DB payload 변환
    const buildPayload = () => ({
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        pub_date: new Date(form.pub_date + "+09:00").toISOString(),
        category: form.category || null,
        tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        job_field: form.jobField.length
            ? normalizeUniqueJobFieldList(form.jobField)
            : null,
        thumbnail: form.thumbnail || null,
        content: form.content,
        published: form.published,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    });

    // 편집 화면 열기 — T3 안전망: snapshot 0건이면 full true-orphan cleanup
    const openEdit = (post: Post) => {
        void maybeCleanupOnOpen("post", post.slug, {
            folderPath: `blog/${post.slug}`,
            entityType: "post",
            entitySlug: post.slug,
            currentContent: post.content,
            thumbnail: post.thumbnail ?? "",
        });
        const jf = post.job_field;
        const f: PostForm = {
            slug: post.slug,
            title: post.title,
            description: post.description ?? "",
            pub_date: new Date(
                new Date(post.pub_date).getTime() + 9 * 60 * 60 * 1000
            )
                .toISOString()
                .slice(0, 16),
            category: post.category ?? "",
            tags: post.tags.join(", "),
            jobField: normalizeUniqueJobFieldList(jf),
            thumbnail: post.thumbnail ?? "",
            content: post.content,
            published: post.published,
            meta_title: post.meta_title ?? "",
            meta_description: post.meta_description ?? "",
            og_image: post.og_image ?? "",
        };
        initialFormRef.current = f;
        savedSlugRef.current = post.slug;
        setSlugLocked(true);
        setForm(f);
        setEditTarget(post);
        onEditPathChange?.(`edit/${post.slug}`);
        setError(null);
        setSuccess(null);
    };

    // 신규 생성 화면 열기
    const openNew = () => {
        const base: PostForm = {
            ...EMPTY_FORM,
            jobField: getInitialJobFieldSelection(activeJobField),
        };
        initialFormRef.current = base;
        savedSlugRef.current = "";
        setSlugLocked(false);
        setForm(base);
        setEditTarget("new");
        onEditPathChange?.("new");
        setError(null);
        setSuccess(null);
    };

    // slug 변경 시 에셋 이전
    const migrateAssetsIfNeeded = async (): Promise<string> => {
        const oldSlug = savedSlugRef.current;
        const newSlug = form.slug;
        if (!oldSlug || oldSlug === newSlug) return form.content;
        setTransferring(true);
        try {
            await moveStorageFolder(`blog/${oldSlug}`, `blog/${newSlug}`);
            await rewriteEditorSnapshotUrls(
                "post",
                oldSlug,
                `blog/${oldSlug}`,
                `blog/${newSlug}`
            );
            const updated = replaceImageUrls(
                form.content,
                `blog/${oldSlug}`,
                `blog/${newSlug}`
            );
            setForm((f) => ({ ...f, content: updated }));
            savedSlugRef.current = newSlug;
            return updated;
        } finally {
            setTransferring(false);
        }
    };

    // 자동 저장 (DB에 직접 저장)
    const autoSave = async () => {
        if (!form.title || !form.slug) return;
        const migratedContent = await migrateAssetsIfNeeded();
        const payload = { ...buildPayload(), content: migratedContent };
        const result = await savePost(
            payload,
            editTarget === "new" ? null : editTarget?.id
        );
        if (result.success) {
            initialFormRef.current = form;
            savedSlugRef.current = result.post.slug;
            setEditTarget(result.post);
        }
    };

    const { savedAt: autoSavedAt, saving: autoSaving } = useAutoSave(
        isDirty,
        editTarget !== null,
        autoSave
    );

    // 수동 저장 (신규 insert / 수정 update)
    const handleSave = useCallback(async () => {
        if (!form.title || !form.slug) {
            setError("제목과 slug는 필수입니다.");
            return;
        }
        setSaving(true);
        setError(null);

        const migratedContent = await migrateAssetsIfNeeded();
        const payload = { ...buildPayload(), content: migratedContent };
        const result = await savePost(
            payload,
            editTarget === "new" ? null : (editTarget as Post).id
        );

        setSaving(false);
        if (!result.success) {
            setError(result.error);
        } else {
            initialFormRef.current = form;
            savedSlugRef.current = result.post.slug;
            setSuccess("저장 완료");
            void loadPosts();
            if (editTarget === "new") setEditTarget(null);
        }
    }, [form, editTarget]);

    useKeyboardSave(handleSave);

    // 목록으로 이탈 (dirty 확인 포함)
    const handleBack = async () => {
        if (!(await confirmLeave())) return;
        setEditTarget(null);
        onEditPathChange?.("");
        setMetadataOpen(false);
        void loadPosts();
    };

    // 삭제 (스토리지 cleanup 포함)
    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "포스트 삭제",
            description: "정말 삭제하시겠습니까?",
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        // slug 확인 (스토리지 폴더 삭제용)
        const target = posts.find((p) => p.id === id);
        const result = await deletePostById(id);
        if (!result.success) setError(result.error ?? "삭제 실패");
        else {
            if (target?.slug) deleteStorageFolder(`blog/${target.slug}`);
            if (
                editTarget !== null &&
                editTarget !== "new" &&
                editTarget.id === id
            ) {
                setEditTarget(null);
                onEditPathChange?.("");
            }
            void loadPosts();
        }
    };

    // 발행/초안 토글
    const togglePublish = async (post: Post) => {
        await setPostPublished(post.id, post.slug, !post.published);
        void loadPosts();
    };

    // MetadataSheet onChange 핸들러
    const handleMetaChange = (field: string, value: unknown) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    // 발행 상태 즉시 저장 (Sheet 토글 시 DB 직접 반영)
    const handlePublishToggle = async (published: boolean) => {
        if (editTarget === null || editTarget === "new") return;
        await setPostPublished(editTarget.id, editTarget.slug, published);
        setPosts((prev) =>
            prev.map((p) => (p.id === editTarget.id ? { ...p, published } : p))
        );
    };

    const handleCreateCategory = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return false;

        const result = await createPostCategory(trimmed);
        if (!result.success) {
            setError(result.error ?? "카테고리 생성 실패");
            return false;
        }

        setCategories((current) =>
            [...new Set([...current, trimmed])].sort((a, b) =>
                a.localeCompare(b)
            )
        );
        setSuccess("카테고리가 생성되었습니다.");
        return true;
    };

    // editPath 복원 대기 중 (list 깜빡임 방지)
    if (editPath && !editTarget && !editPathRestoredRef.current) {
        return (
            <div className="flex items-center justify-center py-20">
                <span className="text-zinc-400">불러오는 중...</span>
            </div>
        );
    }

    // ── 편집 화면 ────────────────────────────────────────────
    if (editTarget !== null) {
        return (
            <div className="tablet:h-full tablet:overflow-hidden tablet:pb-0 flex w-full flex-col pb-20">
                {/* 헤더 */}
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        ← 목록
                    </button>
                    <button
                        disabled={!form.published}
                        onClick={() =>
                            window.open(`/blog/${form.slug}`, "_blank")
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        <ExternalLink size={15} />
                        미리보기
                    </button>
                    <button
                        onClick={() => setMetadataOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-muted) transition-colors hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)"
                    >
                        <Settings size={15} />
                        설정
                    </button>
                </div>
                <p className="text-center text-base text-(--color-muted)">
                    저장 후 미리보기를 한 번 방문하면 캐시가 갱신되어 방문자에게
                    즉시 제공됩니다.
                </p>

                {/* 제목 입력 */}
                <div className="px-1">
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => {
                            const t = e.target.value;
                            setForm((f) => ({
                                ...f,
                                title: t,
                                slug: slugLocked ? f.slug : toSlug(t),
                            }));
                        }}
                        placeholder="제목을 입력하세요"
                        className="w-full border-none bg-transparent py-4 text-3xl font-bold text-(--color-foreground) placeholder:text-(--color-muted) focus:outline-none"
                    />
                </div>
                {/* slug 입력 */}
                <div className="flex items-center gap-2 border-t border-(--color-border) px-1 py-2">
                    <span className="shrink-0 text-xs text-(--color-muted)">
                        /{slugLocked ? "🔒" : "🔓"}
                    </span>
                    <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => {
                            setSlugLocked(true);
                            setForm((f) => ({
                                ...f,
                                slug: e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")
                                    .replace(
                                        /[^a-z0-9가-힣ぁ-んァ-ヶ一-龥-]/g,
                                        ""
                                    )
                                    .slice(0, 80),
                            }));
                        }}
                        className="min-w-0 flex-1 bg-transparent text-xs text-(--color-muted) focus:text-(--color-foreground) focus:outline-none"
                    />
                    {slugLocked && (
                        <button
                            type="button"
                            onClick={() => {
                                setSlugLocked(false);
                                setForm((f) => ({
                                    ...f,
                                    slug: toSlug(f.title),
                                }));
                            }}
                            className="shrink-0 rounded bg-(--color-surface-subtle) px-2 py-0.5 text-xs text-(--color-muted) hover:text-(--color-foreground)"
                        >
                            자동 생성
                        </button>
                    )}
                </div>

                {/* 본문 에디터 */}
                <div className="tablet:min-h-0 min-h-[400px] flex-1">
                    <RichMarkdownEditor
                        value={form.content}
                        onChange={(c) => setForm((f) => ({ ...f, content: c }))}
                        placeholder="본문을 작성하세요. ## 제목, **굵게**, [링크](url) 등 마크다운 문법이 즉시 반영됩니다."
                        folderPath={`blog/${form.slug || "untitled"}`}
                        storageKey={`post_${form.slug || "new"}`}
                        onEditorReady={setEditorInstance}
                        transferring={transferring}
                        onSetThumbnail={(url) =>
                            setForm((f) => ({ ...f, thumbnail: url }))
                        }
                        onImagesRemoved={(urls) => {
                            const folder = `blog/${form.slug || "untitled"}`;
                            const keys = urls.flatMap((u) =>
                                extractKeysFromText(u, folder)
                            );
                            if (keys.length === 0) return;
                            const bases = Array.from(
                                new Set(keys.map(baseKey))
                            );
                            cleanupTrueOrphans({
                                folderPath: folder,
                                entityType: "post",
                                entitySlug: form.slug || "new",
                                currentContent: form.content,
                                thumbnail: form.thumbnail,
                                candidates: bases,
                            }).catch((e) => {
                                console.error(
                                    "[PostsPanel::onImagesRemoved] cleanup 실패",
                                    e
                                );
                            });
                        }}
                    />
                </div>

                {/* Sticky 저장 바 — error/success/안내 메시지를 좌측에 overlay */}
                <AdminSaveBar>
                    {error ? (
                        <span className="text-base font-medium text-red-500">
                            {error}
                        </span>
                    ) : success ? (
                        <span className="text-base font-medium text-green-600">
                            {success}
                        </span>
                    ) : (
                        <span className="text-base text-(--color-muted)">
                            저장 후 미리보기를 방문하면 캐시가 갱신됩니다.
                        </span>
                    )}
                    <div className="flex items-center gap-3">
                        <SaveIndicator
                            saving={autoSaving}
                            savedAt={autoSavedAt}
                            isDirty={isDirty}
                        />
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setStateModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-indigo-500 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
                                aria-label={`임시 저장 열기: ${snapshotCount}/6`}
                            >
                                <Clock3 className="h-4 w-4" />
                                <span>임시 저장</span>
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">
                                    {snapshotCount}/6
                                </span>
                            </button>
                            {editTarget !== "new" && (
                                <button
                                    onClick={() =>
                                        handleDelete((editTarget as Post).id)
                                    }
                                    className="rounded-lg bg-red-600 px-5 py-2 text-xl font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    삭제
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                                className="rounded-lg bg-green-500 px-5 py-2 text-xl font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 disabled:opacity-50 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                            >
                                {saving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </AdminSaveBar>

                {/* MetadataSheet */}
                <MetadataSheet
                    open={metadataOpen}
                    onOpenChange={setMetadataOpen}
                    type="post"
                    form={form}
                    onChange={handleMetaChange}
                    onPublishToggle={handlePublishToggle}
                    jobFields={jobFields}
                    categories={categories}
                    onCreateCategory={handleCreateCategory}
                    tocStyle={postTocStyles[form.slug] ?? "hover"}
                    onTocStyleChange={(style) => {
                        if (form.slug) saveTocStyle(form.slug, style);
                    }}
                    tocDisabled={!form.slug}
                    folderPath={`blog/${form.slug || "untitled"}`}
                />

                <EditorStatePreservation
                    editor={editorInstance}
                    entityType="post"
                    entitySlug={form.slug || "new"}
                    currentContent={form.content}
                    isOpen={stateModalOpen}
                    onClose={() => setStateModalOpen(false)}
                    onSnapshotCountChange={(total) => setSnapshotCount(total)}
                    folderPath={`blog/${form.slug || "untitled"}`}
                    thumbnail={form.thumbnail}
                />
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
                const arr = normalizeUniqueJobFieldList(jf);
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
        if (selected.size === 0) return;
        setBatchSaving(true);
        await batchSetPostPublished([...selected], publish);
        setBatchSaving(false);
        setSelected(new Set());
        void loadPosts();
        showToast(
            `${selected.size}개 포스트를 ${publish ? "Published" : "Draft"}로 변경했습니다.`
        );
    };

    const batchSetJobField = async () => {
        if (selected.size === 0 || !batchJobField) return;
        setBatchSaving(true);
        await batchSetPostJobField([...selected], batchJobField);
        setBatchSaving(false);
        setSelected(new Set());
        setBatchJobField("");
        void loadPosts();
        showToast(`${selected.size}개 포스트의 직무 분야를 변경했습니다.`);
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* 고정 header: title + filter */}
            <div className="shrink-0 pt-1 pb-4">
                {/* 헤더 */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        블로그 포스트
                    </h2>
                    <button
                        onClick={openNew}
                        className="rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        + 새 포스트
                    </button>
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
                                e.target.value as "all" | "published" | "draft"
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
                    <div className="ml-auto flex items-center gap-1">
                        {[
                            {
                                key: "date_desc",
                                icon: <CalendarArrowDown className="h-4 w-4" />,
                                label: "최신순",
                            },
                            {
                                key: "date_asc",
                                icon: <CalendarArrowUp className="h-4 w-4" />,
                                label: "오래된순",
                            },
                            {
                                key: "title_az",
                                icon: <ArrowUpAZ className="h-4 w-4" />,
                                label: "제목 A→Z",
                            },
                            {
                                key: "title_za",
                                icon: <ArrowDownAZ className="h-4 w-4" />,
                                label: "제목 Z→A",
                            },
                            {
                                key: "published_first",
                                icon: <Eye className="h-4 w-4" />,
                                label: "Published 먼저",
                            },
                            {
                                key: "draft_first",
                                icon: <EyeOff className="h-4 w-4" />,
                                label: "Draft 먼저",
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
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
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
                                    className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-400 disabled:opacity-50 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
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

                {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

                {loading ? (
                    <p className="text-sm text-(--color-muted)">
                        불러오는 중...
                    </p>
                ) : displayedPosts.length === 0 ? (
                    <p className="text-sm text-(--color-muted)">
                        {posts.length === 0
                            ? "포스트가 없습니다."
                            : "필터 조건에 맞는 포스트가 없습니다."}
                    </p>
                ) : (
                    <>
                        {/* 전체 선택 행 */}
                        <div className="shrink-0 border-b border-(--color-border)">
                            <div className="flex items-center gap-3 px-2 py-2">
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
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {displayedPosts.map((post) => {
                                const hasJobField =
                                    !!post.job_field &&
                                    (Array.isArray(post.job_field)
                                        ? post.job_field.length > 0
                                        : true);
                                const stateCount = stateCounts[post.slug] ?? 0;
                                return (
                                    <div
                                        key={post.id}
                                        className={`group flex items-center gap-3 border-b border-(--color-border) px-2 py-3 transition-colors hover:bg-(--color-surface-subtle) ${
                                            stateCount > 0
                                                ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20"
                                                : ""
                                        } ${
                                            selected.has(post.id)
                                                ? "bg-(--color-surface-subtle)"
                                                : ""
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(post.id)}
                                            onChange={() =>
                                                toggleSelect(post.id)
                                            }
                                            className="h-4 w-4 flex-shrink-0 cursor-pointer rounded"
                                        />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                                                        post.published
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                                    }`}
                                                >
                                                    {post.published ? (
                                                        <Eye size={10} />
                                                    ) : (
                                                        <EyeOff size={10} />
                                                    )}
                                                    {post.published
                                                        ? "Published"
                                                        : "Draft"}
                                                </span>
                                                {!hasJobField && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="text-xs"
                                                    >
                                                        <AlertTriangle
                                                            size={10}
                                                        />
                                                        직무 분야 없음
                                                    </Badge>
                                                )}
                                                {stateCount > 0 && (
                                                    <span className="rounded-lg bg-yellow-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-yellow-900">
                                                        상태: {stateCount}
                                                    </span>
                                                )}
                                                {post.category && (
                                                    <span className="text-xs text-(--color-muted)">
                                                        {post.category}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-sm font-semibold text-(--color-foreground)">
                                                {post.title}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs text-(--color-muted)">
                                                    {post.slug}
                                                </span>
                                                <span className="text-xs text-(--color-muted)">
                                                    {new Date(
                                                        post.pub_date
                                                    ).toLocaleDateString(
                                                        "ko-KR"
                                                    )}
                                                </span>
                                                <JobFieldBadges
                                                    value={post.job_field}
                                                    fields={jobFields}
                                                />
                                                {post.tags
                                                    .slice(0, 3)
                                                    .map((t, index) => (
                                                        <span
                                                            key={`${t}-${index}`}
                                                            className="rounded-lg bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                {post.tags.length > 3 && (
                                                    <span className="text-xs text-(--color-muted)">
                                                        +{post.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="tablet:opacity-0 tablet:group-hover:opacity-100 flex shrink-0 items-center gap-1 transition-opacity">
                                            <button
                                                onClick={() =>
                                                    togglePublish(post)
                                                }
                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                                    post.published
                                                        ? "bg-amber-500"
                                                        : "bg-green-600"
                                                }`}
                                            >
                                                {post.published ? (
                                                    <EyeOff size={12} />
                                                ) : (
                                                    <Eye size={12} />
                                                )}
                                                <span className="tablet:inline hidden">
                                                    {post.published
                                                        ? "Unpublish"
                                                        : "Publish"}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => openEdit(post)}
                                                className="flex items-center gap-1 rounded-lg bg-(--color-accent) px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                            >
                                                <Pencil size={12} />
                                                <span className="tablet:inline hidden">
                                                    편집
                                                </span>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(post.id)
                                                }
                                                className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                            >
                                                <Trash2 size={12} />
                                                <span className="tablet:inline hidden">
                                                    삭제
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* 토스트 알림 */}
                {toast && (
                    <div className="fixed right-6 bottom-6 z-100 rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
}
