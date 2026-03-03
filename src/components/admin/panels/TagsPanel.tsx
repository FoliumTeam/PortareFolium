/**
 * TagsPanel
 *
 * 블로그 태그 목록 조회, 생성, 편집, 삭제.
 * Admin UI에서 태그를 관리하며 Supabase tags 테이블에 저장.
 */
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";

interface Tag {
    slug: string;
    name: string;
    color: string | null;
}

export default function TagsPanel() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [editSlug, setEditSlug] = useState<string | null>(null);
    const [form, setForm] = useState({ slug: "", name: "", color: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadTags = async () => {
        if (!browserClient) return;
        setLoading(true);
        const { data, error } = await browserClient
            .from("tags")
            .select("slug, name, color")
            .order("slug");
        if (error) setError(error.message);
        else setTags(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        loadTags();
    }, []);

    const toSlug = (name: string) =>
        name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-가-힣]/g, "")
            .replace(/-+/g, "-")
            .slice(0, 80);

    const openNew = () => {
        setForm({ slug: "", name: "", color: "" });
        setEditSlug("new");
        setError(null);
        setSuccess(null);
    };

    const openEdit = (tag: Tag) => {
        setForm({
            slug: tag.slug,
            name: tag.name,
            color: tag.color ?? "",
        });
        setEditSlug(tag.slug);
        setError(null);
        setSuccess(null);
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

    const cancel = () => {
        setEditSlug(null);
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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-(--color-foreground)">
                    태그 관리
                </h2>
                {editSlug === null && (
                    <button
                        type="button"
                        onClick={openNew}
                        className="rounded-lg bg-(--color-accent) px-4 py-2 font-medium text-(--color-on-accent) transition-opacity hover:opacity-90"
                    >
                        새 태그
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-lg bg-red-100 p-3 text-base text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-lg bg-green-100 p-3 text-base text-green-700 dark:bg-green-950/50 dark:text-green-300">
                    {success}
                </div>
            )}

            {editSlug !== null ? (
                <div className="max-w-md space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-6">
                    <h3 className="font-semibold text-(--color-foreground)">
                        {editSlug === "new" ? "태그 추가" : "태그 수정"}
                    </h3>
                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            slug (URL/식별자)
                        </label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, slug: e.target.value }))
                            }
                            placeholder={toSlug(form.name) || "자동 생성"}
                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-(--color-foreground)"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            표시 이름 *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    name: e.target.value,
                                    slug: f.slug || toSlug(e.target.value),
                                }))
                            }
                            placeholder="예: Unreal Engine 5"
                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-(--color-foreground)"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            색상 (hex, rgb 등)
                        </label>
                        <input
                            type="text"
                            value={form.color}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    color: e.target.value,
                                }))
                            }
                            placeholder="#3b82f6"
                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-(--color-foreground)"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !form.name.trim()}
                            className="rounded-lg bg-(--color-accent) px-4 py-2 font-medium text-(--color-on-accent) hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? "저장 중..." : "저장"}
                        </button>
                        <button
                            type="button"
                            onClick={cancel}
                            className="rounded-lg border border-(--color-border) px-4 py-2 text-(--color-muted) hover:bg-(--color-surface-subtle)"
                        >
                            취소
                        </button>
                    </div>
                </div>
            ) : null}

            {loading ? (
                <p className="text-(--color-muted)">로딩 중...</p>
            ) : tags.length === 0 ? (
                <p className="text-(--color-muted)">
                    등록된 태그가 없습니다. 새 태그를 추가하세요.
                </p>
            ) : (
                <ul className="space-y-2">
                    {tags.map((tag) => (
                        <li
                            key={tag.slug}
                            className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-3"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="rounded-full px-2 py-1 text-sm"
                                    style={
                                        tag.color
                                            ? {
                                                  backgroundColor: tag.color,
                                                  color: "#fff",
                                              }
                                            : undefined
                                    }
                                >
                                    {tag.name}
                                </span>
                                <span className="text-base text-(--color-muted)">
                                    {tag.slug}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEdit(tag)}
                                    className="rounded-lg border border-(--color-border) bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                >
                                    수정
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(tag.slug)}
                                    disabled={saving}
                                    className="rounded-lg border border-(--color-border) bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                >
                                    삭제
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
