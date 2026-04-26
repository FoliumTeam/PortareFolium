"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    APP_VERSION,
    getPendingMigrations,
    type Migration,
} from "@/lib/migrations";
import { getPublicDbSchemaVersion } from "@/app/admin/actions/public-data";
import { normalizeJobFieldValue } from "@/lib/job-field";

type ContentStats = {
    total: number;
    published: number;
    drafts: number;
};

type JobFieldItem = { id: string; name: string; emoji: string };

export type MainPanelBootstrap = {
    db: {
        currentVersion: string | null;
        frontendVersion: string;
        isLatest: boolean;
        pendingCount: number | null;
        nextMigration: Pick<Migration, "version" | "title"> | null;
    };
    posts: ContentStats;
    portfolio: ContentStats;
    jobField: {
        activeId: string;
        label: string;
        emoji: string;
    };
    errors: string[];
};

type CountTable = "posts" | "portfolio_items";

async function countRows(
    table: CountTable,
    published?: boolean
): Promise<{ count: number; error?: string }> {
    if (!serverClient) return { count: 0, error: "serverClient 없음" };

    const baseQuery = serverClient
        .from(table)
        .select("id", { count: "exact", head: true });
    const query =
        typeof published === "boolean"
            ? baseQuery.eq("published", published)
            : baseQuery;
    const { count, error } = await query;

    return {
        count: count ?? 0,
        error: error?.message,
    };
}

function buildStats(total: number, drafts: number): ContentStats {
    return {
        total,
        drafts,
        published: Math.max(total - drafts, 0),
    };
}

function parseSiteConfigValue(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function isJobFieldItem(value: unknown): value is JobFieldItem {
    if (!value || typeof value !== "object") return false;
    const item = value as Partial<JobFieldItem>;
    return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.emoji === "string"
    );
}

async function getActiveJobField(): Promise<{
    activeId: string;
    label: string;
    emoji: string;
    errors: string[];
}> {
    if (!serverClient) {
        return {
            activeId: "",
            label: "전체",
            emoji: "🌐",
            errors: ["serverClient 없음"],
        };
    }

    const [
        { data: jobFieldsRow, error: jobFieldsError },
        { data: activeJobFieldRow, error: activeJobFieldError },
    ] = await Promise.all([
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_fields")
            .single(),
        serverClient
            .from("site_config")
            .select("value")
            .eq("key", "job_field")
            .single(),
    ]);

    const parsedJobFields = parseSiteConfigValue(jobFieldsRow?.value);
    const jobFields = Array.isArray(parsedJobFields)
        ? parsedJobFields.filter(isJobFieldItem)
        : [];
    const parsedActiveJobField = parseSiteConfigValue(activeJobFieldRow?.value);
    const activeId =
        typeof parsedActiveJobField === "string"
            ? normalizeJobFieldValue(parsedActiveJobField)
            : "";
    const active = jobFields.find((field) => field.id === activeId);

    return {
        activeId,
        label: active?.name ?? (activeId ? activeId : "전체"),
        emoji: active?.emoji ?? "🌐",
        errors: [jobFieldsError?.message, activeJobFieldError?.message].filter(
            (error): error is string => Boolean(error)
        ),
    };
}

export async function getMainPanelBootstrap(): Promise<MainPanelBootstrap> {
    await requireAdminSession();

    const [
        dbVersion,
        postsTotal,
        postsDrafts,
        portfolioTotal,
        portfolioDrafts,
        activeJobField,
    ] = await Promise.all([
        getPublicDbSchemaVersion(),
        countRows("posts"),
        countRows("posts", false),
        countRows("portfolio_items"),
        countRows("portfolio_items", false),
        getActiveJobField(),
    ]);

    const pending = dbVersion ? getPendingMigrations(dbVersion) : [];
    const errors = [
        postsTotal.error,
        postsDrafts.error,
        portfolioTotal.error,
        portfolioDrafts.error,
        ...activeJobField.errors,
    ].filter((error): error is string => Boolean(error));

    return {
        db: {
            currentVersion: dbVersion,
            frontendVersion: APP_VERSION,
            isLatest: dbVersion !== null && pending.length === 0,
            pendingCount: dbVersion === null ? null : pending.length,
            nextMigration: pending[0]
                ? {
                      version: pending[0].version,
                      title: pending[0].title,
                  }
                : null,
        },
        posts: buildStats(postsTotal.count, postsDrafts.count),
        portfolio: buildStats(portfolioTotal.count, portfolioDrafts.count),
        jobField: {
            activeId: activeJobField.activeId,
            label: activeJobField.label,
            emoji: activeJobField.emoji,
        },
        errors,
    };
}
