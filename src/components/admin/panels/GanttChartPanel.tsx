"use client";

import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent,
} from "react";
import {
    Download,
    Palette,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { browserClient } from "@/lib/supabase";
import {
    buildGanttTimeline,
    countTaskDays,
    normalizeStoredGanttTasks,
    type GanttChartArchive,
    type GanttChartBarStyle,
    type GanttChartTask,
} from "@/lib/gantt-chart";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import GanttChartCreateModal from "./GanttChartCreateModal";
import GanttChartCategoryColorModal from "./GanttChartCategoryColorModal";

type GanttChartArchiveRow = {
    id: string;
    title: string;
    source_filename: string;
    csv_content: string;
    tasks: unknown;
    category_colors: unknown;
    bar_style: string | null;
    created_at: string;
    updated_at: string;
};

type StatusMessage = {
    ok: boolean;
    text: string;
};

type GanttChartArchiveDraft = {
    title: string;
    barStyle: GanttChartBarStyle;
};

const ARCHIVE_SELECT_FIELDS =
    "id, title, source_filename, csv_content, tasks, category_colors, bar_style, created_at, updated_at";
const DAY_WIDTH = 44;
const BAR_TEXT_MIN_WIDTH = 96;
const BAR_DAY_COUNT_MIN_WIDTH = 152;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.5;
const DEFAULT_BAR_STYLE: GanttChartBarStyle = "rounded";

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("ko-KR");
const formatDateLabel = (value: string) => value.replace(/-/g, ".");
const buildDownloadName = (title: string) => {
    const normalized = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || "gantt-chart";
};
const normalizeBarStyle = (value: string | null): GanttChartBarStyle =>
    value === "square" ? "square" : DEFAULT_BAR_STYLE;
const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const mapArchiveRow = (row: GanttChartArchiveRow): GanttChartArchive => ({
    id: row.id,
    title: row.title,
    tasks: normalizeStoredGanttTasks(row.tasks),
    categoryColors:
        typeof row.category_colors === "object" &&
        row.category_colors !== null &&
        !Array.isArray(row.category_colors)
            ? (row.category_colors as Record<string, string>)
            : {},
    barStyle: row.bar_style === "square" ? "square" : "rounded",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const toArchiveDraft = (
    archive: Pick<GanttChartArchive, "title" | "barStyle">
): GanttChartArchiveDraft => ({
    title: archive.title,
    barStyle: archive.barStyle,
});

const GanttChartPreview = ({ archive }: { archive: GanttChartArchive }) => {
    const { days, months } = buildGanttTimeline(archive.tasks);
    const dayIndexMap = new Map(days.map((day, index) => [day.key, index]));
    const timelineWidth = days.length * DAY_WIDTH;
    const AXIS_COLOR = "#64748b";
    const GRID_COLOR = "#e2e8f0";
    const TRACK_COLOR = "#f8fafc";
    const WEEKEND_COLOR = "#f1f5f9";
    const DEFAULT_BAR_COLOR = "var(--color-accent)";

    return (
        <div className="min-w-max rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-8 space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">
                    {archive.title}
                </h3>
                <p className="text-sm" style={{ color: AXIS_COLOR }}>
                    {archive.tasks.length}개 task ·{" "}
                    {formatDateLabel(days[0]?.key ?? "")} -{" "}
                    {formatDateLabel(days[days.length - 1]?.key ?? "")}
                </p>
            </div>
            <div className="grid grid-cols-[18rem_minmax(0,1fr)] items-start gap-x-6 gap-y-4">
                <div className="space-y-1 pt-2">
                    <p
                        className="text-xs font-semibold tracking-[0.24em] uppercase"
                        style={{ color: AXIS_COLOR }}
                    >
                        Tasks
                    </p>
                    <p className="text-sm" style={{ color: AXIS_COLOR }}>
                        전체 기간 {days.length}일
                    </p>
                </div>
                <div className="space-y-3">
                    <div className="flex items-end">
                        {months.map((month) => (
                            <div
                                key={month.key}
                                className="text-sm font-semibold"
                                style={{
                                    width: month.span * DAY_WIDTH,
                                    color: AXIS_COLOR,
                                }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>
                    <div className="relative" style={{ width: timelineWidth }}>
                        <div className="flex">
                            {days.map((day) => (
                                <div
                                    key={day.key}
                                    className="text-center"
                                    style={{ width: DAY_WIDTH }}
                                >
                                    <p className="text-xs font-semibold text-slate-700">
                                        {day.dayNumber}
                                    </p>
                                    <p
                                        className="text-[10px]"
                                        style={{ color: AXIS_COLOR }}
                                    >
                                        {day.weekdayLabel}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div
                            className="pointer-events-none absolute inset-x-0 top-[calc(100%+0.75rem)] h-px"
                            style={{ backgroundColor: GRID_COLOR }}
                        />
                    </div>
                </div>
                {archive.tasks.map((task) => {
                    const startIndex = dayIndexMap.get(task.startDate) ?? 0;
                    const endIndex =
                        dayIndexMap.get(task.endDate) ?? startIndex;
                    const barWidth = (endIndex - startIndex + 1) * DAY_WIDTH;
                    const showBarText = barWidth >= BAR_TEXT_MIN_WIDTH;
                    const showDayCount = barWidth >= BAR_DAY_COUNT_MIN_WIDTH;
                    const taskDays = countTaskDays(task);
                    const barColor =
                        archive.categoryColors[task.category] ??
                        DEFAULT_BAR_COLOR;

                    return (
                        <Fragment
                            key={`${archive.id}-${task.taskName}-${task.startDate}`}
                        >
                            <div className="space-y-1 py-2">
                                <p className="text-sm font-semibold text-slate-900">
                                    {task.taskName}
                                </p>
                                <p
                                    className="text-xs"
                                    style={{ color: AXIS_COLOR }}
                                >
                                    {formatDateLabel(task.startDate)} -{" "}
                                    {formatDateLabel(task.endDate)} ({taskDays}
                                    일)
                                </p>
                                <p className="text-xs leading-5 text-slate-400">
                                    {task.comment || "No comment"}
                                </p>
                            </div>
                            <div
                                className={`relative overflow-hidden ${
                                    archive.barStyle === "square"
                                        ? "rounded-md"
                                        : "rounded-2xl"
                                }`}
                                style={{
                                    width: timelineWidth,
                                    height: 64,
                                    backgroundColor: TRACK_COLOR,
                                }}
                            >
                                {days.map((day, index) => (
                                    <div
                                        key={`${task.taskName}-${day.key}`}
                                        className="absolute inset-y-0"
                                        style={{
                                            left: index * DAY_WIDTH,
                                            width: DAY_WIDTH,
                                            borderRight: `1px solid ${GRID_COLOR}`,
                                            backgroundColor: day.isWeekend
                                                ? WEEKEND_COLOR
                                                : "transparent",
                                        }}
                                    />
                                ))}
                                <div
                                    className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2"
                                    style={{ backgroundColor: GRID_COLOR }}
                                />
                                <div
                                    className={`absolute top-1/2 flex h-10 -translate-y-1/2 items-center px-4 text-sm font-semibold whitespace-nowrap shadow-[0_10px_24px_rgba(15,23,42,0.18)] ${
                                        archive.barStyle === "square"
                                            ? "rounded-md"
                                            : "rounded-full"
                                    }`}
                                    style={{
                                        left: startIndex * DAY_WIDTH + 2,
                                        width: Math.max(
                                            barWidth - 4,
                                            DAY_WIDTH - 4
                                        ),
                                        backgroundColor: barColor,
                                        color: "#ffffff",
                                    }}
                                >
                                    {showBarText && (
                                        <>
                                            <span className="truncate">
                                                {task.taskName}
                                            </span>
                                            {showDayCount && (
                                                <span
                                                    className="ml-auto pl-3 text-xs"
                                                    style={{
                                                        color: "rgba(255,255,255,0.75)",
                                                    }}
                                                >
                                                    {taskDays}d
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const GanttChartPanel = () => {
    const { confirm } = useConfirmDialog();
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<HTMLDivElement | null>(null);
    const shouldFitRef = useRef(true);
    const userZoomedRef = useRef(false);
    const dragStateRef = useRef<{
        pointerId: number;
        clientX: number;
        clientY: number;
    } | null>(null);

    const [archives, setArchives] = useState<GanttChartArchive[]>([]);
    const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(
        null
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [draftsById, setDraftsById] = useState<
        Record<string, GanttChartArchiveDraft>
    >({});
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    const [fitZoom, setFitZoom] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalArchive, setEditModalArchive] =
        useState<GanttChartArchive | null>(null);
    const [categoryColorModalOpen, setCategoryColorModalOpen] = useState(false);

    const selectedArchive =
        archives.find((archive) => archive.id === selectedArchiveId) ?? null;
    const selectedDraft =
        selectedArchive &&
        (draftsById[selectedArchive.id] ?? toArchiveDraft(selectedArchive));
    const allSelected =
        archives.length > 0 &&
        archives.every((archive) => selectedIds.has(archive.id));
    const isSettingsDirty =
        !!selectedArchive &&
        !!selectedDraft &&
        (selectedDraft.title.trim() !== selectedArchive.title ||
            selectedDraft.barStyle !== selectedArchive.barStyle);

    const syncArchiveList = (
        nextArchives: GanttChartArchive[],
        nextSelectedArchiveId?: string | null
    ) => {
        setArchives(nextArchives);
        setDraftsById((current) => {
            const next: Record<string, GanttChartArchiveDraft> = {};

            for (const archive of nextArchives) {
                next[archive.id] =
                    current[archive.id] ?? toArchiveDraft(archive);
            }

            return next;
        });
        setSelectedArchiveId(
            nextSelectedArchiveId ??
                (nextArchives.some(
                    (archive) => archive.id === selectedArchiveId
                )
                    ? selectedArchiveId
                    : (nextArchives[0]?.id ?? null))
        );
        setSelectedIds(
            (current) =>
                new Set(
                    [...current].filter((id) =>
                        nextArchives.some((archive) => archive.id === id)
                    )
                )
        );
    };

    const updateSelectedDraft = (patch: Partial<GanttChartArchiveDraft>) => {
        if (!selectedArchive) return;

        setDraftsById((current) => ({
            ...current,
            [selectedArchive.id]: {
                ...(current[selectedArchive.id] ??
                    toArchiveDraft(selectedArchive)),
                ...patch,
            },
        }));
    };

    const loadArchives = async () => {
        if (!browserClient) {
            setStatus({
                ok: false,
                text: "Supabase browserClient가 설정되지 않았습니다",
            });
            setLoading(false);
            return;
        }
        setLoading(true);
        setStatus(null);
        const { data, error } = await browserClient
            .from("gantt_chart_archives")
            .select(ARCHIVE_SELECT_FIELDS)
            .order("created_at", { ascending: false });
        if (error) {
            setStatus({ ok: false, text: error.message });
            setLoading(false);
            return;
        }
        try {
            syncArchiveList(
                ((data ?? []) as GanttChartArchiveRow[]).map(mapArchiveRow)
            );
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error
                        ? error.message
                        : "Gantt Chart archive 파싱 오류",
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadArchives();
    }, []);
    useEffect(() => {
        if (!selectedArchive) return;
        shouldFitRef.current = true;
        userZoomedRef.current = false;
    }, [selectedArchive]);

    useEffect(() => {
        const viewport = viewportRef.current;
        const chart = chartRef.current;
        if (!viewport || !chart || !selectedArchive) return;
        const updateSize = () => {
            const nextWidth = Math.ceil(chart.scrollWidth);
            const nextHeight = Math.ceil(chart.scrollHeight);
            const nextFitZoom =
                nextWidth > 0
                    ? Math.min(1, viewport.clientWidth / nextWidth)
                    : 1;
            setChartSize({ width: nextWidth, height: nextHeight });
            setFitZoom(nextFitZoom);
            if (shouldFitRef.current || !userZoomedRef.current) {
                setZoom(nextFitZoom);
                requestAnimationFrame(() => {
                    viewport.scrollLeft = 0;
                    viewport.scrollTop = 0;
                });
                shouldFitRef.current = false;
            }
        };
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(viewport);
        resizeObserver.observe(chart);
        updateSize();
        return () => resizeObserver.disconnect();
    }, [selectedArchive]);

    const applyZoom = (nextZoom: number, markManual: boolean) => {
        const viewport = viewportRef.current;
        const clamped = clampZoom(nextZoom);
        if (markManual) userZoomedRef.current = true;
        else {
            userZoomedRef.current = false;
            shouldFitRef.current = false;
        }
        if (!viewport || zoom === clamped) {
            setZoom(clamped);
            return;
        }
        const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
        const centerY = viewport.scrollTop + viewport.clientHeight / 2;
        const ratio = clamped / zoom;
        setZoom(clamped);
        requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(
                0,
                centerX * ratio - viewport.clientWidth / 2
            );
            viewport.scrollTop = Math.max(
                0,
                centerY * ratio - viewport.clientHeight / 2
            );
        });
    };

    const handleFitZoom = () => {
        const viewport = viewportRef.current;
        userZoomedRef.current = false;
        shouldFitRef.current = false;
        setZoom(fitZoom);
        if (viewport)
            requestAnimationFrame(() => {
                viewport.scrollLeft = 0;
                viewport.scrollTop = 0;
            });
    };

    const handleViewportWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (!selectedArchive) return;
        event.preventDefault();
        const viewport = viewportRef.current;
        if (!viewport || zoom <= 0) return;
        const rect = viewport.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        const focusX = viewport.scrollLeft + offsetX;
        const focusY = viewport.scrollTop + offsetY;
        const nextZoom = clampZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));
        const ratio = nextZoom / zoom;
        userZoomedRef.current = true;
        setZoom(nextZoom);
        requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(0, focusX * ratio - offsetX);
            viewport.scrollTop = Math.max(0, focusY * ratio - offsetY);
        });
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!selectedArchive || event.button !== 0) return;
        dragStateRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        const viewport = viewportRef.current;
        if (!dragState || !viewport) return;
        viewport.scrollLeft -= event.clientX - dragState.clientX;
        viewport.scrollTop -= event.clientY - dragState.clientY;
        dragStateRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
        };
    };
    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragStateRef.current) return;
        dragStateRef.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const handleExportImage = async () => {
        if (!selectedArchive || !chartRef.current) return;
        setExporting(true);
        setStatus(null);
        try {
            const { default: html2canvas } = await import("html2canvas-pro");
            const target = chartRef.current;
            const width = Math.ceil(target.scrollWidth);
            const height = Math.ceil(target.scrollHeight);
            const canvas = await html2canvas(target, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true,
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                scrollX: 0,
                scrollY: 0,
            });
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.92)
            );
            if (!blob) throw new Error("JPG export blob 생성 실패");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${buildDownloadName(selectedArchive.title)}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setStatus({
                ok: true,
                text: `${selectedArchive.title}.jpg 다운로드 시작`,
            });
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error ? error.message : "JPG export 오류",
            });
        } finally {
            setExporting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedArchive || !selectedDraft || !browserClient) return;
        const nextTitle = selectedDraft.title.trim();
        if (!nextTitle) {
            setStatus({ ok: false, text: "차트 제목은 비워둘 수 없습니다" });
            return;
        }
        setSavingSettings(true);
        setStatus(null);
        const { data, error } = await browserClient
            .from("gantt_chart_archives")
            .update({
                title: nextTitle,
                bar_style: selectedDraft.barStyle,
            })
            .eq("id", selectedArchive.id)
            .select(ARCHIVE_SELECT_FIELDS)
            .single();
        setSavingSettings(false);
        if (error) {
            setStatus({ ok: false, text: error.message });
            return;
        }
        const nextArchive = mapArchiveRow(data as GanttChartArchiveRow);
        syncArchiveList(
            archives.map((archive) =>
                archive.id === nextArchive.id ? nextArchive : archive
            ),
            nextArchive.id
        );
        setStatus({ ok: true, text: "차트 설정 저장 완료" });
    };

    const handleDeleteArchives = async (ids: string[]) => {
        if (!browserClient || ids.length === 0) return;
        const targets = archives.filter((archive) => ids.includes(archive.id));
        const ok = await confirm({
            title:
                ids.length === 1
                    ? "Gantt Chart 삭제"
                    : `선택한 ${ids.length}개 Gantt Chart 삭제`,
            description:
                ids.length === 1
                    ? `${targets[0]?.title ?? "선택 항목"}를 삭제하시겠습니까?`
                    : `${ids.length}개 archive를 삭제하시겠습니까?`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        setDeletingIds(new Set(ids));
        setStatus(null);
        const { error } = await browserClient
            .from("gantt_chart_archives")
            .delete()
            .in("id", ids);
        setDeletingIds(new Set());
        if (error) {
            setStatus({ ok: false, text: error.message });
            return;
        }
        syncArchiveList(
            archives.filter((archive) => !ids.includes(archive.id))
        );
        setStatus({
            ok: true,
            text:
                ids.length === 1
                    ? "Gantt Chart 삭제 완료"
                    : `${ids.length}개 Gantt Chart 삭제 완료`,
        });
    };

    const toggleSelect = (id: string) =>
        setSelectedIds((current) => {
            const next = new Set(current);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleSelectAll = () =>
        setSelectedIds(
            allSelected
                ? new Set()
                : new Set(archives.map((archive) => archive.id))
        );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 bg-(--color-surface) pt-1 pb-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        Gantt Chart
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => void loadArchives()}
                            disabled={
                                loading ||
                                exporting ||
                                savingSettings ||
                                deletingIds.size > 0
                            }
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            <RefreshCw
                                className={`mr-1.5 h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`}
                            />
                            <span className="whitespace-nowrap">
                                {loading ? "새로고침 중..." : "새로고침"}
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setCreateModalOpen(true)}
                            disabled={
                                loading ||
                                exporting ||
                                savingSettings ||
                                deletingIds.size > 0
                            }
                            className="bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                                새 차트 생성
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => void handleExportImage()}
                            disabled={!selectedArchive || exporting || loading}
                            className="bg-(--color-accent) text-(--color-on-accent) hover:opacity-90"
                        >
                            <Download className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                                {exporting ? "JPG 생성 중..." : "JPG export"}
                            </span>
                        </Button>
                    </div>
                </div>
                <div className="space-y-1 text-sm text-(--color-muted)">
                    <p>
                        "새 차트 생성" 버튼으로 차트를 생성하거나 CSV로 불러올
                        수 있습니다. CSV 헤더:{" "}
                        <code>
                            task name,category,start date,end date,comment
                        </code>
                    </p>
                    <p>
                        preview는 기본적으로 전체 폭 fit 상태로 열리며, wheel로
                        zoom, drag로 pan 이동이 가능합니다.
                    </p>
                </div>
                {status && (
                    <p
                        className={`mt-3 text-sm font-medium ${status.ok ? "text-green-600" : "text-red-500"}`}
                    >
                        {status.text}
                    </p>
                )}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                <div className="laptop:grid-cols-[20rem_minmax(0,1fr)] grid h-full min-h-0 gap-4">
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
                        <div className="border-b border-(--color-border) px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-(--color-foreground)">
                                        Archive
                                    </h3>
                                    <p className="mt-1 text-xs text-(--color-muted)">
                                        저장된 chart {archives.length}개
                                    </p>
                                </div>
                                {selectedIds.size > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void handleDeleteArchives([
                                                ...selectedIds,
                                            ])
                                        }
                                        disabled={deletingIds.size > 0}
                                        className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            선택 삭제
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="border-b border-(--color-border) px-4 py-2.5">
                            <label className="flex items-center gap-2 text-sm text-(--color-muted)">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 cursor-pointer rounded"
                                />
                                <span>전체 선택</span>
                            </label>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {!loading && archives.length === 0 && (
                                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-4 py-6">
                                    <p className="text-sm text-(--color-muted)">
                                        저장된 Gantt Chart archive가 없습니다
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                {archives.map((archive) => {
                                    const isSelectedArchive =
                                        archive.id === selectedArchiveId;
                                    const isChecked = selectedIds.has(
                                        archive.id
                                    );
                                    const isDeleting = deletingIds.has(
                                        archive.id
                                    );
                                    return (
                                        <div
                                            key={archive.id}
                                            className={[
                                                "rounded-xl border px-4 py-3 transition-colors",
                                                isSelectedArchive
                                                    ? "border-(--color-accent) bg-(--color-accent)/10"
                                                    : "border-(--color-border) bg-(--color-surface-subtle)",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() =>
                                                        toggleSelect(archive.id)
                                                    }
                                                    className="mt-1 h-4 w-4 cursor-pointer rounded"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedArchiveId(
                                                            archive.id
                                                        )
                                                    }
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <p className="truncate text-sm font-semibold text-(--color-foreground)">
                                                        {archive.title}
                                                    </p>
                                                    <p className="mt-1 text-xs text-(--color-muted)">
                                                        task{" "}
                                                        {archive.tasks.length}개
                                                    </p>
                                                    <p className="text-xs text-(--color-muted)">
                                                        {formatDateTime(
                                                            archive.createdAt
                                                        )}
                                                    </p>
                                                </button>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditModalArchive(
                                                            archive
                                                        )
                                                    }
                                                    className="bg-zinc-900 px-2.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 shrink-0" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        void handleDeleteArchives(
                                                            [archive.id]
                                                        )
                                                    }
                                                    disabled={isDeleting}
                                                    className="bg-red-600 px-2.5 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
                        {!selectedArchive ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
                                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-6 py-8 text-center">
                                    <p className="text-base font-semibold text-(--color-foreground)">
                                        Gantt Chart 프리뷰 없음
                                    </p>
                                    <p className="mt-2 text-sm text-(--color-muted)">
                                        차트를 생성하거나 archive에서 chart를
                                        선택하세요
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-(--color-border) px-4 py-3">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                Chart Title
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    selectedDraft?.title ?? ""
                                                }
                                                onChange={(event) =>
                                                    updateSelectedDraft({
                                                        title: event.target
                                                            .value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                Bar Shape
                                            </label>
                                            <select
                                                value={
                                                    selectedDraft?.barStyle ??
                                                    DEFAULT_BAR_STYLE
                                                }
                                                onChange={(event) =>
                                                    updateSelectedDraft({
                                                        barStyle: event.target
                                                            .value as GanttChartBarStyle,
                                                    })
                                                }
                                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                            >
                                                <option value="rounded">
                                                    Rounded
                                                </option>
                                                <option value="square">
                                                    Square
                                                </option>
                                            </select>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                setCategoryColorModalOpen(true)
                                            }
                                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                        >
                                            <Palette className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                            <span className="whitespace-nowrap">
                                                Category Colors
                                            </span>
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={handleFitZoom}
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                Fit
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    applyZoom(zoom / 1.15, true)
                                                }
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                <ZoomOut className="h-3.5 w-3.5 shrink-0" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    applyZoom(zoom * 1.15, true)
                                                }
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                <ZoomIn className="h-3.5 w-3.5 shrink-0" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    void handleSaveSettings()
                                                }
                                                disabled={
                                                    !isSettingsDirty ||
                                                    savingSettings
                                                }
                                                className="bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                            >
                                                <span className="whitespace-nowrap">
                                                    {savingSettings
                                                        ? "저장 중..."
                                                        : "설정 저장"}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-(--color-muted)">
                                        zoom {(zoom * 100).toFixed(0)}% · drag로
                                        이동 · wheel로 확대/축소
                                    </p>
                                </div>
                                <div
                                    ref={viewportRef}
                                    onWheel={handleViewportWheel}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                    className={`min-h-0 flex-1 overflow-auto bg-(--color-surface-subtle) p-4 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                                >
                                    <div
                                        style={{
                                            width: Math.max(
                                                chartSize.width * zoom,
                                                1
                                            ),
                                            height: Math.max(
                                                chartSize.height * zoom,
                                                1
                                            ),
                                        }}
                                    >
                                        <div
                                            ref={chartRef}
                                            className="inline-block origin-top-left"
                                            style={{
                                                transform: `scale(${zoom})`,
                                            }}
                                        >
                                            <GanttChartPreview
                                                archive={{
                                                    ...selectedArchive,
                                                    title: selectedDraft?.title.trim()
                                                        ? selectedDraft.title.trim()
                                                        : selectedArchive.title,
                                                    barStyle:
                                                        selectedDraft?.barStyle ??
                                                        selectedArchive.barStyle,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {createModalOpen && (
                <GanttChartCreateModal
                    mode="create"
                    onClose={() => setCreateModalOpen(false)}
                    onSaved={() => {
                        setCreateModalOpen(false);
                        void loadArchives();
                    }}
                />
            )}
            {editModalArchive && (
                <GanttChartCreateModal
                    mode="edit"
                    archive={editModalArchive}
                    onClose={() => setEditModalArchive(null)}
                    onSaved={() => {
                        setEditModalArchive(null);
                        void loadArchives();
                    }}
                />
            )}
            {categoryColorModalOpen && selectedArchive && (
                <GanttChartCategoryColorModal
                    archive={selectedArchive}
                    onClose={() => setCategoryColorModalOpen(false)}
                    onSaved={() => {
                        setCategoryColorModalOpen(false);
                        void loadArchives();
                    }}
                />
            )}
        </div>
    );
};

export default GanttChartPanel;
