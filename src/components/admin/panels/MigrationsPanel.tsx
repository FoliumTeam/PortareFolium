import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { MIGRATIONS, sqlHash } from "@/lib/migrations";
import type { Migration, AppliedRecord } from "@/lib/migrations";

// site_config key
const CONFIG_KEY = "applied_migrations";

// 저장값 역직렬화: 구버전(string[])과 신버전(AppliedRecord[]) 모두 처리
function parseApplied(raw: unknown): AppliedRecord[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
        typeof item === "string"
            ? { id: item, hash: "" }
            : (item as AppliedRecord)
    );
}

export default function MigrationsPanel() {
    const [applied, setApplied] = useState<AppliedRecord[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // 정렬 방향: newest = 내림차순(기본), oldest = 오름차순
    const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");

    // applied_migrations 로드
    useEffect(() => {
        if (!browserClient) {
            setLoading(false);
            return;
        }
        browserClient
            .from("site_config")
            .select("value")
            .eq("key", CONFIG_KEY)
            .single()
            .then(({ data }) => {
                setApplied(parseApplied(data?.value));
                setLoading(false);
            });
    }, []);

    const appliedIds = new Set(applied.map((r) => r.id));

    // 적용 완료 토글: 적용 시 현재 SQL 해시 저장
    const toggleApplied = async (migration: Migration) => {
        if (!browserClient) return;
        const next = appliedIds.has(migration.id)
            ? applied.filter((r) => r.id !== migration.id)
            : [...applied, { id: migration.id, hash: sqlHash(migration.sql) }];
        await browserClient.from("site_config").upsert({
            key: CONFIG_KEY,
            value: next,
        });
        setApplied(next);
    };

    // SQL 복사
    const copySql = (migration: Migration) => {
        navigator.clipboard.writeText(migration.sql);
        setCopied(migration.id);
        setTimeout(() => setCopied(null), 2000);
    };

    // 적용 후 SQL이 변경된 마이그레이션 탐지
    const isTampered = (migration: Migration): boolean => {
        const record = applied.find((r) => r.id === migration.id);
        if (!record || !record.hash) return false;
        return record.hash !== sqlHash(migration.sql);
    };

    const sorted =
        sortDir === "newest" ? [...MIGRATIONS].reverse() : MIGRATIONS;
    const pending = sorted.filter((m) => !appliedIds.has(m.id));
    const done = sorted.filter((m) => appliedIds.has(m.id));

    if (loading) {
        return (
            <div className="p-8 text-sm text-(--color-muted)">
                불러오는 중...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="mb-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                        DB 마이그레이션
                    </h2>
                    <p className="text-sm text-(--color-muted)">
                        아래 SQL을 Supabase SQL Editor에서 실행하고, 완료 후
                        체크하세요.
                    </p>
                </div>
                <select
                    value={sortDir}
                    onChange={(e) =>
                        setSortDir(e.target.value as "newest" | "oldest")
                    }
                    className="shrink-0 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-foreground) focus:outline-none"
                >
                    <option value="newest">최신순</option>
                    <option value="oldest">오래된순</option>
                </select>
            </div>

            {/* 미적용 마이그레이션 */}
            {pending.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-bold tracking-widest text-amber-600 uppercase">
                        미적용 ({pending.length})
                    </h3>
                    <div className="space-y-4">
                        {pending.map((m) => (
                            <MigrationCard
                                key={m.id}
                                migration={m}
                                isApplied={false}
                                isTampered={false}
                                isCopied={copied === m.id}
                                onToggle={() => toggleApplied(m)}
                                onCopy={() => copySql(m)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {pending.length === 0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                    ✓ 모든 마이그레이션이 적용되었습니다.
                </div>
            )}

            {/* 적용 완료 */}
            {done.length > 0 && (
                <section>
                    <h3 className="mb-3 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                        적용 완료 ({done.length})
                    </h3>
                    <div className="space-y-3">
                        {done.map((m) => (
                            <MigrationCard
                                key={m.id}
                                migration={m}
                                isApplied={true}
                                isTampered={isTampered(m)}
                                isCopied={copied === m.id}
                                onToggle={() => toggleApplied(m)}
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
    isTampered,
    isCopied,
    onToggle,
    onCopy,
}: {
    migration: Migration;
    isApplied: boolean;
    isTampered: boolean;
    isCopied: boolean;
    onToggle: () => void;
    onCopy: () => void;
}) {
    const [open, setOpen] = useState(!isApplied || isTampered);

    return (
        <div
            className={[
                "rounded-xl border p-4 transition-opacity",
                isTampered
                    ? "border-amber-400 bg-amber-50 opacity-100 dark:bg-amber-950/20"
                    : isApplied
                      ? "border-(--color-border) opacity-50"
                      : "border-(--color-border) bg-(--color-surface)",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                {/* 완료 체크박스 */}
                <button
                    onClick={onToggle}
                    className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        isApplied
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-(--color-border) hover:border-green-400",
                    ].join(" ")}
                    title={isApplied ? "적용 취소" : "적용 완료로 표시"}
                >
                    {isApplied && (
                        <svg
                            className="h-3 w-3"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path d="M2 6l3 3 5-5" />
                        </svg>
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-(--color-foreground)">
                            {migration.title}
                        </span>
                        <span className="rounded-full bg-(--color-surface-subtle) px-2 py-0.5 text-xs text-(--color-muted)">
                            {migration.id}
                        </span>
                        {/* SQL 변경 경고 */}
                        {isTampered && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                ⚠ SQL 변경됨
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-(--color-muted)">
                        {migration.feature}
                    </p>

                    {/* SQL 변경 안내 */}
                    {isTampered && (
                        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                            적용 당시와 SQL이 달라졌습니다. 변경 내용을 확인하고
                            필요하면 새 마이그레이션을 추가하세요.
                        </p>
                    )}

                    {/* SQL 토글 */}
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
            </div>
        </div>
    );
}
