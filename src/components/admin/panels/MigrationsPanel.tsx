import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import {
    MIGRATIONS,
    APP_VERSION,
    getPendingMigrations,
    compareVersions,
} from "@/lib/migrations";
import type { Migration } from "@/lib/migrations";

export default function MigrationsPanel() {
    const [dbVersion, setDbVersion] = useState<string | null | undefined>(
        undefined
    ); // undefined = 로딩 중, null = 없음
    const [copied, setCopied] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadVersion = async () => {
        if (!browserClient) return;
        setRefreshing(true);
        const { data } = await browserClient
            .from("site_config")
            .select("value")
            .eq("key", "db_schema_version")
            .single();
        setDbVersion(data?.value ?? null);
        setRefreshing(false);
    };

    useEffect(() => {
        loadVersion();
    }, []);

    const copySql = (migration: Migration) => {
        navigator.clipboard.writeText(migration.sql);
        setCopied(migration.version);
        setTimeout(() => setCopied(null), 2000);
    };

    // 로딩 중
    if (dbVersion === undefined) {
        return (
            <div className="p-8 text-sm text-(--color-muted)">
                불러오는 중...
            </div>
        );
    }

    // db_schema_version 없음 → 초기 설정 안내
    if (dbVersion === null) {
        return (
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h2 className="mb-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                        DB 마이그레이션
                    </h2>
                </div>
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
                    <p className="mb-1 font-semibold text-amber-800 dark:text-amber-300">
                        ⚠ DB 스키마 버전 정보가 없습니다
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        다음 중 하나를 Supabase SQL Editor에서 실행하세요.
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-700 dark:text-amber-400">
                        <li>
                            <strong>신규 설치:</strong>{" "}
                            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/50">
                                supabase/setup.sql
                            </code>
                        </li>
                        <li>
                            <strong>기존 DB 업그레이드:</strong>{" "}
                            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/50">
                                supabase/migration-whole.sql
                            </code>
                        </li>
                    </ul>
                    <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
                        실행 후 아래 새로고침 버튼을 누르세요.
                    </p>
                    <button
                        onClick={loadVersion}
                        disabled={refreshing}
                        className="mt-4 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-600 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-900/20"
                    >
                        {refreshing ? "새로고침 중..." : "새로고침"}
                    </button>
                </div>
            </div>
        );
    }

    const pending = getPendingMigrations(dbVersion);
    const applied = MIGRATIONS.filter(
        (m) => compareVersions(m.version, dbVersion) <= 0
    );
    const isUpToDate = pending.length === 0;

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="mb-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                        DB 마이그레이션
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-(--color-muted)">
                        <span>
                            DB 버전:{" "}
                            <code className="font-mono font-semibold text-(--color-foreground)">
                                {dbVersion}
                            </code>
                        </span>
                        <span className="text-(--color-border)">·</span>
                        <span>
                            앱 버전:{" "}
                            <code className="font-mono font-semibold text-(--color-foreground)">
                                {APP_VERSION}
                            </code>
                        </span>
                    </div>
                </div>
                <button
                    onClick={loadVersion}
                    disabled={refreshing}
                    className="shrink-0 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle) disabled:opacity-50"
                >
                    {refreshing ? "새로고침 중..." : "새로고침"}
                </button>
            </div>

            {/* 미적용 마이그레이션 */}
            {pending.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-bold tracking-widest text-amber-600 uppercase">
                        미적용 ({pending.length})
                    </h3>
                    <p className="mb-4 text-sm text-(--color-muted)">
                        아래 SQL을 Supabase SQL Editor에서 순서대로 실행하세요.
                        각 SQL 마지막에 DB 버전이 자동으로 업데이트됩니다.
                    </p>
                    <div className="space-y-4">
                        {pending.map((m) => (
                            <MigrationCard
                                key={m.version}
                                migration={m}
                                isApplied={false}
                                isCopied={copied === m.version}
                                defaultOpen={true}
                                onCopy={() => copySql(m)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 최신 상태 */}
            {isUpToDate && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                    ✓ DB가 최신 상태입니다.
                </div>
            )}

            {/* 적용 완료 */}
            {applied.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                        적용 완료 ({applied.length})
                    </h3>
                    <div className="space-y-3">
                        {[...applied].reverse().map((m) => (
                            <MigrationCard
                                key={m.version}
                                migration={m}
                                isApplied={true}
                                isCopied={copied === m.version}
                                defaultOpen={false}
                                onCopy={() => copySql(m)}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function MigrationCard({
    migration,
    isApplied,
    isCopied,
    defaultOpen,
    onCopy,
}: {
    migration: Migration;
    isApplied: boolean;
    isCopied: boolean;
    defaultOpen: boolean;
    onCopy: () => void;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div
            className={[
                "rounded-xl border p-4 transition-opacity",
                isApplied
                    ? "border-(--color-border) opacity-50"
                    : "border-(--color-border) bg-(--color-surface)",
            ].join(" ")}
        >
            <div className="flex flex-wrap items-center gap-2">
                {isApplied && (
                    <svg
                        className="h-4 w-4 shrink-0 text-green-500"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <path d="M2 6l3 3 5-5" />
                    </svg>
                )}
                <span className="font-semibold text-(--color-foreground)">
                    {migration.title}
                </span>
                <span className="rounded-full bg-(--color-surface-subtle) px-2 py-0.5 text-xs text-(--color-muted)">
                    v{migration.version}
                </span>
            </div>
            <p className="mt-0.5 text-xs text-(--color-muted)">
                {migration.feature}
            </p>

            <button
                onClick={() => setOpen((v) => !v)}
                className="mt-2 text-xs font-medium text-(--color-accent) hover:underline"
            >
                {open ? "▾ SQL 숨기기" : "▸ SQL 보기"}
            </button>

            {open && (
                <div className="relative mt-2">
                    <pre className="overflow-x-auto rounded-lg bg-(--color-surface-subtle) p-3 text-xs leading-relaxed text-(--color-foreground)">
                        <code>{migration.sql}</code>
                    </pre>
                    <button
                        onClick={onCopy}
                        className="absolute top-2 right-2 rounded-md bg-(--color-accent) px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:opacity-90"
                    >
                        {isCopied ? "✓ 복사됨" : "복사"}
                    </button>
                </div>
            )}
        </div>
    );
}
