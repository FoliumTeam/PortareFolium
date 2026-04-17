"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { browserClient } from "@/lib/supabase";
import {
    parseGanttCsv,
    type GanttChartArchive,
    type GanttChartTask,
} from "@/lib/gantt-chart";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type RowDraft = {
    id: string;
    taskName: string;
    category: string;
    startDate: string;
    endDate: string;
    comment: string;
};

type Props = {
    mode: "create" | "edit";
    archive?: GanttChartArchive;
    onClose: () => void;
    onSaved: () => void;
};

const ARCHIVE_SELECT_FIELDS =
    "id, title, source_filename, csv_content, tasks, category_colors, bar_style, created_at, updated_at";

let _counter = 0;
const newId = () => `row-${(_counter += 1)}`;

const taskToRow = (task: GanttChartTask): RowDraft => ({
    id: newId(),
    taskName: task.taskName,
    category: task.category,
    startDate: task.startDate,
    endDate: task.endDate,
    comment: task.comment,
});

const makeEmptyRow = (): RowDraft => ({
    id: newId(),
    taskName: "",
    category: "",
    startDate: "",
    endDate: "",
    comment: "",
});

const defaultRows = (): RowDraft[] => Array.from({ length: 5 }, makeEmptyRow);

export default function GanttChartCreateModal({
    mode,
    archive,
    onClose,
    onSaved,
}: Props) {
    const { confirm } = useConfirmDialog();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [titleDraft, setTitleDraft] = useState(
        mode === "edit" ? (archive?.title ?? "") : ""
    );
    const [rows, setRows] = useState<RowDraft[]>(() =>
        mode === "edit" && archive
            ? archive.tasks.map(taskToRow)
            : defaultRows()
    );
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    const markDirty = () => setIsDirty(true);

    const handleClose = async () => {
        if (isDirty) {
            const ok = await confirm({
                title: "변경사항 버리기",
                description:
                    "저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?",
                confirmText: "버리기",
                cancelText: "취소",
                variant: "destructive",
            });
            if (!ok) return;
        }
        onClose();
    };

    const handleCsvImport = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        void file.text().then((content) => {
            try {
                const tasks = parseGanttCsv(content);
                setTitleDraft((t) => t || file.name.replace(/\.[^.]+$/, ""));
                setRows(tasks.map(taskToRow));
                markDirty();
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "CSV 파싱 오류");
            }
        });
        e.target.value = "";
    };

    const updateRow = (id: string, patch: Partial<RowDraft>) => {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
        );
        markDirty();
    };

    const addRow = () => {
        setRows((prev) => [...prev, makeEmptyRow()]);
        markDirty();
    };

    const removeRow = (id: string) => {
        setRows((prev) => prev.filter((row) => row.id !== id));
        markDirty();
    };

    const handleSave = async () => {
        if (!browserClient) return;
        const title = titleDraft.trim();
        if (!title) {
            setError("차트 제목을 입력하세요");
            return;
        }
        const filledRows = rows.filter(
            (r) => r.taskName.trim() || r.startDate || r.endDate
        );
        if (filledRows.length === 0) {
            setError("task를 하나 이상 입력하세요");
            return;
        }
        const tasks: GanttChartTask[] = filledRows.map((r) => ({
            taskName: r.taskName.trim() || "(unnamed)",
            category: r.category.trim(),
            startDate: r.startDate,
            endDate: r.endDate,
            comment: r.comment.trim(),
        }));
        setSaving(true);
        setError(null);
        try {
            if (mode === "create") {
                const { error: dbError } = await browserClient
                    .from("gantt_chart_archives")
                    .insert({
                        title,
                        source_filename: "",
                        csv_content: "",
                        tasks,
                        category_colors: {},
                        bar_style: "rounded",
                    })
                    .select(ARCHIVE_SELECT_FIELDS)
                    .single();
                if (dbError) throw new Error(dbError.message);
            } else {
                const { error: dbError } = await browserClient
                    .from("gantt_chart_archives")
                    .update({ title, tasks })
                    .eq("id", archive!.id);
                if (dbError) throw new Error(dbError.message);
            }
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "저장 오류");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex h-[80vh] w-[80vw] flex-col overflow-hidden rounded-2xl bg-(--color-surface) shadow-2xl">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-6 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="shrink-0 text-lg font-bold text-(--color-foreground)">
                            {mode === "create"
                                ? "새 Gantt Chart 생성"
                                : "Gantt Chart 편집"}
                        </h2>
                        <input
                            type="text"
                            value={titleDraft}
                            onChange={(e) => {
                                setTitleDraft(e.target.value);
                                markDirty();
                            }}
                            placeholder="차트 제목 입력"
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-1.5 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-nowrap">
                                CSV 파일로 채우기
                            </span>
                        </Button>
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
                            onClick={() => void handleClose()}
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

                {/* Table */}
                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-(--color-surface)">
                            <tr>
                                {[
                                    "Task Name",
                                    "Category",
                                    "Start Date",
                                    "End Date",
                                    "Comment",
                                    "",
                                ].map((label) => (
                                    <th
                                        key={label}
                                        className="border-b border-(--color-border) px-3 py-2 text-left text-xs font-semibold tracking-wider text-(--color-muted) uppercase"
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-(--color-border) hover:bg-(--color-surface-subtle)"
                                >
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="text"
                                            value={row.taskName}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    taskName: e.target.value,
                                                })
                                            }
                                            className="w-full min-w-[10rem] bg-transparent text-(--color-foreground) focus:outline-none"
                                            placeholder="Task name"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="text"
                                            value={row.category}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    category: e.target.value,
                                                })
                                            }
                                            className="w-full min-w-[8rem] bg-transparent text-(--color-foreground) focus:outline-none"
                                            placeholder="Category"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="date"
                                            value={row.startDate}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    startDate: e.target.value,
                                                })
                                            }
                                            className="bg-transparent text-(--color-foreground) focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="date"
                                            value={row.endDate}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    endDate: e.target.value,
                                                })
                                            }
                                            className="bg-transparent text-(--color-foreground) focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <input
                                            type="text"
                                            value={row.comment}
                                            onChange={(e) =>
                                                updateRow(row.id, {
                                                    comment: e.target.value,
                                                })
                                            }
                                            className="w-full min-w-[12rem] bg-transparent text-(--color-foreground) focus:outline-none"
                                            placeholder="Comment"
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="text-(--color-muted) hover:text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-(--color-border) px-6 py-3">
                    <Button
                        size="sm"
                        onClick={addRow}
                        className="bg-(--color-accent) text-(--color-on-accent) hover:opacity-90"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5 shrink-0" />행 추가
                    </Button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvImport}
            />
        </div>
    );
}
