"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import {
    APP_VERSION,
    getPendingMigrations,
    type Migration,
} from "@/lib/migrations";
import { getPublicDbSchemaVersion } from "@/app/admin/actions/public-data";
import { getPublicJobFields } from "@/lib/public-job-field";

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
    jobFields: JobFieldItem[];
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

export async function getMainPanelBootstrap(): Promise<MainPanelBootstrap> {
    await requireAdminSession();

    const [
        dbVersion,
        postsTotal,
        postsDrafts,
        portfolioTotal,
        portfolioDrafts,
        jobFields,
    ] = await Promise.all([
        getPublicDbSchemaVersion(),
        countRows("posts"),
        countRows("posts", false),
        countRows("portfolio_items"),
        countRows("portfolio_items", false),
        getPublicJobFields(),
    ]);

    const pending = dbVersion ? getPendingMigrations(dbVersion) : [];
    const errors = [
        postsTotal.error,
        postsDrafts.error,
        portfolioTotal.error,
        portfolioDrafts.error,
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
        jobFields,
        errors,
    };
}
