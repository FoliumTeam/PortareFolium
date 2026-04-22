"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    normalizeStoredGanttTasks,
    type GanttChartBarStyle,
    type GanttChartTask,
} from "@/lib/gantt-chart";

const GANTT_CHART_SELECT_FIELDS =
    "id, title, source_filename, csv_content, tasks, category_colors, bar_style, created_at, updated_at";

export type GanttChartArchiveRow = {
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

type GanttChartArchiveSuccess = {
    success: true;
    archive: GanttChartArchiveRow;
};

type GanttChartArchiveFailure = {
    success: false;
    error: string;
};

type GanttChartArchiveMutationResult =
    | GanttChartArchiveSuccess
    | GanttChartArchiveFailure;

const normalizeBarStyle = (value: GanttChartBarStyle): GanttChartBarStyle =>
    value === "square" ? "square" : "rounded";

const normalizeTitle = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed || null;
};

const normalizeCategoryColors = (
    value: Record<string, string>
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(value).flatMap(([key, color]) => {
            const nextKey = key.trim();
            const nextColor = color.trim();
            if (!nextKey || !nextColor) return [];
            return [[nextKey, nextColor]];
        })
    );

const normalizeTasks = (tasks: GanttChartTask[]): GanttChartTask[] =>
    normalizeStoredGanttTasks(tasks as unknown);

const toArchiveRow = (value: unknown): GanttChartArchiveRow | null => {
    if (!value || typeof value !== "object") return null;
    return value as GanttChartArchiveRow;
};

// Gantt Chart archive 목록 조회
export async function listGanttChartArchives(): Promise<
    | { success: true; archives: GanttChartArchiveRow[] }
    | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { data, error } = await serverClient
        .from("gantt_chart_archives")
        .select(GANTT_CHART_SELECT_FIELDS)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(
            `[gantt-chart.ts::listGanttChartArchives] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    return {
        success: true,
        archives: (data as GanttChartArchiveRow[]) ?? [],
    };
}

// Gantt Chart archive 생성
export async function createGanttChartArchive(input: {
    title: string;
    tasks: GanttChartTask[];
}): Promise<GanttChartArchiveMutationResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const title = normalizeTitle(input.title);
    if (!title) return { success: false, error: "차트 제목을 입력하세요" };

    let tasks: GanttChartTask[];
    try {
        tasks = normalizeTasks(input.tasks);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Gantt task 형식 오류",
        };
    }

    const { data, error } = await serverClient
        .from("gantt_chart_archives")
        .insert({
            title,
            source_filename: "",
            csv_content: "",
            tasks,
            category_colors: {},
            bar_style: "rounded",
        })
        .select(GANTT_CHART_SELECT_FIELDS)
        .single();

    if (error) {
        console.error(
            `[gantt-chart.ts::createGanttChartArchive] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    const archive = toArchiveRow(data);
    if (!archive) {
        return { success: false, error: "저장 후 Gantt Chart 조회 실패" };
    }

    return { success: true, archive };
}

// Gantt Chart archive task 수정
export async function updateGanttChartArchive(input: {
    id: string;
    title: string;
    tasks: GanttChartTask[];
}): Promise<GanttChartArchiveMutationResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (!input.id) return { success: false, error: "archive id 필요" };

    const title = normalizeTitle(input.title);
    if (!title) return { success: false, error: "차트 제목을 입력하세요" };

    let tasks: GanttChartTask[];
    try {
        tasks = normalizeTasks(input.tasks);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Gantt task 형식 오류",
        };
    }

    const { data, error } = await serverClient
        .from("gantt_chart_archives")
        .update({ title, tasks })
        .eq("id", input.id)
        .select(GANTT_CHART_SELECT_FIELDS)
        .single();

    if (error) {
        console.error(
            `[gantt-chart.ts::updateGanttChartArchive] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    const archive = toArchiveRow(data);
    if (!archive) {
        return { success: false, error: "저장 후 Gantt Chart 조회 실패" };
    }

    return { success: true, archive };
}

// Gantt Chart 제목과 bar style 저장
export async function saveGanttChartArchiveSettings(
    id: string,
    titleInput: string,
    barStyleInput: GanttChartBarStyle
): Promise<GanttChartArchiveMutationResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (!id) return { success: false, error: "archive id 필요" };

    const title = normalizeTitle(titleInput);
    if (!title)
        return { success: false, error: "차트 제목은 비워둘 수 없습니다" };

    const { data, error } = await serverClient
        .from("gantt_chart_archives")
        .update({
            title,
            bar_style: normalizeBarStyle(barStyleInput),
        })
        .eq("id", id)
        .select(GANTT_CHART_SELECT_FIELDS)
        .single();

    if (error) {
        console.error(
            `[gantt-chart.ts::saveGanttChartArchiveSettings] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    const archive = toArchiveRow(data);
    if (!archive) {
        return { success: false, error: "저장 후 Gantt Chart 조회 실패" };
    }

    return { success: true, archive };
}

// Gantt Chart category 이름과 색상 저장
export async function saveGanttChartArchiveCategories(input: {
    id: string;
    tasks: GanttChartTask[];
    categoryColors: Record<string, string>;
}): Promise<GanttChartArchiveMutationResult> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (!input.id) return { success: false, error: "archive id 필요" };

    let tasks: GanttChartTask[];
    try {
        tasks = normalizeTasks(input.tasks);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Gantt task 형식 오류",
        };
    }

    const { data, error } = await serverClient
        .from("gantt_chart_archives")
        .update({
            category_colors: normalizeCategoryColors(input.categoryColors),
            tasks,
        })
        .eq("id", input.id)
        .select(GANTT_CHART_SELECT_FIELDS)
        .single();

    if (error) {
        console.error(
            `[gantt-chart.ts::saveGanttChartArchiveCategories] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    const archive = toArchiveRow(data);
    if (!archive) {
        return { success: false, error: "저장 후 Gantt Chart 조회 실패" };
    }

    return { success: true, archive };
}

// Gantt Chart archive 삭제
export async function deleteGanttChartArchives(
    ids: string[]
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };
    if (ids.length === 0) return { success: true };

    const { error } = await serverClient
        .from("gantt_chart_archives")
        .delete()
        .in("id", ids);

    if (error) {
        console.error(
            `[gantt-chart.ts::deleteGanttChartArchives] ${error.message}`
        );
        return { success: false, error: error.message };
    }

    return { success: true };
}
