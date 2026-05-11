"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ChevronDown,
    Eye,
    EyeOff,
    ExternalLink,
    FolderOpen,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    createPostCategory,
    deletePostCategory,
    deleteTagItem,
    getTagsPanelBootstrap,
    listPostsByCategoryName,
    listPostsByTagSlug,
    renamePostCategory,
    saveTagItem,
} from "@/app/admin/actions/tags";

type TagItem = {
    slug: string;
    name: string;
    color: string | null;
    count: number;
};

type Category = {
    name: string;
    count: number;
};

type ActiveTab = "tags" | "categories";
type SortOrder = "az" | "za";
type TagForm = {
    slug: string;
    name: string;
    color: string;
};

type ColorPreset = {
    label: string;
    value: string;
};

type TaxonomyPost = {
    id: string;
    slug: string;
    title: string;
    pub_date: string;
    published: boolean;
    updated_at: string;
};

type PostListState = Record<
    string,
    {
        loading: boolean;
        posts: TaxonomyPost[] | null;
        error: string | null;
    }
>;

const SORT_KEY = "admin_tag_sort";
const CAT_SORT_KEY = "admin_cat_sort";
const DEFAULT_OKLCH = { l: 0.6, c: 0.15, h: 250 };

const COLOR_PRESETS: ColorPreset[] = [
    { label: "Blue", value: "oklch(0.560 0.190 250)" },
    { label: "Violet", value: "oklch(0.560 0.190 305)" },
    { label: "Green", value: "oklch(0.560 0.150 150)" },
    { label: "Orange", value: "oklch(0.620 0.170 55)" },
];

const primaryButtonClassName =
    "bg-(--color-accent) text-(--color-on-accent) hover:opacity-90";
const secondaryButtonClassName =
    "bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-950 dark:hover:bg-zinc-300";
const successButtonClassName =
    "bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500";
const dangerButtonClassName =
    "bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500";

function getInitialSort(key: string): SortOrder {
    if (typeof window === "undefined") return "az";
    const saved = localStorage.getItem(key);
    return saved === "za" ? "za" : "az";
}

function toSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-가-힣]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

function parseOklch(value: string): typeof DEFAULT_OKLCH | null {
    const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (!match) return null;
    return {
        l: parseFloat(match[1]),
        c: parseFloat(match[2]),
        h: parseFloat(match[3]),
    };
}

function getSortLabel(order: SortOrder): string {
    return order === "az" ? "A→Z" : "Z→A";
}

function formatPostDate(value: string): string {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(value));
}

export default function TagsPanel() {
    const { confirm } = useConfirmDialog();
    const [tab, setTab] = useState<ActiveTab>("tags");
    const [tags, setTags] = useState<TagItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editSlug, setEditSlug] = useState<string | null>(null);
    const [editCat, setEditCat] = useState<string | null>(null);
    const [form, setForm] = useState<TagForm>({
        slug: "",
        name: "",
        color: "",
    });
    const [catForm, setCatForm] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [oklchL, setOklchL] = useState(DEFAULT_OKLCH.l);
    const [oklchC, setOklchC] = useState(DEFAULT_OKLCH.c);
    const [oklchH, setOklchH] = useState(DEFAULT_OKLCH.h);
    const [tagSort, setTagSort] = useState<SortOrder>(() =>
        getInitialSort(SORT_KEY)
    );
    const [catSort, setCatSort] = useState<SortOrder>(() =>
        getInitialSort(CAT_SORT_KEY)
    );
    const [tagSearch, setTagSearch] = useState("");
    const [catSearch, setCatSearch] = useState("");
    const [revealedTags, setRevealedTags] = useState<Set<string>>(
        () => new Set()
    );
    const [revealedCategories, setRevealedCategories] = useState<Set<string>>(
        () => new Set()
    );
    const [tagPostLists, setTagPostLists] = useState<PostListState>({});
    const [categoryPostLists, setCategoryPostLists] = useState<PostListState>(
        {}
    );

    const loadPanelData = async () => {
        setLoading(true);
        const result = await getTagsPanelBootstrap();
        setTags(result.tags);
        setCategories(result.categories);
        setLoading(false);
    };

    const clearPostRevealCache = () => {
        setRevealedTags(new Set());
        setRevealedCategories(new Set());
        setTagPostLists({});
        setCategoryPostLists({});
    };

    const refreshPanelData = async () => {
        clearPostRevealCache();
        await loadPanelData();
    };

    useEffect(() => {
        void loadPanelData();
    }, []);

    const sortedTags = useMemo(() => {
        const query = tagSearch.trim().toLowerCase();
        return [...tags]
            .filter((tag) => {
                if (!query) return true;
                return (
                    tag.name.toLowerCase().includes(query) ||
                    tag.slug.toLowerCase().includes(query)
                );
            })
            .sort((a, b) =>
                tagSort === "az"
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name)
            );
    }, [tagSearch, tagSort, tags]);

    const sortedCats = useMemo(() => {
        const query = catSearch.trim().toLowerCase();
        return [...categories]
            .filter((category) =>
                query ? category.name.toLowerCase().includes(query) : true
            )
            .sort((a, b) =>
                catSort === "az"
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name)
            );
    }, [catSearch, catSort, categories]);

    const setTagSortAndSave = (order: SortOrder) => {
        setTagSort(order);
        localStorage.setItem(SORT_KEY, order);
    };

    const setCatSortAndSave = (order: SortOrder) => {
        setCatSort(order);
        localStorage.setItem(CAT_SORT_KEY, order);
    };

    const resetOklch = () => {
        setOklchL(DEFAULT_OKLCH.l);
        setOklchC(DEFAULT_OKLCH.c);
        setOklchH(DEFAULT_OKLCH.h);
    };

    const applyOklch = (l: number, c: number, h: number) => {
        setOklchL(l);
        setOklchC(c);
        setOklchH(h);
        setForm((current) => ({
            ...current,
            color: `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`,
        }));
    };

    const openNew = () => {
        setForm({ slug: "", name: "", color: "" });
        setEditSlug("new");
        setEditCat(null);
        resetOklch();
        setError(null);
        setSuccess(null);
    };

    const openEdit = (tag: TagItem) => {
        setForm({ slug: tag.slug, name: tag.name, color: tag.color ?? "" });
        setEditSlug(tag.slug);
        setEditCat(null);
        setError(null);
        setSuccess(null);
        const parsed = parseOklch(tag.color ?? "");
        if (!parsed) return;
        setOklchL(parsed.l);
        setOklchC(parsed.c);
        setOklchH(parsed.h);
    };

    const openCategoryNew = () => {
        setEditCat("new");
        setEditSlug(null);
        setCatForm("");
        setError(null);
        setSuccess(null);
    };

    const openCategoryEdit = (name: string) => {
        setEditCat(name);
        setEditSlug(null);
        setCatForm(name);
        setError(null);
        setSuccess(null);
    };

    const cancel = () => {
        setEditSlug(null);
        setEditCat(null);
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError("태그 이름은 필수입니다.");
            return;
        }

        const slug = form.slug.trim() || toSlug(form.name);
        if (!slug) {
            setError("slug를 생성할 수 없습니다.");
            return;
        }

        setSaving(true);
        setError(null);
        const result = await saveTagItem(
            {
                slug,
                name: form.name.trim(),
                color: form.color.trim() || null,
            },
            editSlug
        );
        setSaving(false);

        if (!result.success) {
            setError(result.error ?? "태그 저장 실패");
            return;
        }

        setSuccess("태그가 저장되었습니다.");
        setEditSlug(null);
        clearPostRevealCache();
        void loadPanelData();
    };

    const handleDelete = async (slug: string) => {
        const ok = await confirm({
            title: "태그 삭제",
            description: `태그 "${slug}"를 삭제할까요?`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;

        setSaving(true);
        setError(null);
        const result = await deleteTagItem(slug);
        setSaving(false);

        if (!result.success) {
            setError(result.error ?? "태그 삭제 실패");
            return;
        }

        setSuccess("태그가 삭제되었습니다.");
        setEditSlug(null);
        clearPostRevealCache();
        void loadPanelData();
    };

    const saveCategory = async () => {
        const trimmed = catForm.trim();
        if (!trimmed) {
            setError("카테고리 이름은 필수입니다.");
            return;
        }
        if (!editCat) return;
        if (editCat !== "new" && trimmed === editCat) {
            cancel();
            return;
        }

        setSaving(true);
        setError(null);
        const result =
            editCat === "new"
                ? await createPostCategory(trimmed)
                : await renamePostCategory(editCat, trimmed);
        setSaving(false);

        if (!result.success) {
            setError(
                result.error ??
                    (editCat === "new"
                        ? "카테고리 생성 실패"
                        : "카테고리 이름 변경 실패")
            );
            return;
        }

        setSuccess(
            editCat === "new"
                ? "카테고리가 생성되었습니다."
                : "카테고리 이름이 변경되었습니다."
        );
        setEditCat(null);
        clearPostRevealCache();
        void loadPanelData();
    };

    const deleteCategory = async (name: string) => {
        const ok = await confirm({
            title: "카테고리 삭제",
            description: `카테고리 "${name}"를 삭제할까요? 이 카테고리를 사용하는 포스트의 category 값이 비워집니다.`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;

        setSaving(true);
        setError(null);
        const result = await deletePostCategory(name);
        setSaving(false);

        if (!result.success) {
            setError(result.error ?? "카테고리 삭제 실패");
            return;
        }

        setSuccess("카테고리가 삭제되었습니다.");
        clearPostRevealCache();
        void loadPanelData();
    };

    const applyPreset = (value: string) => {
        const parsed = parseOklch(value);
        setForm((current) => ({ ...current, color: value }));
        if (!parsed) return;
        setOklchL(parsed.l);
        setOklchC(parsed.c);
        setOklchH(parsed.h);
    };

    const toggleTagPosts = async (slug: string) => {
        if (revealedTags.has(slug)) {
            setRevealedTags((current) => {
                const next = new Set(current);
                next.delete(slug);
                return next;
            });
            return;
        }

        setRevealedTags((current) => new Set(current).add(slug));
        if (tagPostLists[slug]?.posts || tagPostLists[slug]?.loading) return;

        setTagPostLists((current) => ({
            ...current,
            [slug]: { loading: true, posts: null, error: null },
        }));
        const result = await listPostsByTagSlug(slug);
        setTagPostLists((current) => ({
            ...current,
            [slug]: {
                loading: false,
                posts: result.success ? (result.posts ?? []) : null,
                error: result.success
                    ? null
                    : (result.error ?? "포스트 목록 조회 실패"),
            },
        }));
    };

    const toggleCategoryPosts = async (name: string) => {
        if (revealedCategories.has(name)) {
            setRevealedCategories((current) => {
                const next = new Set(current);
                next.delete(name);
                return next;
            });
            return;
        }

        setRevealedCategories((current) => new Set(current).add(name));
        if (
            categoryPostLists[name]?.posts ||
            categoryPostLists[name]?.loading
        ) {
            return;
        }

        setCategoryPostLists((current) => ({
            ...current,
            [name]: { loading: true, posts: null, error: null },
        }));
        const result = await listPostsByCategoryName(name);
        setCategoryPostLists((current) => ({
            ...current,
            [name]: {
                loading: false,
                posts: result.success ? (result.posts ?? []) : null,
                error: result.success
                    ? null
                    : (result.error ?? "포스트 목록 조회 실패"),
            },
        }));
    };

    const confirmEditPost = async (post: TaxonomyPost) => {
        const ok = await confirm({
            title: "포스트 편집으로 이동",
            description: `"${post.title}" 편집 화면으로 이동할까요? 현재 TagsPanel 화면을 벗어납니다.`,
            confirmText: "편집으로 이동",
            cancelText: "취소",
        });
        if (!ok) return;
        window.location.hash = `#posts/edit/${post.slug}`;
    };

    const viewPost = (post: TaxonomyPost) => {
        window.open(`/blog/${post.slug}`, "_blank", "noopener,noreferrer");
    };

    const renderPostList = (state: PostListState[string] | undefined) => {
        if (!state) return null;

        if (state.loading) {
            return (
                <p className="mt-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 text-sm text-(--color-muted)">
                    포스트 불러오는 중...
                </p>
            );
        }

        if (state.error) {
            return (
                <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {state.error}
                </p>
            );
        }

        if (!state.posts || state.posts.length === 0) {
            return (
                <p className="mt-4 rounded-xl border border-dashed border-(--color-border) bg-(--color-surface) p-3 text-sm text-(--color-muted)">
                    이 항목을 사용하는 포스트가 없습니다.
                </p>
            );
        }

        return (
            <div className="mt-4 space-y-2">
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    Used posts · pub_date 최신순 · 최대 20개
                </p>
                <ScrollArea
                    className="max-h-72 rounded-xl border border-(--color-border) bg-(--color-surface)"
                    viewportClassName="max-h-72"
                >
                    <div className="p-3">
                        <ul className="space-y-2">
                            {state.posts.map((post) => (
                                <li
                                    key={post.id}
                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold break-words text-(--color-foreground)">
                                                {post.title}
                                            </p>
                                            <p className="mt-1 text-xs break-all text-(--color-muted)">
                                                {post.slug}
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                post.published
                                                    ? "border-green-700 bg-green-600 text-white dark:border-green-500 dark:bg-green-600 dark:text-white"
                                                    : "border-amber-700 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-600 dark:text-white"
                                            }
                                        >
                                            {post.published
                                                ? "Published"
                                                : "Draft"}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-(--color-muted)">
                                        <span>
                                            pub_date{" "}
                                            {formatPostDate(post.pub_date)}
                                        </span>
                                        <span>
                                            updated_at{" "}
                                            {formatPostDate(post.updated_at)}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => viewPost(post)}
                                            className={secondaryButtonClassName}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                포스트 보기
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                confirmEditPost(post)
                                            }
                                            className={primaryButtonClassName}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                포스트 편집
                                            </span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </ScrollArea>
            </div>
        );
    };

    const renderTagForm = () => (
        <section className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-(--color-muted) uppercase">
                        Tag editor
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-(--color-foreground)">
                        {editSlug === "new" ? "새 태그 추가" : "태그 수정"}
                    </h3>
                    <p className="mt-1 text-sm text-(--color-muted)">
                        이름, slug, 색상을 한 번에 관리합니다.
                    </p>
                </div>
                <Button
                    type="button"
                    onClick={cancel}
                    className={secondaryButtonClassName}
                >
                    <X className="h-4 w-4" />
                    <span className="whitespace-nowrap">편집 닫기</span>
                </Button>
            </div>

            <div className="laptop:grid-cols-[minmax(0,1fr)_18rem] mt-5 grid gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-(--color-foreground)">
                            표시 이름
                        </label>
                        <Input
                            value={form.name}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                    slug:
                                        current.slug ||
                                        toSlug(event.target.value),
                                }))
                            }
                            placeholder="예: Unreal Engine 5"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-(--color-foreground)">
                            slug
                        </label>
                        <Input
                            value={form.slug}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    slug: event.target.value,
                                }))
                            }
                            placeholder={toSlug(form.name) || "자동 생성"}
                        />
                        <p className="mt-1 text-xs text-(--color-muted)">
                            URL과 데이터 식별자로 사용됩니다.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-(--color-foreground)">
                            색상 값
                        </label>
                        <div className="tablet:flex-row flex flex-col gap-2">
                            <Input
                                value={form.color}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setForm((current) => ({
                                        ...current,
                                        color: value,
                                    }));
                                    const parsed = parseOklch(value);
                                    if (!parsed) return;
                                    setOklchL(parsed.l);
                                    setOklchC(parsed.c);
                                    setOklchH(parsed.h);
                                }}
                                placeholder="oklch(0.600 0.150 250)"
                            />
                            <div className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2">
                                <span
                                    className="h-5 w-5 shrink-0 rounded-full border border-(--color-border)"
                                    style={{
                                        backgroundColor:
                                            form.color || "var(--color-border)",
                                    }}
                                />
                                <span className="text-xs font-semibold whitespace-nowrap text-(--color-muted)">
                                    미리보기
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
                    <div>
                        <p className="text-sm font-semibold text-(--color-foreground)">
                            빠른 색상 선택
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => applyPreset(preset.value)}
                                    className="rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: preset.value }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <Button
                                type="button"
                                className={`w-full ${secondaryButtonClassName}`}
                            >
                                <ChevronDown className="h-4 w-4" />
                                <span className="whitespace-nowrap">
                                    OKLCH Picker 열기
                                </span>
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-3 space-y-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4">
                                <div>
                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                        <span>Lightness</span>
                                        <span>{oklchL.toFixed(3)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.001}
                                        value={oklchL}
                                        onChange={(event) =>
                                            applyOklch(
                                                parseFloat(event.target.value),
                                                oklchC,
                                                oklchH
                                            )
                                        }
                                        className="w-full cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, oklch(0 0 ${oklchH}), oklch(1 0 ${oklchH}))`,
                                            accentColor: "var(--color-accent)",
                                        }}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                        <span>Chroma</span>
                                        <span>{oklchC.toFixed(3)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={0.4}
                                        step={0.001}
                                        value={oklchC}
                                        onChange={(event) =>
                                            applyOklch(
                                                oklchL,
                                                parseFloat(event.target.value),
                                                oklchH
                                            )
                                        }
                                        className="w-full cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, oklch(${oklchL} 0 ${oklchH}), oklch(${oklchL} 0.4 ${oklchH}))`,
                                            accentColor: "var(--color-accent)",
                                        }}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                        <span>Hue</span>
                                        <span>{oklchH.toFixed(0)}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={360}
                                        step={1}
                                        value={oklchH}
                                        onChange={(event) =>
                                            applyOklch(
                                                oklchL,
                                                oklchC,
                                                parseFloat(event.target.value)
                                            )
                                        }
                                        className="w-full cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, oklch(${oklchL} ${oklchC} 0), oklch(${oklchL} ${oklchC} 60), oklch(${oklchL} ${oklchC} 120), oklch(${oklchL} ${oklchC} 180), oklch(${oklchL} ${oklchC} 240), oklch(${oklchL} ${oklchC} 300), oklch(${oklchL} ${oklchC} 360))`,
                                            accentColor: "var(--color-accent)",
                                        }}
                                    />
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className={successButtonClassName}
                >
                    <Save className="h-4 w-4" />
                    <span className="whitespace-nowrap">
                        {saving ? "태그 저장 중..." : "태그 저장"}
                    </span>
                </Button>
                <Button
                    type="button"
                    onClick={cancel}
                    className={secondaryButtonClassName}
                >
                    <X className="h-4 w-4" />
                    <span className="whitespace-nowrap">취소</span>
                </Button>
            </div>
        </section>
    );

    return (
        <div className="space-y-6 overflow-hidden overflow-x-hidden">
            <div className="sticky top-0 z-10 space-y-4 bg-(--color-surface) pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] text-(--color-muted) uppercase">
                            Content taxonomy
                        </p>
                        <h2 className="mt-1 text-3xl font-bold tracking-tight text-(--color-foreground)">
                            태그 · 카테고리 관리
                        </h2>
                        <p className="mt-1 text-sm text-(--color-muted)">
                            포스트 분류에 쓰이는 태그와 카테고리를 이 패널에서
                            관리합니다.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            onClick={refreshPanelData}
                            disabled={loading}
                            className={secondaryButtonClassName}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${
                                    loading ? "animate-spin" : ""
                                }`}
                            />
                            <span className="whitespace-nowrap">
                                {loading ? "새로고침 중..." : "목록 새로고침"}
                            </span>
                        </Button>
                        <Button
                            type="button"
                            onClick={tab === "tags" ? openNew : openCategoryNew}
                            className={primaryButtonClassName}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="whitespace-nowrap">
                                {tab === "tags"
                                    ? "새 태그 추가"
                                    : "새 카테고리 추가"}
                            </span>
                        </Button>
                    </div>
                </div>

                <div className="tablet:grid-cols-2 grid gap-3">
                    <button
                        type="button"
                        onClick={() => setTab("tags")}
                        className={`rounded-2xl border p-4 text-left transition-opacity hover:opacity-90 ${
                            tab === "tags"
                                ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                                : "border-zinc-700 bg-zinc-800 text-white dark:border-zinc-600 dark:bg-zinc-700"
                        }`}
                    >
                        <span className="flex items-center gap-2 text-sm font-bold whitespace-nowrap">
                            <Tag className="h-4 w-4" />
                            태그 관리
                        </span>
                        <span className="mt-2 block text-2xl font-black">
                            {tags.length}
                        </span>
                        <span className="text-xs opacity-80">
                            생성, 수정, 색상 변경, 삭제
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("categories")}
                        className={`rounded-2xl border p-4 text-left transition-opacity hover:opacity-90 ${
                            tab === "categories"
                                ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                                : "border-zinc-700 bg-zinc-800 text-white dark:border-zinc-600 dark:bg-zinc-700"
                        }`}
                    >
                        <span className="flex items-center gap-2 text-sm font-bold whitespace-nowrap">
                            <FolderOpen className="h-4 w-4" />
                            카테고리 관리
                        </span>
                        <span className="mt-2 block text-2xl font-black">
                            {categories.length}
                        </span>
                        <span className="text-xs opacity-80">
                            생성, 이름 변경, 사용 포스트 확인, 삭제
                        </span>
                    </button>
                </div>

                <div className="laptop:flex-row laptop:items-center laptop:justify-between flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-3">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--color-muted)" />
                        <Input
                            value={tab === "tags" ? tagSearch : catSearch}
                            onChange={(event) =>
                                tab === "tags"
                                    ? setTagSearch(event.target.value)
                                    : setCatSearch(event.target.value)
                            }
                            placeholder={
                                tab === "tags"
                                    ? "태그 이름 또는 slug 검색"
                                    : "카테고리 이름 검색"
                            }
                            className="pl-9"
                        />
                    </div>
                    <Button
                        type="button"
                        onClick={() =>
                            tab === "tags"
                                ? setTagSortAndSave(
                                      tagSort === "az" ? "za" : "az"
                                  )
                                : setCatSortAndSave(
                                      catSort === "az" ? "za" : "az"
                                  )
                        }
                        className={secondaryButtonClassName}
                    >
                        {tab === "tags" ? (
                            tagSort === "az" ? (
                                <ArrowUpAZ className="h-4 w-4" />
                            ) : (
                                <ArrowDownAZ className="h-4 w-4" />
                            )
                        ) : catSort === "az" ? (
                            <ArrowUpAZ className="h-4 w-4" />
                        ) : (
                            <ArrowDownAZ className="h-4 w-4" />
                        )}
                        <span className="whitespace-nowrap">
                            정렬:{" "}
                            {tab === "tags"
                                ? getSortLabel(tagSort)
                                : getSortLabel(catSort)}
                        </span>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
                    {success}
                </div>
            )}

            {tab === "tags" && (
                <div className="space-y-4">
                    {editSlug !== null && renderTagForm()}

                    {loading ? (
                        <p className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5 text-sm text-(--color-muted)">
                            태그를 불러오는 중...
                        </p>
                    ) : sortedTags.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) p-6 text-center">
                            <Tag className="mx-auto h-8 w-8 text-(--color-muted)" />
                            <p className="mt-3 font-semibold text-(--color-foreground)">
                                표시할 태그가 없습니다.
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                                검색어를 지우거나 새 태그를 추가하세요.
                            </p>
                        </div>
                    ) : (
                        <div className="laptop:grid-cols-2 grid gap-3">
                            {sortedTags.map((tag) => (
                                <article
                                    key={tag.slug}
                                    className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-4 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className="mt-1 h-5 w-5 shrink-0 rounded-full border border-(--color-border)"
                                            style={{
                                                backgroundColor:
                                                    tag.color ??
                                                    "var(--color-border)",
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-lg font-bold break-words text-(--color-foreground)">
                                                {tag.name}
                                            </h3>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="max-w-full break-all"
                                                >
                                                    slug: {tag.slug}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    사용 포스트 {tag.count}개
                                                </Badge>
                                                {tag.color && (
                                                    <Badge
                                                        variant="outline"
                                                        className="max-w-full break-all"
                                                    >
                                                        {tag.color}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                toggleTagPosts(tag.slug)
                                            }
                                            className={secondaryButtonClassName}
                                        >
                                            {revealedTags.has(tag.slug) ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                            <span className="whitespace-nowrap">
                                                {revealedTags.has(tag.slug)
                                                    ? "사용 포스트 숨기기"
                                                    : "사용 포스트 보기"}
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => openEdit(tag)}
                                            className={primaryButtonClassName}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                태그 수정
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                handleDelete(tag.slug)
                                            }
                                            disabled={saving}
                                            className={dangerButtonClassName}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                태그 삭제
                                            </span>
                                        </Button>
                                    </div>
                                    {revealedTags.has(tag.slug) &&
                                        renderPostList(tagPostLists[tag.slug])}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === "categories" && (
                <div className="space-y-4">
                    {editCat === "new" && (
                        <section className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold tracking-[0.18em] text-(--color-muted) uppercase">
                                        Category editor
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-(--color-foreground)">
                                        새 카테고리 추가
                                    </h3>
                                    <p className="mt-1 text-sm text-(--color-muted)">
                                        포스트에 아직 쓰이지 않은 카테고리도
                                        먼저 등록할 수 있습니다.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={cancel}
                                    className={secondaryButtonClassName}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="whitespace-nowrap">
                                        편집 닫기
                                    </span>
                                </Button>
                            </div>
                            <div className="mt-5">
                                <label className="mb-1 block text-sm font-semibold text-(--color-foreground)">
                                    카테고리 이름
                                </label>
                                <Input
                                    value={catForm}
                                    onChange={(event) =>
                                        setCatForm(event.target.value)
                                    }
                                    autoFocus
                                    placeholder="예: Technical Art"
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            void saveCategory();
                                        }
                                        if (event.key === "Escape") {
                                            cancel();
                                        }
                                    }}
                                />
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    onClick={saveCategory}
                                    disabled={saving || !catForm.trim()}
                                    className={successButtonClassName}
                                >
                                    <Save className="h-4 w-4" />
                                    <span className="whitespace-nowrap">
                                        {saving
                                            ? "카테고리 저장 중..."
                                            : "카테고리 저장"}
                                    </span>
                                </Button>
                                <Button
                                    type="button"
                                    onClick={cancel}
                                    className={secondaryButtonClassName}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="whitespace-nowrap">
                                        취소
                                    </span>
                                </Button>
                            </div>
                        </section>
                    )}

                    {loading ? (
                        <p className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-5 text-sm text-(--color-muted)">
                            카테고리를 불러오는 중...
                        </p>
                    ) : sortedCats.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) p-6 text-center">
                            <FolderOpen className="mx-auto h-8 w-8 text-(--color-muted)" />
                            <p className="mt-3 font-semibold text-(--color-foreground)">
                                표시할 카테고리가 없습니다.
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                                포스트에 category 값을 추가하면 이 목록에
                                표시됩니다.
                            </p>
                        </div>
                    ) : (
                        <div className="laptop:grid-cols-2 grid gap-3">
                            {sortedCats.map((category) => (
                                <article
                                    key={category.name}
                                    className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-4 shadow-sm"
                                >
                                    {editCat === category.name ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-(--color-foreground)">
                                                    새 카테고리 이름
                                                </label>
                                                <Input
                                                    value={catForm}
                                                    onChange={(event) =>
                                                        setCatForm(
                                                            event.target.value
                                                        )
                                                    }
                                                    autoFocus
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key ===
                                                            "Enter"
                                                        ) {
                                                            void saveCategory();
                                                        }
                                                        if (
                                                            event.key ===
                                                            "Escape"
                                                        ) {
                                                            cancel();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        saveCategory()
                                                    }
                                                    disabled={
                                                        saving ||
                                                        !catForm.trim()
                                                    }
                                                    className={
                                                        successButtonClassName
                                                    }
                                                >
                                                    <Save className="h-4 w-4" />
                                                    <span className="whitespace-nowrap">
                                                        이름 저장
                                                    </span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={cancel}
                                                    className={
                                                        secondaryButtonClassName
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                    <span className="whitespace-nowrap">
                                                        취소
                                                    </span>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent)/12 text-(--color-accent)">
                                                    <FolderOpen className="h-4 w-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-bold break-words text-(--color-foreground)">
                                                        {category.name}
                                                    </h3>
                                                    <div className="mt-2">
                                                        <Badge variant="secondary">
                                                            사용 포스트{" "}
                                                            {category.count}개
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleCategoryPosts(
                                                            category.name
                                                        )
                                                    }
                                                    className={
                                                        secondaryButtonClassName
                                                    }
                                                >
                                                    {revealedCategories.has(
                                                        category.name
                                                    ) ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                    <span className="whitespace-nowrap">
                                                        {revealedCategories.has(
                                                            category.name
                                                        )
                                                            ? "사용 포스트 숨기기"
                                                            : "사용 포스트 보기"}
                                                    </span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        openCategoryEdit(
                                                            category.name
                                                        )
                                                    }
                                                    className={
                                                        primaryButtonClassName
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="whitespace-nowrap">
                                                        카테고리 이름 변경
                                                    </span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        deleteCategory(
                                                            category.name
                                                        )
                                                    }
                                                    disabled={saving}
                                                    className={
                                                        dangerButtonClassName
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="whitespace-nowrap">
                                                        카테고리 삭제
                                                    </span>
                                                </Button>
                                            </div>
                                            {revealedCategories.has(
                                                category.name
                                            ) &&
                                                renderPostList(
                                                    categoryPostLists[
                                                        category.name
                                                    ]
                                                )}
                                        </>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
