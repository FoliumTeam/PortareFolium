export type GanttChartTask = {
    taskName: string;
    category: string;
    startDate: string;
    endDate: string;
    comment: string;
};

export type GanttChartBarStyle = "rounded" | "square";

export const GANTT_CHART_COLUMN_SPANS = [1, 2, 3, 5, 7] as const;

export type GanttChartColumnSpan = (typeof GANTT_CHART_COLUMN_SPANS)[number];

export type GanttChartArchive = {
    id: string;
    title: string;
    tasks: GanttChartTask[];
    categoryColors: Record<string, string>;
    barStyle: GanttChartBarStyle;
    createdAt: string;
    updatedAt: string;
};

export type GanttChartDay = {
    key: string;
    dayNumber: number;
    weekdayLabel: string;
    isWeekend: boolean;
    monthKey: string;
};

export type GanttChartMonthGroup = {
    key: string;
    label: string;
    span: number;
};

export type GanttChartDuplicateTaskTitle = {
    taskName: string;
    category: string;
};

export type GanttChartTimelineColumn = {
    key: string;
    startKey: string;
    endKey: string;
    startIndex: number;
    span: number;
    label: string;
    weekdayLabel: string;
};

const REQUIRED_HEADERS = [
    "task name",
    "category",
    "start date",
    "end date",
    "comment",
] as const;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseCsvRow(row: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < row.length; index += 1) {
        const char = row[index];
        const next = row[index + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                index += 1;
                continue;
            }

            inQuotes = !inQuotes;
            continue;
        }

        if (char === "," && !inQuotes) {
            cells.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    if (inQuotes) {
        throw new Error("CSV 따옴표 형식 오류");
    }

    cells.push(current);
    return cells;
}

function parseDateString(value: string): Date | null {
    if (!ISO_DATE_PATTERN.test(value)) return null;

    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

function dateToKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatTimelineColumnLabel(
    start: GanttChartDay,
    end: GanttChartDay
): string {
    const startMonth = Number(start.monthKey.slice(5));
    const endMonth = Number(end.monthKey.slice(5));

    if (start.key === end.key) return `${startMonth}.${start.dayNumber}`;

    return `${startMonth}.${start.dayNumber}-${endMonth}.${end.dayNumber}`;
}

export function getGanttArchiveTitle(fileName: string): string {
    const trimmed = fileName.trim();

    if (!trimmed) return "Untitled Gantt Chart";

    const withoutExtension = trimmed.replace(/\.[^.]+$/, "").trim();
    return withoutExtension || "Untitled Gantt Chart";
}

export function parseGanttCsv(csvContent: string): GanttChartTask[] {
    const normalized = csvContent
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
    const rows = normalized
        .split("\n")
        .map((row) => row.trimEnd())
        .filter((row) => row.trim().length > 0);

    if (rows.length === 0) {
        throw new Error("CSV 내용이 비어 있습니다");
    }

    const header = parseCsvRow(rows[0]).map((cell) =>
        cell.trim().toLowerCase()
    );

    if (
        header.length !== REQUIRED_HEADERS.length ||
        !header.every((cell, index) => cell === REQUIRED_HEADERS[index])
    ) {
        throw new Error(
            "CSV 헤더는 task name,category,start date,end date,comment 형식이어야 합니다"
        );
    }

    const tasks = rows.slice(1).map((row, index) => {
        const lineNumber = index + 2;
        const cells = parseCsvRow(row);

        if (cells.length !== 5) {
            throw new Error(`${lineNumber}행 컬럼 수가 5개가 아닙니다`);
        }

        const taskName = cells[0].trim();
        const category = cells[1].trim();
        const startDateRaw = cells[2].trim();
        const endDateRaw = cells[3].trim();
        const comment = cells[4].trim();
        const startDate = parseDateString(startDateRaw);
        const endDate = parseDateString(endDateRaw);

        if (!taskName) {
            throw new Error(`${lineNumber}행 task name 누락`);
        }

        if (!startDate) {
            throw new Error(`${lineNumber}행 start date 형식 오류`);
        }

        if (!endDate) {
            throw new Error(`${lineNumber}행 end date 형식 오류`);
        }

        if (startDate.getTime() > endDate.getTime()) {
            throw new Error(
                `${lineNumber}행 end date가 start date보다 빠릅니다`
            );
        }

        return {
            taskName,
            category,
            startDate: dateToKey(startDate),
            endDate: dateToKey(endDate),
            comment,
        };
    });

    if (tasks.length === 0) {
        throw new Error("CSV에 task가 없습니다");
    }

    return tasks;
}

export function normalizeStoredGanttTasks(value: unknown): GanttChartTask[] {
    if (!Array.isArray(value)) {
        throw new Error("저장된 Gantt task 형식 오류");
    }

    return value.map((item, index) => {
        if (!item || typeof item !== "object") {
            throw new Error(`저장된 Gantt task ${index + 1} 형식 오류`);
        }

        const row = item as Record<string, unknown>;
        const taskName =
            typeof row.taskName === "string" ? row.taskName.trim() : "";
        const category =
            typeof row.category === "string" ? row.category.trim() : "";
        const startDate =
            typeof row.startDate === "string" ? row.startDate.trim() : "";
        const endDate =
            typeof row.endDate === "string" ? row.endDate.trim() : "";
        const comment =
            typeof row.comment === "string" ? row.comment.trim() : "";

        const parsedStartDate = parseDateString(startDate);
        const parsedEndDate = parseDateString(endDate);

        if (!taskName || !parsedStartDate || !parsedEndDate) {
            throw new Error(`저장된 Gantt task ${index + 1} 값 오류`);
        }

        if (parsedStartDate.getTime() > parsedEndDate.getTime()) {
            throw new Error(`저장된 Gantt task ${index + 1} 날짜 순서 오류`);
        }

        return {
            taskName,
            category,
            startDate: dateToKey(parsedStartDate),
            endDate: dateToKey(parsedEndDate),
            comment,
        };
    });
}

export function findDuplicateGanttTaskTitleInCategory(
    tasks: GanttChartTask[]
): GanttChartDuplicateTaskTitle | null {
    const seen = new Set<string>();

    for (const task of tasks) {
        const taskName = task.taskName.trim();
        const category = task.category.trim();
        const key = `${category}\u0000${taskName}`;

        if (seen.has(key)) {
            return { taskName, category };
        }

        seen.add(key);
    }

    return null;
}

export function buildGanttTimeline(tasks: GanttChartTask[]): {
    days: GanttChartDay[];
    months: GanttChartMonthGroup[];
} {
    if (tasks.length === 0) {
        return { days: [], months: [] };
    }

    const startTime = Math.min(
        ...tasks.map((task) => parseDateString(task.startDate)?.getTime() ?? 0)
    );
    const endTime = Math.max(
        ...tasks.map((task) => parseDateString(task.endDate)?.getTime() ?? 0)
    );
    const days: GanttChartDay[] = [];
    const cursor = new Date(startTime);

    while (cursor.getTime() <= endTime) {
        const key = dateToKey(cursor);
        const month = cursor.getUTCMonth() + 1;
        const dayNumber = cursor.getUTCDate();
        const weekday = cursor.getUTCDay();

        days.push({
            key,
            dayNumber,
            weekdayLabel: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                weekday
            ],
            isWeekend: weekday === 0 || weekday === 6,
            monthKey: `${cursor.getUTCFullYear()}-${String(month).padStart(2, "0")}`,
        });

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const months: GanttChartMonthGroup[] = [];

    for (const day of days) {
        const existingMonth = months[months.length - 1];

        if (existingMonth && existingMonth.key === day.monthKey) {
            existingMonth.span += 1;
            continue;
        }

        months.push({
            key: day.monthKey,
            label: day.monthKey.replace("-", "."),
            span: 1,
        });
    }

    return { days, months };
}

export function buildGanttTimelineColumns(
    days: GanttChartDay[],
    columnSpan: GanttChartColumnSpan
): GanttChartTimelineColumn[] {
    const columns: GanttChartTimelineColumn[] = [];

    for (let index = 0; index < days.length; index += columnSpan) {
        const columnDays = days.slice(index, index + columnSpan);
        const start = columnDays[0];
        const end = columnDays[columnDays.length - 1];

        if (!start || !end) continue;

        columns.push({
            key: `${start.key}:${end.key}`,
            startKey: start.key,
            endKey: end.key,
            startIndex: index,
            span: columnDays.length,
            label: formatTimelineColumnLabel(start, end),
            weekdayLabel:
                start.key === end.key
                    ? start.weekdayLabel
                    : `${start.weekdayLabel}-${end.weekdayLabel}`,
        });
    }

    return columns;
}

export function countTaskDays(task: GanttChartTask): number {
    const startDate = parseDateString(task.startDate);
    const endDate = parseDateString(task.endDate);

    if (!startDate || !endDate) return 0;

    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
}
