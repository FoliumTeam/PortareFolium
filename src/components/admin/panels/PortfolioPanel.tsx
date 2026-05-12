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
    batchSetPortfolioJobField,
    batchSetPortfolioPublished,
    deletePortfolioItemById,
    getPortfolioPanelBootstrap,
    reorderFeaturedPortfolioItems,
    savePortfolioItem,
    setPortfolioFeatured,
    setPortfolioPublished,
} from "@/app/admin/actions/portfolio";
import {
    Eye,
    EyeOff,
    Star,
    StarOff,
    ArrowUpAZ,
    ArrowDownAZ,
    Pencil,
    Trash2,
    AlertTriangle,
    Settings,
    ExternalLink,
    Clock3,
    GripVertical,
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
import BooksSubPanel from "@/components/admin/panels/BooksSubPanel";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

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
    accomplishments: string;
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
    accomplishments: "",
    jobField: [],
    meta_title: "",
    meta_description: "",
    og_image: "",
};

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
        accomplishments: Array.isArray(d.accomplishments)
            ? (d.accomplishments as string[]).join("\n")
            : "",
        jobField: normalizeUniqueJobFieldList(
            d.jobField as string | string[] | null | undefined
        ),
        meta_title: item.meta_title ?? "",
        meta_description: item.meta_description ?? "",
        og_image: item.og_image ?? "",
    };
}

interface PortfolioPanelProps {
    editPath?: string;
    onEditPathChange?: (path: string) => void;
}

export default function PortfolioPanel({
    editPath = "",
    onEditPathChange,
}: PortfolioPanelProps) {
    const [tab, setTab] = useState<"portfolio" | "books">("portfolio");
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState<PortfolioItem | null | "new">(
        null
    );
    const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
    const [stateModalOpen, setStateModalOpen] = useState(false);
    const [snapshotCount, setSnapshotCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [slugLocked, setSlugLocked] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const savedSlugRef = useRef<string>("");
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
    // editor_states count (목록 yellow highlight용)
    const [stateCounts, setStateCounts] = useState<Record<string, number>>({});
    // 토스트 알림
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const setSortAndSave = (key: string) => {
        setSortKey(key);
        localStorage.setItem("portfolio_sort", key);
    };

    // dirty 상태
    const isDirty =
        editTarget !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const { confirmLeave } = useUnsavedWarning(isDirty);
    const { confirm } = useConfirmDialog();

    const loadItems = async () => {
        setLoading(true);
        const result = await getPortfolioPanelBootstrap();
        setItems(result.items);
        setStateCounts(result.stateCounts);
        setJobFields(dedupeJobFieldsById(result.jobFields));
        setActiveJobField(normalizeJobFieldValue(result.activeJobField));
        setLoading(false);
    };

    useEffect(() => {
        void loadItems();
    }, []);

    // editPath로 편집 상태 복원 (새로고침 시)
    const editPathRestoredRef = useRef(false);
    useEffect(() => {
        if (
            editPathRestoredRef.current ||
            !editPath ||
            loading ||
            !items.length
        )
            return;
        editPathRestoredRef.current = true;
        if (editPath === "new") {
            openNew();
        } else if (editPath.startsWith("edit/")) {
            const slug = editPath.slice(5);
            const item = items.find((i) => i.slug === slug);
            if (item) openEdit(item);
            else onEditPathChange?.("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editPath, loading, items]);

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
        job_field: form.jobField.length
            ? normalizeUniqueJobFieldList(form.jobField)
            : null,
        data: {
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            goal: form.goal || undefined,
            role: form.role || undefined,
            teamSize: form.teamSize ? Number(form.teamSize) : undefined,
            github: form.github || undefined,
            liveUrl: form.liveUrl || undefined,
            accomplishments: form.accomplishments
                ? form.accomplishments
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                : undefined,
            jobField: form.jobField.length
                ? normalizeUniqueJobFieldList(form.jobField)
                : undefined,
        },
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    });

    const openEdit = (item: PortfolioItem) => {
        void maybeCleanupOnOpen("portfolio", item.slug, {
            folderPath: `portfolio/${item.slug}`,
            entityType: "portfolio",
            entitySlug: item.slug,
            currentContent: item.content,
            thumbnail: item.thumbnail ?? "",
        });
        const f = itemToForm(item);
        initialFormRef.current = f;
        savedSlugRef.current = item.slug;
        setSlugLocked(true);
        setForm(f);
        setEditTarget(item);
        onEditPathChange?.(`edit/${item.slug}`);
        setError(null);
        setSuccess(null);
    };

    const openNew = () => {
        const base: ItemForm = {
            ...EMPTY_FORM,
            order_idx: items.length,
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
            await moveStorageFolder(
                `portfolio/${oldSlug}`,
                `portfolio/${newSlug}`
            );
            await rewriteEditorSnapshotUrls(
                "portfolio",
                oldSlug,
                `portfolio/${oldSlug}`,
                `portfolio/${newSlug}`
            );
            const updated = replaceImageUrls(
                form.content,
                `portfolio/${oldSlug}`,
                `portfolio/${newSlug}`
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
        const result = await savePortfolioItem(
            payload,
            editTarget === "new"
                ? null
                : (editTarget as PortfolioItem | null)?.id
        );
        if (result.success) {
            initialFormRef.current = form;
            savedSlugRef.current = result.item.slug;
            setEditTarget(result.item);
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
        const result = await savePortfolioItem(
            payload,
            editTarget === "new" ? null : (editTarget as PortfolioItem).id
        );

        setSaving(false);
        if (!result.success) {
            setError(result.error);
        } else {
            initialFormRef.current = form;
            savedSlugRef.current = result.item.slug;
            setSuccess("저장 완료");
            void loadItems();
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
        void loadItems();
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "프로젝트 삭제",
            description: "정말 삭제하시겠습니까?",
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        const target = items.find((i) => i.id === id);
        await deletePortfolioItemById(id);
        if (target?.slug) deleteStorageFolder(`portfolio/${target.slug}`);
        if (
            editTarget !== null &&
            editTarget !== "new" &&
            editTarget.id === id
        ) {
            setEditTarget(null);
            onEditPathChange?.("");
        }
        void loadItems();
    };

    const togglePublish = async (item: PortfolioItem) => {
        await setPortfolioPublished(item.id, item.slug, !item.published);
        void loadItems();
    };

    const toggleFeatured = async (item: PortfolioItem) => {
        if (!item.featured) {
            const featuredCount = items.filter((i) => i.featured).length;
            if (featuredCount >= 5) {
                showToast("Featured 항목은 최대 5개까지만 설정할 수 있습니다.");
                return;
            }
        }
        await setPortfolioFeatured(item.id, item.slug, !item.featured);
        void loadItems();
    };

    // Featured 순서 드래그 앤 드롭
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);

    const handleFeaturedReorder = async () => {
        if (
            dragItemRef.current === null ||
            dragOverItemRef.current === null ||
            dragItemRef.current === dragOverItemRef.current
        )
            return;

        const featuredItems = items
            .filter((i) => i.featured)
            .sort((a, b) => a.order_idx - b.order_idx);

        const reordered = [...featuredItems];
        const [dragged] = reordered.splice(dragItemRef.current, 1);
        reordered.splice(dragOverItemRef.current, 0, dragged);

        // order_idx 일괄 업데이트
        const updates = reordered.map((item, idx) => ({
            id: item.id,
            order_idx: idx,
        }));

        await reorderFeaturedPortfolioItems(updates);

        dragItemRef.current = null;
        dragOverItemRef.current = null;
        void loadItems();
    };

    // MetadataSheet onChange 핸들러
    const handleMetaChange = (field: string, value: unknown) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    // 발행 상태 즉시 저장 (Sheet 토글 시 DB 직접 반영)
    const handlePublishToggle = async (published: boolean) => {
        if (editTarget === null || editTarget === "new") return;
        await setPortfolioPublished(
            editTarget.id,
            (editTarget as PortfolioItem).slug,
            published
        );
        setItems((prev) =>
            prev.map((p) => (p.id === editTarget.id ? { ...p, published } : p))
        );
    };

    // editPath 복원 대기 중 (list 깜빡임 방지)
    if (editPath && !editTarget && !editPathRestoredRef.current) {
        return (
            <div className="flex items-center justify-center py-20">
                <span className="text-zinc-400">불러오는 중...</span>
            </div>
        );
    }

    // ── 편집 화면 (Ghost 에디터 레이아웃) ──
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
                            window.open(`/portfolio/${form.slug}`, "_blank")
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
                        placeholder="프로젝트 이름을 입력하세요"
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
                        placeholder="본문을 작성하세요. ## 제목, **굵게** 등 마크다운 문법이 즉시 반영됩니다."
                        folderPath={`portfolio/${form.slug || "untitled"}`}
                        storageKey={`portfolio_${form.slug || "new"}`}
                        onEditorReady={setEditorInstance}
                        transferring={transferring}
                        onSetThumbnail={(url) =>
                            setForm((f) => ({ ...f, thumbnail: url }))
                        }
                        onImagesRemoved={(urls) => {
                            const folder = `portfolio/${form.slug || "untitled"}`;
                            const keys = urls.flatMap((u) =>
                                extractKeysFromText(u, folder)
                            );
                            if (keys.length === 0) return;
                            const bases = Array.from(
                                new Set(keys.map(baseKey))
                            );
                            cleanupTrueOrphans({
                                folderPath: folder,
                                entityType: "portfolio",
                                entitySlug: form.slug || "new",
                                currentContent: form.content,
                                thumbnail: form.thumbnail,
                                candidates: bases,
                            }).catch((e) => {
                                console.error(
                                    "[PortfolioPanel::onImagesRemoved] cleanup 실패",
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
                                        handleDelete(
                                            (editTarget as PortfolioItem).id
                                        )
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
                    type="portfolio"
                    form={form}
                    onChange={handleMetaChange}
                    onPublishToggle={handlePublishToggle}
                    jobFields={jobFields}
                    folderPath={`portfolio/${form.slug || "untitled"}`}
                />

                <EditorStatePreservation
                    editor={editorInstance}
                    entityType="portfolio"
                    entitySlug={form.slug || "new"}
                    currentContent={form.content}
                    isOpen={stateModalOpen}
                    onClose={() => setStateModalOpen(false)}
                    onSnapshotCountChange={(total) => setSnapshotCount(total)}
                    folderPath={`portfolio/${form.slug || "untitled"}`}
                    thumbnail={form.thumbnail}
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
                const arr = normalizeUniqueJobFieldList(jf);
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
        if (selected.size === 0) return;
        setBatchSaving(true);
        await batchSetPortfolioPublished([...selected], publish);
        setBatchSaving(false);
        setSelected(new Set());
        void loadItems();
        showToast(
            `${selected.size}개 항목을 ${publish ? "Published" : "Draft"}로 변경했습니다.`
        );
    };

    const batchSetJobField = async () => {
        if (selected.size === 0 || !batchJobField) return;
        setBatchSaving(true);
        const selectedItems = items.filter((i) => selected.has(i.id));
        await batchSetPortfolioJobField(
            selectedItems.map((item) => ({
                id: item.id,
                data: { ...item.data, jobField: [batchJobField] },
            }))
        );
        setBatchSaving(false);
        setSelected(new Set());
        setBatchJobField("");
        void loadItems();
        showToast(`${selected.size}개 항목의 직무 분야를 변경했습니다.`);
    };

    const featuredCount = items.filter((i) => i.featured).length;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 bg-(--color-surface) pb-4">
                {/* 탭 */}
                <div className="flex gap-1 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-1">
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

                {tab === "portfolio" && (
                    <div className="pt-6">
                        <div className="flex items-center justify-between">
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
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={filterSearch}
                                onChange={(e) =>
                                    setFilterSearch(e.target.value)
                                }
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
                            <div className="ml-auto flex items-center gap-1">
                                {[
                                    {
                                        key: "order_idx",
                                        icon: (
                                            <GripVertical className="h-4 w-4" />
                                        ),
                                        label: "순서 (기본)",
                                    },
                                    {
                                        key: "title_az",
                                        icon: <ArrowUpAZ className="h-4 w-4" />,
                                        label: "제목 A→Z",
                                    },
                                    {
                                        key: "title_za",
                                        icon: (
                                            <ArrowDownAZ className="h-4 w-4" />
                                        ),
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
                                    {
                                        key: "featured_first",
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
                    </div>
                )}
            </div>

            {tab === "books" && (
                <div className="min-h-0 flex-1">
                    <BooksSubPanel
                        jobFields={jobFields}
                        activeJobField={activeJobField}
                    />
                </div>
            )}

            {tab === "portfolio" && (
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {/* Featured 순서 조정 */}
                    {items.filter((i) => i.featured).length > 0 && (
                        <div className="mb-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
                            <p className="mb-2 text-xs font-semibold tracking-wider text-(--color-accent) uppercase">
                                Featured 순서 (드래그하여 변경)
                            </p>
                            <div className="space-y-1">
                                {items
                                    .filter((i) => i.featured)
                                    .sort((a, b) => a.order_idx - b.order_idx)
                                    .map((item, idx) => (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={() => {
                                                dragItemRef.current = idx;
                                            }}
                                            onDragEnter={() => {
                                                dragOverItemRef.current = idx;
                                            }}
                                            onDragOver={(e) =>
                                                e.preventDefault()
                                            }
                                            onDragEnd={handleFeaturedReorder}
                                            className="flex cursor-grab items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 transition-colors hover:border-(--color-accent)/50 active:cursor-grabbing"
                                        >
                                            <GripVertical className="h-4 w-4 shrink-0 text-(--color-muted)" />
                                            <span className="font-mono text-xs font-bold text-(--color-accent)">
                                                {idx + 1}
                                            </span>
                                            <span className="truncate text-sm font-medium text-(--color-foreground)">
                                                {item.title}
                                            </span>
                                            {!item.published && (
                                                <span className="ml-auto shrink-0 rounded bg-(--color-border) px-1.5 py-0.5 text-[10px] font-medium text-(--color-muted)">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

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
                                const stateCount = stateCounts[item.slug] ?? 0;
                                return (
                                    <div
                                        key={item.id}
                                        className={`group flex items-center gap-3 border-b border-(--color-border) px-2 py-3 transition-colors hover:bg-(--color-surface-subtle) ${
                                            stateCount > 0
                                                ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20"
                                                : ""
                                        } ${
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
                                            className="h-4 w-4 shrink-0 cursor-pointer rounded"
                                        />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {item.featured && (
                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                                        <Star size={10} />{" "}
                                                        Featured
                                                    </span>
                                                )}
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
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
                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
                                                        <AlertTriangle
                                                            size={10}
                                                        />
                                                        직무 분야 없음
                                                    </span>
                                                )}
                                                {stateCount > 0 && (
                                                    <span className="rounded-lg bg-yellow-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-yellow-900">
                                                        상태: {stateCount}
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
                                                {tags
                                                    .slice(0, 3)
                                                    .map((t, index) => (
                                                        <span
                                                            key={`${t}-${index}`}
                                                            className="rounded-lg bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-fg)"
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
                                        <div className="tablet:opacity-0 tablet:group-hover:opacity-100 flex shrink-0 items-center gap-1 transition-opacity">
                                            <button
                                                onClick={() =>
                                                    toggleFeatured(item)
                                                }
                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 ${
                                                    item.featured
                                                        ? "bg-slate-500"
                                                        : "bg-(--color-accent)"
                                                }`}
                                            >
                                                {item.featured ? (
                                                    <StarOff size={12} />
                                                ) : (
                                                    <Star size={12} />
                                                )}
                                                <span className="tablet:inline hidden">
                                                    {item.featured
                                                        ? "Featured 해제"
                                                        : "Featured"}
                                                </span>
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
                                                <span className="tablet:inline hidden">
                                                    {item.published
                                                        ? "Unpublish"
                                                        : "Publish"}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="flex items-center gap-1 rounded-lg bg-(--color-accent) px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                                            >
                                                <Pencil size={12} />
                                                <span className="tablet:inline hidden">
                                                    편집
                                                </span>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(item.id)
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
                    )}

                    {/* 토스트 알림 */}
                    {toast && (
                        <div className="fixed right-6 bottom-6 z-100 rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-lg">
                            {toast}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
