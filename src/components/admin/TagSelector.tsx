"use client";

/**
 * TagSelector
 *
 * Supabase tags 테이블에서 태그 목록을 불러와,
 * 클릭으로 선택/해제하는 멀티 선택 UI.
 */
import { useEffect, useState } from "react";
import { listPublicTags } from "@/app/admin/actions/public-data";

interface Tag {
    slug: string;
    name: string;
    color: string | null;
}

interface TagSelectorProps {
    /** 선택된 태그 slug (쉼표 구분) */
    value: string;
    onChange: (value: string) => void;
    /** 추가 CSS 클래스 */
    className?: string;
    disabled?: boolean;
}

export default function TagSelector({
    value,
    onChange,
    className = "",
    disabled = false,
}: TagSelectorProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listPublicTags().then((data) => {
            setTags(data);
            setLoading(false);
        });
    }, []);

    const selected = new Set(
        value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
    );

    const tagSlugs = new Set(tags.map((t) => t.slug));
    const orphanSlugs = [...selected].filter((s) => !tagSlugs.has(s));

    const toggle = (slug: string) => {
        if (disabled) return;
        const next = new Set(selected);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        onChange([...next].join(", "));
    };

    const removeOrphan = (slug: string) => {
        if (disabled) return;
        const next = new Set(selected);
        next.delete(slug);
        onChange([...next].join(", "));
    };

    if (loading) {
        return (
            <div className={`text-base text-(--color-muted) ${className}`}>
                태그 불러오는 중...
            </div>
        );
    }

    if (tags.length === 0) {
        return (
            <div className={`space-y-2 ${className}`}>
                <p className="text-base text-(--color-muted)">
                    등록된 태그가 없습니다. Admin → 태그에서 먼저 추가하세요.
                </p>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="slug1, slug2 (직접 입력)"
                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                />
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex flex-wrap gap-2">
                {orphanSlugs.length > 0 && (
                    <>
                        {orphanSlugs.map((slug) => (
                            <span
                                key={slug}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-base text-amber-800 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-200"
                            >
                                {slug}
                                <button
                                    type="button"
                                    onClick={() => removeOrphan(slug)}
                                    disabled={disabled}
                                    className="text-sm hover:opacity-70"
                                    aria-label={`${slug} 제거`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </>
                )}
                {tags.map((tag) => {
                    const isSelected = selected.has(tag.slug);
                    return (
                        <button
                            key={tag.slug}
                            type="button"
                            onClick={() => toggle(tag.slug)}
                            disabled={disabled}
                            className={[
                                "rounded-lg border px-3 py-1.5 text-base font-medium transition-colors",
                                isSelected
                                    ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                                    : "border-(--color-border) bg-(--color-surface) text-(--color-foreground) hover:bg-(--color-surface-subtle)",
                                disabled ? "cursor-not-allowed opacity-50" : "",
                            ].join(" ")}
                            style={
                                isSelected && tag.color
                                    ? {
                                          backgroundColor: tag.color,
                                          borderColor: tag.color,
                                          color: "#fff",
                                      }
                                    : undefined
                            }
                        >
                            {tag.name}
                        </button>
                    );
                })}
            </div>
            <p className="text-sm text-(--color-muted)">
                클릭하여 선택/해제. 새 태그는 Admin → 태그에서 추가.
            </p>
        </div>
    );
}
