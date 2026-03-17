import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase";
import { MIGRATIONS } from "@/lib/migrations";
import type { Migration } from "@/lib/migrations";

// site_config key
const CONFIG_KEY = "applied_migrations";

export default function MigrationsPanel() {
    const [applied, setApplied] = useState<string[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                if (data?.value && Array.isArray(data.value)) {
                    setApplied(data.value as string[]);
                }
                setLoading(false);
            });
    }, []);

    // 적용 완료 토글
    const toggleApplied = async (id: string) => {
        if (!browserClient) return;
        const next = applied.includes(id)
            ? applied.filter((x) => x !== id)
            : [...applied, id];
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

    const pending = MIGRATIONS.filter((m) => !applied.includes(m.id));
    const done = MIGRATIONS.filter((m) => applied.includes(m.id));

    if (loading) {
        return (
            <div className="p-8 text-sm text-(--color-muted)">
                불러오는 중...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div>
                <h2 className="mb-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                    DB 마이그레이션
                </h2>
                <p className="text-sm text-(--color-muted)">
                    아래 SQL을 Supabase SQL Editor에서 실행하고, 완료 후
                    체크하세요.
                </p>
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
                                isCopied={copied === m.id}
                                onToggle={() => toggleApplied(m.id)}
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
                                isCopied={copied === m.id}
                                onToggle={() => toggleApplied(m.id)}
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
    onToggle,
    onCopy,
}: {
    migration: Migration;
    isApplied: boolean;
    isCopied: boolean;
    onToggle: () => void;
    onCopy: () => void;
}) {
    const [open, setOpen] = useState(!isApplied);

    return (
        <div
            className={[
                "rounded-xl border p-4 transition-opacity",
                isApplied
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
                    </div>
                    <p className="mt-0.5 text-xs text-(--color-muted)">
                        {migration.feature}
                    </p>

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
