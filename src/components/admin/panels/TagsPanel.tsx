"use client";

import { useEffect, useState } from "react";
import {
    ArrowUpAZ,
    ArrowDownAZ,
    Pencil,
    Trash2,
    Plus,
    FolderOpen,
    Tag,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    deletePostCategory,
    deleteTagItem,
    getTagsPanelBootstrap,
    renamePostCategory,
    saveTagItem,
} from "@/app/admin/actions/tags";

interface TagItem {
    slug: string;
    name: string;
    color: string | null;
}

interface Category {
    name: string;
    count: number;
}

type ActiveTab = "tags" | "categories";
type SortOrder = "az" | "za";

const SORT_KEY = "admin_tag_sort";
const CAT_SORT_KEY = "admin_cat_sort";

export default function TagsPanel() {
    const { confirm } = useConfirmDialog();
    const [tab, setTab] = useState<ActiveTab>("tags");

    // 태그 상태
    const [tags, setTags] = useState<TagItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editSlug, setEditSlug] = useState<string | null>(null);
    const [form, setForm] = useState({ slug: "", name: "", color: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    // OKLCH Picker 상태
    const [oklchL, setOklchL] = useState(0.6);
    const [oklchC, setOklchC] = useState(0.15);
    const [oklchH, setOklchH] = useState(250);
    // 태그 정렬
    const [tagSort, setTagSort] = useState<SortOrder>(
        () =>
            (typeof window !== "undefined"
                ? (localStorage.getItem(SORT_KEY) as SortOrder)
                : null) ?? "az"
    );

    // 카테고리 상태
    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);
    const [editCat, setEditCat] = useState<string | null>(null);
    const [catForm, setCatForm] = useState("");
    const [catSort, setCatSort] = useState<SortOrder>(
        () =>
            (typeof window !== "undefined"
                ? (localStorage.getItem(CAT_SORT_KEY) as SortOrder)
                : null) ?? "az"
    );

    const loadTags = async () => {
        setLoading(true);
        const result = await getTagsPanelBootstrap();
        setTags(result.tags);
        setCategories(result.categories);
        setLoading(false);
    };

    const loadCategories = async () => {
        setCatLoading(true);
        const result = await getTagsPanelBootstrap();
        setCategories(result.categories);
        setCatLoading(false);
    };

    useEffect(() => {
        loadTags();
    }, []);

    useEffect(() => {
        if (tab === "categories" && categories.length === 0) loadCategories();
    }, [tab]);

    const setTagSortAndSave = (order: SortOrder) => {
        setTagSort(order);
        localStorage.setItem(SORT_KEY, order);
    };

    const setCatSortAndSave = (order: SortOrder) => {
        setCatSort(order);
        localStorage.setItem(CAT_SORT_KEY, order);
    };

    // 정렬된 태그
    const sortedTags = [...tags].sort((a, b) =>
        tagSort === "az"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
    );

    // 정렬된 카테고리
    const sortedCats = [...categories].sort((a, b) =>
        catSort === "az"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
    );

    const toSlug = (name: string) =>
        name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-가-힣]/g, "")
            .replace(/-+/g, "-")
            .slice(0, 80);

    // oklch(L C H) 문자열 파싱
    const parseOklch = (s: string) => {
        const m = s.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (!m) return null;
        return {
            l: parseFloat(m[1]),
            c: parseFloat(m[2]),
            h: parseFloat(m[3]),
        };
    };

    const applyOklch = (l: number, c: number, h: number) => {
        setOklchL(l);
        setOklchC(c);
        setOklchH(h);
        setForm((f) => ({
            ...f,
            color: `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`,
        }));
    };

    const openNew = () => {
        setForm({ slug: "", name: "", color: "" });
        setEditSlug("new");
        setError(null);
        setSuccess(null);
    };

    const openEdit = (tag: TagItem) => {
        setForm({ slug: tag.slug, name: tag.name, color: tag.color ?? "" });
        setEditSlug(tag.slug);
        setError(null);
        setSuccess(null);
        const parsed = parseOklch(tag.color ?? "");
        if (parsed) {
            setOklchL(parsed.l);
            setOklchC(parsed.c);
            setOklchH(parsed.h);
        }
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
        const payload = {
            slug,
            name: form.name.trim(),
            color: form.color.trim() || null,
        };
        const result = await saveTagItem(payload, editSlug);
        setSaving(false);
        if (!result.success) setError(result.error ?? "저장 실패");
        else {
            setSuccess("저장되었습니다.");
            setEditSlug(null);
            void loadTags();
        }
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
        const result = await deleteTagItem(slug);
        setSaving(false);
        if (!result.success) setError(result.error ?? "삭제 실패");
        else {
            setSuccess("삭제되었습니다.");
            setEditSlug(null);
            void loadTags();
        }
    };

    // 카테고리 이름 변경 (모든 posts의 category 업데이트)
    const renameCategory = async (oldName: string, newName: string) => {
        if (!newName.trim() || newName.trim() === oldName) return;
        setSaving(true);
        const result = await renamePostCategory(oldName, newName);
        setSaving(false);
        if (!result.success) setError(result.error ?? "카테고리 변경 실패");
        else {
            setSuccess("카테고리 이름이 변경되었습니다.");
            setEditCat(null);
            void loadCategories();
        }
    };

    // 카테고리 삭제 (모든 posts의 category를 null로)
    const deleteCategory = async (name: string) => {
        const ok = await confirm({
            title: "카테고리 삭제",
            description: `카테고리 "${name}"를 삭제할까요? 해당 카테고리를 사용하는 포스트의 카테고리가 초기화됩니다.`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        setSaving(true);
        const result = await deletePostCategory(name);
        setSaving(false);
        if (!result.success) setError(result.error ?? "카테고리 삭제 실패");
        else {
            setSuccess("카테고리가 삭제되었습니다.");
            void loadCategories();
        }
    };

    const cancel = () => {
        setEditSlug(null);
        setEditCat(null);
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden">
            {/* 상단 고정 controls */}
            <div className="sticky top-0 z-10 shrink-0 space-y-3 bg-(--color-surface) pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-1">
                        <button
                            type="button"
                            onClick={() => setTab("tags")}
                            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === "tags"
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "text-(--color-muted) hover:text-(--color-foreground)"
                            }`}
                        >
                            <Tag size={14} />
                            태그
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("categories")}
                            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === "categories"
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "text-(--color-muted) hover:text-(--color-foreground)"
                            }`}
                        >
                            <FolderOpen size={14} />
                            카테고리
                        </button>
                    </div>

                    {tab === "tags" && editSlug === null && (
                        <button
                            type="button"
                            onClick={openNew}
                            className="flex items-center gap-2 rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                        >
                            <Plus size={15} />새 태그
                        </button>
                    )}
                </div>

                {tab === "tags" && editSlug === null && (
                    <div className="flex items-center justify-start">
                        <button
                            type="button"
                            onClick={() =>
                                setTagSortAndSave(
                                    tagSort === "az" ? "za" : "az"
                                )
                            }
                            title={`이름 ${tagSort === "az" ? "A→Z" : "Z→A"}`}
                            className="rounded-lg border border-(--color-accent) bg-(--color-accent)/10 px-2 py-1.5 text-(--color-accent) transition-colors hover:border-(--color-accent)/50"
                        >
                            {tagSort === "az" ? (
                                <ArrowUpAZ className="h-4 w-4" />
                            ) : (
                                <ArrowDownAZ className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                )}

                {tab === "categories" && (
                    <div className="flex items-center justify-start">
                        <button
                            type="button"
                            onClick={() =>
                                setCatSortAndSave(
                                    catSort === "az" ? "za" : "az"
                                )
                            }
                            title={`이름 ${catSort === "az" ? "A→Z" : "Z→A"}`}
                            className="rounded-lg border border-(--color-accent) bg-(--color-accent)/10 px-2 py-1.5 text-(--color-accent) transition-colors hover:border-(--color-accent)/50"
                        >
                            {catSort === "az" ? (
                                <ArrowUpAZ className="h-4 w-4" />
                            ) : (
                                <ArrowDownAZ className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            <div
                className={`flex min-h-0 flex-1 flex-col space-y-6 ${
                    tab === "tags" && editSlug === null
                        ? "overflow-hidden"
                        : "overflow-y-auto"
                }`}
            >
                {/* 피드백 */}
                {error && (
                    <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-lg bg-green-100 p-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
                        {success}
                    </div>
                )}

                {/* ── 태그 탭 ── */}
                {tab === "tags" && (
                    <>
                        {/* 태그 편집 폼 */}
                        {editSlug !== null && (
                            <div className="max-w-md space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-6">
                                <h3 className="font-semibold text-(--color-foreground)">
                                    {editSlug === "new"
                                        ? "태그 추가"
                                        : "태그 수정"}
                                </h3>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                        slug (URL/식별자)
                                    </label>
                                    <Input
                                        value={form.slug}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                slug: e.target.value,
                                            }))
                                        }
                                        placeholder={
                                            toSlug(form.name) || "자동 생성"
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                        표시 이름 *
                                    </label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                name: e.target.value,
                                                slug:
                                                    f.slug ||
                                                    toSlug(e.target.value),
                                            }))
                                        }
                                        placeholder="예: Unreal Engine 5"
                                    />
                                </div>

                                {/* 색상 + OKLCH Picker (Collapsible) */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                                        색상 (oklch, hex, rgb 등)
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Input
                                            value={form.color}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setForm((f) => ({
                                                    ...f,
                                                    color: v,
                                                }));
                                                const p = parseOklch(v);
                                                if (p) {
                                                    setOklchL(p.l);
                                                    setOklchC(p.c);
                                                    setOklchH(p.h);
                                                }
                                            }}
                                            placeholder="oklch(0.600 0.150 250)"
                                        />
                                        {form.color && (
                                            <span
                                                className="h-9 w-9 flex-shrink-0 rounded-lg border border-(--color-border)"
                                                style={{
                                                    backgroundColor: form.color,
                                                }}
                                            />
                                        )}
                                    </div>

                                    <Collapsible className="mt-3">
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1 text-(--color-accent)"
                                            >
                                                <ChevronDown size={14} />
                                                OKLCH Picker
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="mt-2 space-y-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
                                                <div>
                                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                                        <span>Lightness</span>
                                                        <span>
                                                            {oklchL.toFixed(3)}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={1}
                                                        step={0.001}
                                                        value={oklchL}
                                                        onChange={(e) =>
                                                            applyOklch(
                                                                parseFloat(
                                                                    e.target
                                                                        .value
                                                                ),
                                                                oklchC,
                                                                oklchH
                                                            )
                                                        }
                                                        className="w-full cursor-pointer"
                                                        style={{
                                                            background: `linear-gradient(to right, oklch(0 0 ${oklchH}), oklch(1 0 ${oklchH}))`,
                                                            accentColor:
                                                                "var(--color-accent)",
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                                        <span>Chroma</span>
                                                        <span>
                                                            {oklchC.toFixed(3)}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={0.4}
                                                        step={0.001}
                                                        value={oklchC}
                                                        onChange={(e) =>
                                                            applyOklch(
                                                                oklchL,
                                                                parseFloat(
                                                                    e.target
                                                                        .value
                                                                ),
                                                                oklchH
                                                            )
                                                        }
                                                        className="w-full cursor-pointer"
                                                        style={{
                                                            background: `linear-gradient(to right, oklch(${oklchL} 0 ${oklchH}), oklch(${oklchL} 0.4 ${oklchH}))`,
                                                            accentColor:
                                                                "var(--color-accent)",
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                                                        <span>Hue</span>
                                                        <span>
                                                            {oklchH.toFixed(0)}°
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={360}
                                                        step={1}
                                                        value={oklchH}
                                                        onChange={(e) =>
                                                            applyOklch(
                                                                oklchL,
                                                                oklchC,
                                                                parseFloat(
                                                                    e.target
                                                                        .value
                                                                )
                                                            )
                                                        }
                                                        className="w-full cursor-pointer"
                                                        style={{
                                                            background: `linear-gradient(to right, oklch(${oklchL} ${oklchC} 0), oklch(${oklchL} ${oklchC} 60), oklch(${oklchL} ${oklchC} 120), oklch(${oklchL} ${oklchC} 180), oklch(${oklchL} ${oklchC} 240), oklch(${oklchL} ${oklchC} 300), oklch(${oklchL} ${oklchC} 360))`,
                                                            accentColor:
                                                                "var(--color-accent)",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !form.name.trim()}
                                        className="bg-green-500 text-white hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                    >
                                        {saving ? "저장 중..." : "저장"}
                                    </Button>
                                    <Button variant="ghost" onClick={cancel}>
                                        취소
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 태그 목록 */}
                        {editSlug === null &&
                            (loading ? (
                                <p className="text-(--color-muted)">
                                    로딩 중...
                                </p>
                            ) : sortedTags.length === 0 ? (
                                <p className="text-(--color-muted)">
                                    등록된 태그가 없습니다. 새 태그를
                                    추가하세요.
                                </p>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-y-auto">
                                    <ul className="divide-y divide-(--color-border)">
                                        {sortedTags.map((tag) => (
                                            <li
                                                key={tag.slug}
                                                className="group tablet:flex-row tablet:items-center tablet:justify-between flex flex-col items-start gap-3 py-3"
                                            >
                                                <div className="flex min-w-0 flex-wrap items-center gap-3">
                                                    {/* 색상 dot */}
                                                    {tag.color ? (
                                                        <span
                                                            className="h-3 w-3 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    tag.color,
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="h-3 w-3 rounded-full bg-(--color-border)" />
                                                    )}
                                                    <span className="min-w-0 font-medium text-(--color-foreground)">
                                                        {tag.name}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="max-w-full break-all"
                                                    >
                                                        {tag.slug}
                                                    </Badge>
                                                </div>
                                                <div className="tablet:opacity-0 tablet:group-hover:opacity-100 tablet:self-auto flex flex-wrap gap-1 self-end transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            openEdit(tag)
                                                        }
                                                    >
                                                        <Pencil size={13} />
                                                        수정
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDelete(
                                                                tag.slug
                                                            )
                                                        }
                                                        disabled={saving}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 size={13} />
                                                        삭제
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                    </>
                )}

                {/* ── 카테고리 탭 ── */}
                {tab === "categories" && (
                    <>
                        <p className="shrink-0 text-sm text-(--color-muted)">
                            포스트에서 사용 중인 카테고리 목록입니다. 이름을
                            변경하면 해당 카테고리를 사용하는 모든 포스트에
                            반영됩니다.
                        </p>

                        {catLoading ? (
                            <p className="text-(--color-muted)">로딩 중...</p>
                        ) : sortedCats.length === 0 ? (
                            <p className="text-(--color-muted)">
                                사용 중인 카테고리가 없습니다.
                            </p>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <ul className="divide-y divide-(--color-border)">
                                    {sortedCats.map((cat) => (
                                        <li key={cat.name} className="py-3">
                                            {editCat === cat.name ? (
                                                // 이름 편집 행
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Input
                                                        value={catForm}
                                                        onChange={(e) =>
                                                            setCatForm(
                                                                e.target.value
                                                            )
                                                        }
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            )
                                                                renameCategory(
                                                                    cat.name,
                                                                    catForm
                                                                );
                                                            if (
                                                                e.key ===
                                                                "Escape"
                                                            )
                                                                cancel();
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            renameCategory(
                                                                cat.name,
                                                                catForm
                                                            )
                                                        }
                                                        disabled={
                                                            saving ||
                                                            !catForm.trim()
                                                        }
                                                        className="bg-green-500 text-white hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                                    >
                                                        저장
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={cancel}
                                                    >
                                                        취소
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="group tablet:flex-row tablet:items-center tablet:justify-between flex flex-col items-start gap-3">
                                                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                                                        <span className="font-medium text-(--color-foreground)">
                                                            {cat.name}
                                                        </span>
                                                        <Badge variant="secondary">
                                                            포스트 {cat.count}개
                                                        </Badge>
                                                    </div>
                                                    <div className="tablet:opacity-0 tablet:group-hover:opacity-100 tablet:self-auto flex flex-wrap gap-1 self-end transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditCat(
                                                                    cat.name
                                                                );
                                                                setCatForm(
                                                                    cat.name
                                                                );
                                                                setError(null);
                                                                setSuccess(
                                                                    null
                                                                );
                                                            }}
                                                        >
                                                            <Pencil size={13} />
                                                            이름 변경
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                deleteCategory(
                                                                    cat.name
                                                                )
                                                            }
                                                            disabled={saving}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 size={13} />
                                                            삭제
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
