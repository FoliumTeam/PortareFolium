import { describe, expect, it } from "vitest";
import {
    GANTT_CHART_COLUMN_SPANS,
    buildGanttTimeline,
    buildGanttTimelineColumns,
    countTaskDays,
    findDuplicateGanttTaskTitleInCategory,
    getGanttArchiveTitle,
    normalizeStoredGanttTasks,
    parseGanttCsv,
} from "@/lib/gantt-chart";

describe("parseGanttCsv", () => {
    it("parses a valid csv", () => {
        const result = parseGanttCsv(
            `task name,category,start date,end date,comment\nDesign,Frontend,2026-04-01,2026-04-03,Wireframe`
        );

        expect(result).toEqual([
            {
                taskName: "Design",
                category: "Frontend",
                startDate: "2026-04-01",
                endDate: "2026-04-03",
                comment: "Wireframe",
            },
        ]);
    });

    it("supports quoted commas in comment", () => {
        const result = parseGanttCsv(
            `task name,category,start date,end date,comment\nBuild,Backend,2026-04-05,2026-04-06,"UI, API, QA"`
        );

        expect(result[0]?.comment).toBe("UI, API, QA");
    });

    it("throws on invalid header", () => {
        expect(() =>
            parseGanttCsv(
                `task,category,start date,end date,comment\nBuild,Backend,2026-04-05,2026-04-06,UI`
            )
        ).toThrow("CSV 헤더는");
    });

    it("throws when end date is before start date", () => {
        expect(() =>
            parseGanttCsv(
                `task name,category,start date,end date,comment\nBuild,Backend,2026-04-06,2026-04-05,UI`
            )
        ).toThrow("end date가 start date보다 빠릅니다");
    });
});

describe("normalizeStoredGanttTasks", () => {
    it("validates stored tasks", () => {
        const result = normalizeStoredGanttTasks([
            {
                taskName: "Deploy",
                category: "Ops",
                startDate: "2026-04-08",
                endDate: "2026-04-09",
                comment: "Release",
            },
        ]);

        expect(result).toHaveLength(1);
        expect(result[0]?.taskName).toBe("Deploy");
        expect(result[0]?.category).toBe("Ops");
    });

    it("throws on invalid stored shape", () => {
        expect(() => normalizeStoredGanttTasks({})).toThrow("형식 오류");
    });
});

describe("buildGanttTimeline", () => {
    it("builds days and month spans", () => {
        const { days, months } = buildGanttTimeline([
            {
                taskName: "Sprint",
                category: "Dev",
                startDate: "2026-04-29",
                endDate: "2026-05-02",
                comment: "",
            },
        ]);

        expect(days.map((day) => day.key)).toEqual([
            "2026-04-29",
            "2026-04-30",
            "2026-05-01",
            "2026-05-02",
        ]);
        expect(months).toEqual([
            { key: "2026-04", label: "2026.04", span: 2 },
            { key: "2026-05", label: "2026.05", span: 2 },
        ]);
    });

    it("builds configurable timeline columns", () => {
        const { days } = buildGanttTimeline([
            {
                taskName: "Sprint",
                category: "Dev",
                startDate: "2026-04-29",
                endDate: "2026-05-02",
                comment: "",
            },
        ]);
        const columns = buildGanttTimelineColumns(days, 2);

        expect(GANTT_CHART_COLUMN_SPANS).toEqual([1, 2, 3, 5, 7]);
        expect(columns).toEqual([
            {
                key: "2026-04-29:2026-04-30",
                startKey: "2026-04-29",
                endKey: "2026-04-30",
                startIndex: 0,
                span: 2,
                label: "4.29-4.30",
                weekdayLabel: "Wed-Thu",
            },
            {
                key: "2026-05-01:2026-05-02",
                startKey: "2026-05-01",
                endKey: "2026-05-02",
                startIndex: 2,
                span: 2,
                label: "5.1-5.2",
                weekdayLabel: "Fri-Sat",
            },
        ]);
    });
});

describe("misc gantt helpers", () => {
    it("counts inclusive task days", () => {
        expect(
            countTaskDays({
                taskName: "QA",
                category: "QA",
                startDate: "2026-04-10",
                endDate: "2026-04-12",
                comment: "",
            })
        ).toBe(3);
    });

    it("extracts archive title from filename", () => {
        expect(getGanttArchiveTitle("release-plan.csv")).toBe("release-plan");
    });

    it("detects duplicate task names only inside the same category", () => {
        const duplicate = findDuplicateGanttTaskTitleInCategory([
            {
                taskName: "Build",
                category: "Client",
                startDate: "2026-04-10",
                endDate: "2026-04-11",
                comment: "",
            },
            {
                taskName: "Build",
                category: "Server",
                startDate: "2026-04-12",
                endDate: "2026-04-13",
                comment: "",
            },
            {
                taskName: "Build",
                category: "Client",
                startDate: "2026-04-14",
                endDate: "2026-04-15",
                comment: "",
            },
        ]);

        expect(duplicate).toEqual({
            taskName: "Build",
            category: "Client",
        });
    });
});
