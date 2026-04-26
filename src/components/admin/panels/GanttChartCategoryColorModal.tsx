"use client";

import { useState } from "react";
import { saveGanttChartArchiveCategories } from "@/app/admin/actions/gantt-chart";
import { Button } from "@/components/ui/button";
import type { GanttChartArchive } from "@/lib/gantt-chart";

type CategoryEntry = {
    originalName: string;
    newName: string;
    color: string;
};

type Props = {
    archive: GanttChartArchive;
    onClose: () => void;
    onSaved: () => void;
};

const getAccentColor = (): string => {
    if (typeof window === "undefined") return "#059669";
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent")
        .trim();
    return value || "#059669";
};

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export default function GanttChartCategoryColorModal({
    archive,
    onClose,
    onSaved,
}: Props) {
    const [entries, setEntries] = useState<CategoryEntry[]>(() => {
        const uniqueCategories = [
            ...new Set(archive.tasks.map((t) => t.category).filter(Boolean)),
        ];
        const accent = getAccentColor();
        return uniqueCategories.map((name) => ({
            originalName: name,
            newName: name,
            color: archive.categoryColors[name] ?? accent,
        }));
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateEntry = (originalName: string, patch: Partial<CategoryEntry>) =>
        setEntries((prev) =>
            prev.map((entry) =>
                entry.originalName === originalName
                    ? { ...entry, ...patch }
                    : entry
            )
        );

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        const categoryColors: Record<string, string> = {};
        for (const entry of entries) {
            const key = entry.newName.trim() || entry.originalName;
            categoryColors[key] = entry.color;
        }

        const nameMap = new Map(
            entries.map((e) => [
                e.originalName,
                e.newName.trim() || e.originalName,
            ])
        );
        const updatedTasks = archive.tasks.map((task) => ({
            ...task,
            category: nameMap.get(task.category) ?? task.category,
        }));

        try {
            const result = await saveGanttChartArchiveCategories({
                id: archive.id,
                categoryColors,
                tasks: updatedTasks,
            });
            if (!result.success) {
                setError(result.error);
                return;
            }
            onSaved();
        } catch (err) {
            setError(getErrorMessage(err, "저장 오류"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex h-[80vh] w-[50vw] flex-col overflow-hidden rounded-2xl bg-(--color-surface) shadow-2xl">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-6 py-4">
                    <h2 className="text-lg font-bold text-(--color-foreground)">
                        Category Colors
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => void handleSave()}
                            disabled={saving}
                            className="bg-green-600 text-white hover:bg-green-500"
                        >
                            <span className="whitespace-nowrap">
                                {saving ? "저장 중..." : "저장"}
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={onClose}
                            className="bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                        >
                            닫기
                        </Button>
                    </div>
                </div>

                {error && (
                    <p className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                        {error}
                    </p>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    {entries.length === 0 ? (
                        <p className="text-sm text-(--color-muted)">
                            이 차트에 category가 없습니다. 차트를 먼저 편집하여
                            category를 추가하세요.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry) => (
                                <div
                                    key={entry.originalName}
                                    className="flex items-center gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                                >
                                    <input
                                        type="text"
                                        value={entry.newName}
                                        onChange={(e) =>
                                            updateEntry(entry.originalName, {
                                                newName: e.target.value,
                                            })
                                        }
                                        className="min-w-0 flex-1 bg-transparent text-sm text-(--color-foreground) focus:outline-none"
                                        placeholder="Category name"
                                    />
                                    <button
                                        type="button"
                                        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border-2 border-(--color-border) shadow-sm transition-transform hover:scale-110"
                                        style={{
                                            backgroundColor: entry.color,
                                        }}
                                        title={entry.color}
                                    >
                                        <input
                                            type="color"
                                            value={entry.color}
                                            onChange={(e) =>
                                                updateEntry(
                                                    entry.originalName,
                                                    {
                                                        color: e.target.value,
                                                    }
                                                )
                                            }
                                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
