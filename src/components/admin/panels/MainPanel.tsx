"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
    AlertTriangle,
    Briefcase,
    CheckCircle2,
    FileText,
    RefreshCw,
} from "lucide-react";
import {
    getMainPanelBootstrap,
    type MainPanelBootstrap,
} from "@/app/admin/actions/main";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TabId } from "@/components/admin/AdminSidebar";

type MainPanelProps = {
    refugeMode?: boolean;
    onNavigate?: (tab: TabId) => void;
};

export default function MainPanel({
    refugeMode = false,
    onNavigate,
}: MainPanelProps) {
    const [data, setData] = useState<MainPanelBootstrap | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setRefreshing(true);
        try {
            setData(await getMainPanelBootstrap());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading || !data) {
        return (
            <div className="p-8 text-sm text-(--color-muted)">
                사이트 상태를 불러오는 중...
            </div>
        );
    }

    const migrationNeeded =
        data.db.currentVersion === null ||
        (data.db.pendingCount !== null && data.db.pendingCount > 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold tracking-[0.24em] text-(--color-muted) uppercase">
                        Admin Overview
                    </p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-(--color-foreground)">
                        사이트 상태
                    </h2>
                    <p className="mt-1 text-sm text-(--color-muted)">
                        로그인 직후 DB 상태와 미완료 작업을 한눈에 확인합니다.
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={load}
                    disabled={refreshing}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 shrink-0 ${
                            refreshing ? "animate-spin" : ""
                        }`}
                    />
                    {refreshing ? "새로고침 중..." : "새로고침"}
                </Button>
            </div>

            {data.errors.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    일부 상태를 불러오지 못했습니다: {data.errors.join(", ")}
                </div>
            )}

            <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                            활성 직무 분야
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="text-3xl" aria-hidden="true">
                                {data.jobField.emoji}
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-(--color-foreground)">
                                    {data.jobField.label}
                                </h3>
                                <p className="text-sm text-(--color-muted)">
                                    현재 공개 화면과 admin 필터에서 사용하는
                                    활성 직무 분야
                                </p>
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline">
                        {data.jobField.activeId || "all"}
                    </Badge>
                </div>
            </section>

            <section
                className={[
                    "rounded-2xl border p-5",
                    migrationNeeded
                        ? "border-amber-300 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/25"
                        : "border-green-200 bg-green-50/80 dark:border-green-800 dark:bg-green-950/25",
                ].join(" ")}
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                        <div
                            className={[
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                                migrationNeeded
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                            ].join(" ")}
                        >
                            {migrationNeeded ? (
                                <AlertTriangle className="h-5 w-5" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-(--color-foreground)">
                                    DB 상태
                                </h3>
                                <Badge
                                    className={
                                        migrationNeeded
                                            ? "bg-amber-500"
                                            : "bg-green-600"
                                    }
                                >
                                    {migrationNeeded ? "확인 필요" : "최신"}
                                </Badge>
                                {refugeMode && (
                                    <Badge variant="outline">
                                        SQLite refuge
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--color-muted)">
                                <span>
                                    DB 버전:{" "}
                                    <code className="font-mono font-semibold text-(--color-foreground)">
                                        {data.db.currentVersion ?? "없음"}
                                    </code>
                                </span>
                                <span>
                                    프론트엔드 버전:{" "}
                                    <code className="font-mono font-semibold text-(--color-foreground)">
                                        {data.db.frontendVersion}
                                    </code>
                                </span>
                            </div>
                            {data.db.nextMigration && (
                                <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                                    자동 마이그레이션 대기: v
                                    {data.db.nextMigration.version} ·{" "}
                                    {data.db.nextMigration.title}
                                </p>
                            )}
                            {data.db.currentVersion === null && (
                                <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                                    DB 스키마 버전 정보가 없습니다. 신규 설정
                                    SQL을 먼저 실행해야 합니다.
                                </p>
                            )}
                            {data.db.currentVersion !== null &&
                                migrationNeeded && (
                                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                                        서버가 시작되거나 다음 요청이 처리될 때
                                        자동 적용됩니다. 수동 SQL은{" "}
                                        <code className="font-mono">
                                            supabase/migrations
                                        </code>
                                        에서 확인할 수 있습니다.
                                    </p>
                                )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="laptop:grid-cols-2 grid gap-4">
                <ContentCard
                    icon={<FileText className="h-5 w-5" />}
                    title="포스트"
                    stats={data.posts}
                    onOpen={() => onNavigate?.("posts")}
                />
                <ContentCard
                    icon={<Briefcase className="h-5 w-5" />}
                    title="포트폴리오"
                    stats={data.portfolio}
                    onOpen={() => onNavigate?.("portfolio")}
                />
            </div>
        </div>
    );
}

function ContentCard({
    icon,
    title,
    stats,
    onOpen,
}: {
    icon: ReactNode;
    title: string;
    stats: MainPanelBootstrap["posts"];
    onOpen: () => void;
}) {
    return (
        <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-surface-subtle) text-(--color-accent)">
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-(--color-foreground)">
                            {title}
                        </h3>
                        <p className="text-sm text-(--color-muted)">
                            작성 현황
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onOpen}>
                    열기
                </Button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
                <StatPill label="전체" value={stats.total} />
                <StatPill label="공개" value={stats.published} />
                <StatPill
                    label="초안"
                    value={stats.drafts}
                    highlight={stats.drafts > 0}
                />
            </div>
        </section>
    );
}

function StatPill({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div
            className={[
                "rounded-xl border px-3 py-3 text-center",
                highlight
                    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    : "border-(--color-border) bg-(--color-surface-subtle)",
            ].join(" ")}
        >
            <div className="text-2xl font-black tabular-nums">{value}</div>
            <div className="mt-0.5 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                {label}
            </div>
        </div>
    );
}
