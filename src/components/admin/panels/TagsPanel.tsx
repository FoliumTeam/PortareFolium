"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
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
        if (!browserClient) return;
        setLoading(true);
        const { data, error } = await browserClient
            .from("tags")
            .select("slug, name, color")
            .order("name");
        if (error) setError(error.message);
        else setTags(data ?? []);
        setLoading(false);
    };

    const loadCategories = async () => {
        if (!browserClient) return;
        setCatLoading(true);
        const { data, error } = await browserClient
            .from("posts")
            .select("category")
            .not("category", "is", null);
        if (!error && data) {
            const counts = new Map<string, number>();
            for (const row of data) {
                if (row.category?.trim()) {
                    counts.set(
                        row.category.trim(),
                        (counts.get(row.category.trim()) ?? 0) + 1
                    );
                }
            }
            setCategories(
                [...counts.entries()].map(([name, count]) => ({ name, count }))
            );
        }
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
        if (!browserClient || !form.name.trim()) {
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
        let err;
        if (editSlug === "new") {
            ({ error: err } = await browserClient.from("tags").insert(payload));
        } else {
            ({ error: err } = await browserClient
                .from("tags")
                .update(payload)
                .eq("slug", editSlug));
        }
        setSaving(false);
        if (err) setError(err.message);
        else {
            setSuccess("저장되었습니다.");
            setEditSlug(null);
            loadTags();
        }
    };

    const handleDelete = async (slug: string) => {
        if (!browserClient || !confirm(`태그 "${slug}"를 삭제할까요?`)) return;
        setSaving(true);
        const { error: err } = await browserClient
            .from("tags")
            .delete()
            .eq("slug", slug);
        setSaving(false);
        if (err) setError(err.message);
        else {
            setSuccess("삭제되었습니다.");
            setEditSlug(null);
            loadTags();
        }
    };

    // 카테고리 이름 변경 (모든 posts의 category 업데이트)
    const renameCategory = async (oldName: string, newName: string) => {
        if (!browserClient || !newName.trim() || newName.trim() === oldName)
            return;
        setSaving(true);
        const { error: err } = await browserClient
            .from("posts")
            .update({ category: newName.trim() })
            .eq("category", oldName);
        setSaving(false);
        if (err) setError(err.message);
        else {
            setSuccess("카테고리 이름이 변경되었습니다.");
            setEditCat(null);
            loadCategories();
        }
    };

    // 카테고리 삭제 (모든 posts의 category를 null로)
    const deleteCategory = async (name: string) => {
        if (
            !browserClient ||
            !confirm(
                `카테고리 "${name}"를 삭제할까요? 해당 카테고리를 사용하는 포스트의 카테고리가 초기화됩니다.`
            )
        )
            return;
        setSaving(true);
        const { error: err } = await browserClient
            .from("posts")
            .update({ category: null })
            .eq("category", name);
        setSaving(false);
        if (err) setError(err.message);
        else {
            setSuccess("카테고리가 삭제되었습니다.");
            loadCategories();
        }
    };

    const cancel = () => {
        setEditSlug(null);
        setEditCat(null);
        setError(null);
        setSuccess(null);
    };

    if (!browserClient) {
        return (
            <p className="text-(--color-muted)">
                Supabase가 설정되지 않았습니다.
            </p>
        );
    }

    return (
        <div className="space-y-6">
            {/* 탭 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-1">
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
                    <Button onClick={openNew}>
                        <Plus size={15} />새 태그
                    </Button>
                )}
            </div>

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
                                {editSlug === "new" ? "태그 추가" : "태그 수정"}
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
                                <div className="flex items-center gap-2">
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
                                                                e.target.value
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
                                                                e.target.value
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
                                                                e.target.value
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
                                >
                                    {saving ? "저장 중..." : "저장"}
                                </Button>
                                <Button variant="ghost" onClick={cancel}>
                                    취소
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 정렬 컨트롤 */}
                    {editSlug === null && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-(--color-muted)">
                                정렬
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    setTagSortAndSave(
                                        tagSort === "az" ? "za" : "az"
                                    )
                                }
                            >
                                {tagSort === "az" ? (
                                    <ArrowUpAZ size={14} />
                                ) : (
                                    <ArrowDownAZ size={14} />
                                )}
                                이름 {tagSort === "az" ? "A→Z" : "Z→A"}
                            </Button>
                        </div>
                    )}

                    {/* 태그 목록 */}
                    {loading ? (
                        <p className="text-(--color-muted)">로딩 중...</p>
                    ) : sortedTags.length === 0 ? (
                        <p className="text-(--color-muted)">
                            등록된 태그가 없습니다. 새 태그를 추가하세요.
                        </p>
                    ) : (
                        <ul className="divide-y divide-(--color-border)">
                            {sortedTags.map((tag) => (
                                <li
                                    key={tag.slug}
                                    className="group flex items-center justify-between py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* 색상 dot */}
                                        {tag.color ? (
                                            <span
                                                className="h-3 w-3 rounded-full"
                                                style={{
                                                    backgroundColor: tag.color,
                                                }}
                                            />
                                        ) : (
                                            <span className="h-3 w-3 rounded-full bg-(--color-border)" />
                                        )}
                                        <span className="font-medium text-(--color-foreground)">
                                            {tag.name}
                                        </span>
                                        <Badge variant="secondary">
                                            {tag.slug}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEdit(tag)}
                                        >
                                            <Pencil size={13} />
                                            수정
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleDelete(tag.slug)
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
                    )}
                </>
            )}

            {/* ── 카테고리 탭 ── */}
            {tab === "categories" && (
                <>
                    {/* 정렬 컨트롤 */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-(--color-muted)">
                            정렬
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setCatSortAndSave(
                                    catSort === "az" ? "za" : "az"
                                )
                            }
                        >
                            {catSort === "az" ? (
                                <ArrowUpAZ size={14} />
                            ) : (
                                <ArrowDownAZ size={14} />
                            )}
                            이름 {catSort === "az" ? "A→Z" : "Z→A"}
                        </Button>
                    </div>

                    <p className="text-sm text-(--color-muted)">
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
                        <ul className="divide-y divide-(--color-border)">
                            {sortedCats.map((cat) => (
                                <li key={cat.name} className="py-3">
                                    {editCat === cat.name ? (
                                        // 이름 편집 행
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={catForm}
                                                onChange={(e) =>
                                                    setCatForm(e.target.value)
                                                }
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        renameCategory(
                                                            cat.name,
                                                            catForm
                                                        );
                                                    if (e.key === "Escape")
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
                                                    saving || !catForm.trim()
                                                }
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
                                        <div className="group flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-(--color-foreground)">
                                                    {cat.name}
                                                </span>
                                                <Badge variant="secondary">
                                                    포스트 {cat.count}개
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditCat(cat.name);
                                                        setCatForm(cat.name);
                                                        setError(null);
                                                        setSuccess(null);
                                                    }}
                                                >
                                                    <Pencil size={13} />
                                                    이름 변경
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        deleteCategory(cat.name)
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
                    )}
                </>
            )}
        </div>
    );
}
