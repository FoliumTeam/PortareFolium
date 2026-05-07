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
import {
    deleteGanttChartArchives,
    listGanttChartArchives,
    saveGanttChartArchiveSettings,
    type GanttChartArchiveRow,
} from "@/app/admin/actions/gantt-chart";
import {
    GANTT_CHART_COLUMN_SPANS,
    buildGanttTimeline,
    buildGanttTimelineColumns,
    countTaskDays,
    normalizeStoredGanttTasks,
    type GanttChartArchive,
    type GanttChartBarStyle,
    type GanttChartColumnSpan,
    type GanttChartTask,
} from "@/lib/gantt-chart";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import GanttChartCreateModal from "./GanttChartCreateModal";
import GanttChartCategoryColorModal from "./GanttChartCategoryColorModal";

type StatusMessage = {
    ok: boolean;
    text: string;
};

type GanttChartArchiveDraft = {
    title: string;
    barStyle: GanttChartBarStyle;
};

const GANTT_CHART_ASPECT_RATIOS = [
    { label: "1:1", width: 1, height: 1 },
    { label: "4:3", width: 4, height: 3 },
    { label: "3:2", width: 3, height: 2 },
    { label: "16:9", width: 16, height: 9 },
    { label: "21:9", width: 21, height: 9 },
] as const;
const GANTT_CHART_EXPORT_RESOLUTIONS = [
    { label: "720p", height: 720 },
    { label: "1080p", height: 1080 },
    { label: "4K", height: 2160 },
] as const;

type GanttChartAspectRatio = (typeof GANTT_CHART_ASPECT_RATIOS)[number];
type GanttChartAspectRatioLabel = GanttChartAspectRatio["label"];
type GanttChartExportResolution =
    (typeof GANTT_CHART_EXPORT_RESOLUTIONS)[number];
type GanttChartExportResolutionLabel = GanttChartExportResolution["label"];

const BAR_TEXT_MIN_WIDTH = 96;
const BAR_DAY_COUNT_MIN_WIDTH = 152;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.5;
const DEFAULT_BAR_STYLE: GanttChartBarStyle = "rounded";
const DEFAULT_CHART_ASPECT_RATIO: GanttChartAspectRatioLabel = "16:9";
const DEFAULT_EXPORT_RESOLUTION: GanttChartExportResolutionLabel = "1080p";
const TASK_COLUMN_WIDTH = 448;
const CHART_FIXED_HORIZONTAL_SPACE = TASK_COLUMN_WIDTH + 88;

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
const isGanttChartColumnSpan = (value: number): value is GanttChartColumnSpan =>
    GANTT_CHART_COLUMN_SPANS.some((span) => span === value);
const isGanttChartAspectRatioLabel = (
    value: string
): value is GanttChartAspectRatioLabel =>
    GANTT_CHART_ASPECT_RATIOS.some((ratio) => ratio.label === value);
const isGanttChartExportResolutionLabel = (
    value: string
): value is GanttChartExportResolutionLabel =>
    GANTT_CHART_EXPORT_RESOLUTIONS.some(
        (resolution) => resolution.label === value
    );
const getGanttChartAspectRatio = (label: GanttChartAspectRatioLabel) =>
    GANTT_CHART_ASPECT_RATIOS.find((ratio) => ratio.label === label) ??
    GANTT_CHART_ASPECT_RATIOS[3];
const getGanttChartExportResolution = (
    label: GanttChartExportResolutionLabel
) =>
    GANTT_CHART_EXPORT_RESOLUTIONS.find(
        (resolution) => resolution.label === label
    ) ?? GANTT_CHART_EXPORT_RESOLUTIONS[1];
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

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

const GanttChartPreview = ({
    archive,
    aspectRatio,
    columnSpan,
    showComments,
}: {
    archive: GanttChartArchive;
    aspectRatio: GanttChartAspectRatio;
    columnSpan: GanttChartColumnSpan;
    showComments: boolean;
}) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [measuredHeight, setMeasuredHeight] = useState(0);
    const { days, months } = buildGanttTimeline(archive.tasks);
    const columns = buildGanttTimelineColumns(days, columnSpan);
    const dayIndexMap = new Map(days.map((day, index) => [day.key, index]));
    const taskRowMinHeight = showComments ? 60 : 44;
    const fallbackHeight =
        64 +
        96 +
        56 +
        archive.tasks.length * taskRowMinHeight +
        Math.max(0, archive.tasks.length) * 16;
    const chartHeight = Math.max(fallbackHeight, measuredHeight);
    const chartWidth = Math.round(
        (chartHeight * aspectRatio.width) / aspectRatio.height
    );
    const timelineWidth = Math.max(
        320,
        chartWidth - CHART_FIXED_HORIZONTAL_SPACE
    );
    const dayWidth = days.length > 0 ? timelineWidth / days.length : 0;
    const AXIS_COLOR = "#64748b";
    const GRID_COLOR = "#e2e8f0";
    const TRACK_COLOR = "#f8fafc";
    const WEEKEND_COLOR = "#f1f5f9";
    const DEFAULT_BAR_COLOR = "var(--color-accent)";

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const updateMeasuredHeight = () => {
            const nextHeight = Math.ceil(root.scrollHeight);
            setMeasuredHeight((currentHeight) =>
                Math.abs(currentHeight - nextHeight) > 1
                    ? nextHeight
                    : currentHeight
            );
        };

        const resizeObserver = new ResizeObserver(updateMeasuredHeight);
        resizeObserver.observe(root);
        updateMeasuredHeight();

        return () => resizeObserver.disconnect();
    }, [archive.tasks.length, aspectRatio.label, columnSpan, showComments]);

    return (
        <div
            ref={rootRef}
            className="flex min-w-max flex-col rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            style={{ width: chartWidth }}
        >
            <div className="mb-8 shrink-0 space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">
                    {archive.title}
                </h3>
                <p className="text-sm" style={{ color: AXIS_COLOR }}>
                    {archive.tasks.length}개 task ·{" "}
                    {formatDateLabel(days[0]?.key ?? "")} -{" "}
                    {formatDateLabel(days[days.length - 1]?.key ?? "")}
                </p>
            </div>
            <div
                className="grid flex-1 items-stretch gap-x-6 gap-y-4"
                style={{
                    gridTemplateColumns: `${TASK_COLUMN_WIDTH}px minmax(0, 1fr)`,
                    gridTemplateRows: `auto repeat(${archive.tasks.length}, minmax(${taskRowMinHeight}px, auto))`,
                }}
            >
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
                                    width: month.span * dayWidth,
                                    color: AXIS_COLOR,
                                }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>
                    <div className="relative" style={{ width: timelineWidth }}>
                        <div className="flex">
                            {columns.map((column) => (
                                <div
                                    key={column.key}
                                    className="overflow-hidden px-0.5 text-center"
                                    style={{ width: column.span * dayWidth }}
                                >
                                    <p className="truncate text-xs font-semibold text-slate-700">
                                        {column.label}
                                    </p>
                                    <p
                                        className="truncate text-[10px]"
                                        style={{ color: AXIS_COLOR }}
                                    >
                                        {column.weekdayLabel}
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
                {archive.tasks.map((task, taskIndex) => {
                    const startIndex = dayIndexMap.get(task.startDate) ?? 0;
                    const endIndex =
                        dayIndexMap.get(task.endDate) ?? startIndex;
                    const barWidth = (endIndex - startIndex + 1) * dayWidth;
                    const barInset = Math.min(2, dayWidth / 4);
                    const showBarText = barWidth >= BAR_TEXT_MIN_WIDTH;
                    const showDayCount = barWidth >= BAR_DAY_COUNT_MIN_WIDTH;
                    const taskDays = countTaskDays(task);
                    const barColor =
                        archive.categoryColors[task.category] ??
                        DEFAULT_BAR_COLOR;

                    return (
                        <Fragment
                            key={`${archive.id}-${task.category}-${task.taskName}-${task.startDate}-${taskIndex}`}
                        >
                            <div className="flex min-w-0 flex-col justify-center gap-1 py-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <p className="max-w-full min-w-0 text-sm font-semibold break-words text-slate-900">
                                        {task.taskName}
                                    </p>
                                    {task.category && (
                                        <span
                                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                            style={{
                                                backgroundColor: barColor,
                                            }}
                                        >
                                            {task.category}
                                        </span>
                                    )}
                                </div>
                                <p
                                    className="truncate text-xs"
                                    style={{ color: AXIS_COLOR }}
                                >
                                    {formatDateLabel(task.startDate)} –{" "}
                                    {formatDateLabel(task.endDate)} · {taskDays}
                                    일
                                </p>
                                {showComments && task.comment && (
                                    <p className="text-xs text-slate-400">
                                        {task.comment}
                                    </p>
                                )}
                            </div>
                            <div
                                className={`relative overflow-hidden ${
                                    archive.barStyle === "square"
                                        ? "rounded-lg"
                                        : "rounded-2xl"
                                }`}
                                style={{
                                    width: timelineWidth,
                                    height: "100%",
                                    backgroundColor: TRACK_COLOR,
                                }}
                            >
                                {days.map((day, index) => (
                                    <div
                                        key={`${taskIndex}-${task.category}-${task.taskName}-${day.key}`}
                                        className="absolute inset-y-0"
                                        style={{
                                            left: index * dayWidth,
                                            width: dayWidth,
                                            backgroundColor: day.isWeekend
                                                ? WEEKEND_COLOR
                                                : "transparent",
                                        }}
                                    />
                                ))}
                                {columns.map((column) => (
                                    <div
                                        key={`${taskIndex}-${task.category}-${task.taskName}-${column.key}`}
                                        className="pointer-events-none absolute inset-y-0"
                                        style={{
                                            left:
                                                (column.startIndex +
                                                    column.span) *
                                                    dayWidth -
                                                1,
                                            width: 1,
                                            backgroundColor: GRID_COLOR,
                                        }}
                                    />
                                ))}
                                <div
                                    className={`absolute top-1/2 flex h-8 -translate-y-1/2 items-center px-3 text-xs font-semibold whitespace-nowrap shadow-[0_6px_16px_rgba(15,23,42,0.18)] ${
                                        archive.barStyle === "square"
                                            ? "rounded-md"
                                            : "rounded-full"
                                    }`}
                                    style={{
                                        left: startIndex * dayWidth + barInset,
                                        width: Math.max(
                                            barWidth - barInset * 2,
                                            Math.max(4, dayWidth - barInset * 2)
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
    const [aspectRatioLabel, setAspectRatioLabel] =
        useState<GanttChartAspectRatioLabel>(DEFAULT_CHART_ASPECT_RATIO);
    const [exportResolutionLabel, setExportResolutionLabel] =
        useState<GanttChartExportResolutionLabel>(DEFAULT_EXPORT_RESOLUTION);
    const [columnSpan, setColumnSpan] = useState<GanttChartColumnSpan>(1);
    const [showComments, setShowComments] = useState(false);

    const aspectRatio = getGanttChartAspectRatio(aspectRatioLabel);
    const exportResolution = getGanttChartExportResolution(
        exportResolutionLabel
    );
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
        setLoading(true);
        setStatus(null);
        try {
            const result = await listGanttChartArchives();
            if (!result.success) {
                setStatus({ ok: false, text: result.error });
                return;
            }

            syncArchiveList(result.archives.map(mapArchiveRow));
        } catch (error) {
            setStatus({
                ok: false,
                text: getErrorMessage(error, "Gantt Chart archive 로드 오류"),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadArchives();
    }, []);
    useEffect(() => {
        if (!selectedArchive) return;
        shouldFitRef.current = true;
        userZoomedRef.current = false;
    }, [selectedArchive, aspectRatioLabel, columnSpan]);

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
    }, [selectedArchive, aspectRatioLabel, columnSpan]);

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
        const target = chartRef.current;
        const prevTransform = target.style.transform;
        const prevOrigin = target.style.transformOrigin;
        try {
            const { default: html2canvas } = await import("html2canvas-pro");
            // 줌 transform을 임시 제거해 항상 100% 크기로 캡처
            target.style.transform = "scale(1)";
            target.style.transformOrigin = "top left";
            const width = Math.ceil(target.scrollWidth);
            const height = Math.ceil(target.scrollHeight);
            const exportScale =
                height > 0 ? exportResolution.height / height : 1;
            const canvas = await html2canvas(target, {
                backgroundColor: "#ffffff",
                scale: exportScale,
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
            link.download = `${buildDownloadName(selectedArchive.title)}-${exportResolution.label}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setStatus({
                ok: true,
                text: `${selectedArchive.title}-${exportResolution.label}.jpg 다운로드 시작`,
            });
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error ? error.message : "JPG export 오류",
            });
        } finally {
            target.style.transform = prevTransform;
            target.style.transformOrigin = prevOrigin;
            setExporting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedArchive || !selectedDraft) return;
        const nextTitle = selectedDraft.title.trim();
        if (!nextTitle) {
            setStatus({ ok: false, text: "차트 제목은 비워둘 수 없습니다" });
            return;
        }
        setSavingSettings(true);
        setStatus(null);
        try {
            const result = await saveGanttChartArchiveSettings(
                selectedArchive.id,
                nextTitle,
                selectedDraft.barStyle
            );
            if (!result.success) {
                setStatus({ ok: false, text: result.error });
                return;
            }

            const nextArchive = mapArchiveRow(result.archive);
            syncArchiveList(
                archives.map((archive) =>
                    archive.id === nextArchive.id ? nextArchive : archive
                ),
                nextArchive.id
            );
            setStatus({ ok: true, text: "차트 설정 저장 완료" });
        } catch (error) {
            setStatus({
                ok: false,
                text: getErrorMessage(error, "차트 설정 저장 오류"),
            });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDeleteArchives = async (ids: string[]) => {
        if (ids.length === 0) return;
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
        try {
            const result = await deleteGanttChartArchives(ids);
            if (!result.success) {
                setStatus({
                    ok: false,
                    text: result.error ?? "Gantt Chart 삭제 오류",
                });
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
        } catch (error) {
            setStatus({
                ok: false,
                text: getErrorMessage(error, "Gantt Chart 삭제 오류"),
            });
        } finally {
            setDeletingIds(new Set());
        }
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
                                    <div className="overflow-x-auto pb-2">
                                        <div className="flex min-w-max items-end gap-3">
                                            <div className="w-40 shrink-0 space-y-2">
                                                <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                    Chart Title
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        selectedDraft?.title ??
                                                        ""
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
                                            <div className="shrink-0 space-y-2">
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
                                                            barStyle: event
                                                                .target
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
                                            <div className="shrink-0 space-y-2">
                                                <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                    Column Width
                                                </label>
                                                <select
                                                    value={columnSpan}
                                                    onChange={(event) => {
                                                        const nextColumnSpan =
                                                            Number(
                                                                event.target
                                                                    .value
                                                            );
                                                        if (
                                                            isGanttChartColumnSpan(
                                                                nextColumnSpan
                                                            )
                                                        ) {
                                                            setColumnSpan(
                                                                nextColumnSpan
                                                            );
                                                        }
                                                    }}
                                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                                >
                                                    {GANTT_CHART_COLUMN_SPANS.map(
                                                        (span) => (
                                                            <option
                                                                key={span}
                                                                value={span}
                                                            >
                                                                {span}{" "}
                                                                {span === 1
                                                                    ? "day"
                                                                    : "days"}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                            <div className="shrink-0 space-y-2">
                                                <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                    Export Resolution
                                                </label>
                                                <select
                                                    value={
                                                        exportResolutionLabel
                                                    }
                                                    onChange={(event) => {
                                                        const nextResolution =
                                                            event.target.value;
                                                        if (
                                                            isGanttChartExportResolutionLabel(
                                                                nextResolution
                                                            )
                                                        ) {
                                                            setExportResolutionLabel(
                                                                nextResolution
                                                            );
                                                        }
                                                    }}
                                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                                >
                                                    {GANTT_CHART_EXPORT_RESOLUTIONS.map(
                                                        (resolution) => (
                                                            <option
                                                                key={
                                                                    resolution.label
                                                                }
                                                                value={
                                                                    resolution.label
                                                                }
                                                            >
                                                                {
                                                                    resolution.label
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                            <div className="shrink-0 space-y-2">
                                                <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                    Aspect Ratio
                                                </label>
                                                <select
                                                    value={aspectRatioLabel}
                                                    onChange={(event) => {
                                                        const nextAspectRatio =
                                                            event.target.value;
                                                        if (
                                                            isGanttChartAspectRatioLabel(
                                                                nextAspectRatio
                                                            )
                                                        ) {
                                                            setAspectRatioLabel(
                                                                nextAspectRatio
                                                            );
                                                        }
                                                    }}
                                                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                                >
                                                    {GANTT_CHART_ASPECT_RATIOS.map(
                                                        (ratio) => (
                                                            <option
                                                                key={
                                                                    ratio.label
                                                                }
                                                                value={
                                                                    ratio.label
                                                                }
                                                            >
                                                                {ratio.label}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setCategoryColorModalOpen(
                                                        true
                                                    )
                                                }
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                <Palette className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                                <span className="whitespace-nowrap">
                                                    Category Colors
                                                </span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setShowComments((v) => !v)
                                                }
                                                className={
                                                    showComments
                                                        ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                        : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                                                }
                                            >
                                                <span className="whitespace-nowrap">
                                                    Comments{" "}
                                                    {showComments
                                                        ? "ON"
                                                        : "OFF"}
                                                </span>
                                            </Button>
                                            <div className="flex shrink-0 items-center gap-2">
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
                                                        applyZoom(
                                                            zoom / 1.15,
                                                            true
                                                        )
                                                    }
                                                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                >
                                                    <ZoomOut className="h-3.5 w-3.5 shrink-0" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        applyZoom(
                                                            zoom * 1.15,
                                                            true
                                                        )
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
                                    </div>
                                    <p className="mt-2 text-xs text-(--color-muted)">
                                        zoom {(zoom * 100).toFixed(0)}% · drag로
                                        이동 · wheel로 확대/축소 · column{" "}
                                        {columnSpan}{" "}
                                        {columnSpan === 1 ? "day" : "days"} ·
                                        aspect ratio {aspectRatioLabel} · export{" "}
                                        {exportResolutionLabel}
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
                                                aspectRatio={aspectRatio}
                                                columnSpan={columnSpan}
                                                showComments={showComments}
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
