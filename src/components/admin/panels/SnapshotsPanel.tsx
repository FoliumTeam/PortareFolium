"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listSnapshots, restoreSnapshot } from "@/app/admin/actions/snapshots";
import type { Snapshot } from "@/app/admin/actions/snapshots";

// 테이블 필터 옵션
const TABLE_OPTIONS = [
    { value: "", label: "전체" },
    { value: "posts", label: "posts" },
    { value: "portfolio_items", label: "portfolio_items" },
    { value: "resume_data", label: "resume_data" },
];

export default function SnapshotsPanel() {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableFilter, setTableFilter] = useState("");
    const [restoring, setRestoring] = useState<string | null>(null);
    const [restoreMsg, setRestoreMsg] = useState<{
        id: string;
        ok: boolean;
        msg: string;
    } | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setSnapshots(await listSnapshots(tableFilter || undefined));
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [tableFilter]);

    const handleRestore = async (snapshot: Snapshot) => {
        if (
            !confirm(
                `이 스냅샷으로 복원하시겠습니까?\n테이블: ${snapshot.source_table}\n시각: ${new Date(snapshot.created_at).toLocaleString("ko-KR")}`
            )
        )
            return;
        setRestoring(snapshot.id);
        setRestoreMsg(null);
        const res = await restoreSnapshot(snapshot.id);
        setRestoring(null);
        if ("error" in res) {
            setRestoreMsg({ id: snapshot.id, ok: false, msg: res.error });
        } else {
            setRestoreMsg({ id: snapshot.id, ok: true, msg: "복원 완료" });
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            {/* 헤더 */}
            <div>
                <h2 className="mb-1 text-2xl font-black tracking-tight text-(--color-foreground)">
                    콘텐츠 스냅샷
                </h2>
                <p className="text-sm text-(--color-muted)">
                    MCP 에이전트 쓰기 작업 전 자동 저장된 백업. 레코드당 최대
                    20개 보관.
                </p>
            </div>

            {/* 필터 + 새로고침 */}
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent) focus:outline-none"
                >
                    {TABLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={load}
                    disabled={loading}
                >
                    <span className="whitespace-nowrap">
                        {loading ? "로딩 중..." : "새로고침"}
                    </span>
                </Button>
            </div>

            {/* 스냅샷 목록 */}
            {snapshots.length === 0 && !loading && (
                <p className="text-sm text-(--color-muted)">
                    스냅샷이 없습니다.
                </p>
            )}

            <div className="space-y-3">
                {snapshots.map((snap) => {
                    const isExpanded = expanded === snap.id;
                    const msg = restoreMsg?.id === snap.id ? restoreMsg : null;
                    return (
                        <div
                            key={snap.id}
                            className="space-y-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                    {snap.source_table}
                                </Badge>
                                <span className="font-mono text-xs text-(--color-muted)">
                                    {snap.record_id}
                                </span>
                                <span className="ml-auto text-xs text-(--color-muted)">
                                    {new Date(snap.created_at).toLocaleString(
                                        "ko-KR"
                                    )}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() =>
                                        setExpanded(isExpanded ? null : snap.id)
                                    }
                                    className="text-xs text-(--color-accent) hover:underline"
                                >
                                    {isExpanded
                                        ? "데이터 숨기기"
                                        : "데이터 보기"}
                                </button>

                                {msg && (
                                    <span
                                        className={[
                                            "text-xs font-medium",
                                            msg.ok
                                                ? "text-green-600"
                                                : "text-red-500",
                                        ].join(" ")}
                                    >
                                        {msg.msg}
                                    </span>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestore(snap)}
                                    disabled={restoring === snap.id}
                                    className="ml-auto"
                                >
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="whitespace-nowrap">
                                        {restoring === snap.id
                                            ? "복원 중..."
                                            : "복원"}
                                    </span>
                                </Button>
                            </div>

                            {isExpanded && (
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-(--color-surface-subtle) p-3 text-xs leading-relaxed text-(--color-foreground)">
                                    {JSON.stringify(snap.data, null, 2)}
                                </pre>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
