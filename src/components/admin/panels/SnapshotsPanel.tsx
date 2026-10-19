"use client";
import { useUILocale } from "@/components/LocaleProvider";
import { LocalizedText, LocalizedRichText } from "@/components/LocalizedText";

import { useEffect, useState } from "react";
import { Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    createSnapshot,
    deleteSnapshot,
    getSnapshotDownload,
    listSnapshots,
} from "@/app/admin/actions/snapshots";
import type { DatabaseSnapshot } from "@/app/admin/actions/snapshots";

type StatusMessage = {
    ok: boolean;
    text: string;
};

export default function SnapshotsPanel() {
    const { locale } = useUILocale();
    const { confirm } = useConfirmDialog();
    const [snapshots, setSnapshots] = useState<DatabaseSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const refreshButtonClassName =
        "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";

    // Snapshot 목록 로드
    const load = async () => {
        setLoading(true);
        setSnapshots(await listSnapshots());
        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, []);

    // Snapshot 생성
    const handleCreateSnapshot = async () => {
        setCreating(true);
        setStatus(null);

        const result = await createSnapshot();

        setCreating(false);

        if ("error" in result) {
            setStatus({ ok: false, text: result.error });
            return;
        }

        setStatus({ ok: true, text: "Snapshot 생성 완료" });
        setSnapshots((prev) => [result, ...prev]);
    };

    // Snapshot 다운로드
    const handleDownloadSnapshot = async (snapshot: DatabaseSnapshot) => {
        setDownloadingId(snapshot.id);
        setStatus(null);

        const result = await getSnapshotDownload(snapshot.id);

        setDownloadingId(null);

        if ("error" in result) {
            setStatus({ ok: false, text: result.error });
            return;
        }

        const blob = new Blob([result.content], {
            type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setStatus({ ok: true, text: `${result.filename} 다운로드 시작` });
    };

    // Snapshot 삭제
    const handleDeleteSnapshot = async (snapshot: DatabaseSnapshot) => {
        const ok = await confirm({
            title: "DB Snapshot 삭제",
            description: `이 Snapshot을 삭제하시겠습니까?\n시각: ${new Date(snapshot.created_at).toLocaleString(locale)}`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });

        if (!ok) return;

        setDeletingId(snapshot.id);
        setStatus(null);

        const result = await deleteSnapshot(snapshot.id);

        setDeletingId(null);

        if ("error" in result) {
            setStatus({ ok: false, text: result.error });
            return;
        }

        setSnapshots((prev) => prev.filter((item) => item.id !== snapshot.id));
        setStatus({ ok: true, text: "Snapshot 삭제 완료" });
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 space-y-4 bg-(--color-surface) pb-3">
                <div>
                    <h2 className="mb-1 text-3xl font-bold tracking-tight text-(--color-foreground)">
                        <LocalizedText text={"DB 스냅샷"} />
                    </h2>
                    <div className="my-3 rounded-xl border border-(--color-border) p-4">
                        <a
                            className="inline-flex items-center gap-2 font-semibold underline"
                            href="/api/orireki-export"
                            download
                        >
                            <Download size={16} />
                            <LocalizedText text={" Orireki로 내보내기"} />
                        </a>
                        <p className="mt-2 text-sm text-(--color-muted)">
                            <LocalizedText
                                text={
                                    "콘텐츠·설정·소유 미디어를 담은 ZIP 다운로드. 인증 정보·관리 토큰 제외. Orireki의 가져오기 화면에서 검사 후 Draft로 이전 가능. 원본 사이트 변경 없음."
                                }
                            />
                        </p>
                    </div>
                    <div className="space-y-1 text-sm text-(--color-muted)">
                        <p>
                            <LocalizedRichText
                                text={
                                    "{0}은 현재 {1} schema 전체를 JSON으로 저장합니다."
                                }
                                values={[
                                    <code>
                                        <LocalizedText text={"Take snapshot"} />
                                    </code>,
                                    <code>
                                        <LocalizedText text={"public"} />
                                    </code>,
                                ]}
                            />
                        </p>
                        <p>
                            <LocalizedRichText
                                text={
                                    "{0} 이미지와 {1} 데이터는 포함되지 않습니다."
                                }
                                values={[
                                    <code>
                                        <LocalizedText text={"storage"} />
                                    </code>,
                                    <code>
                                        <LocalizedText text={"auth"} />
                                    </code>,
                                ]}
                            />
                        </p>
                        <p>
                            <LocalizedText
                                text={
                                    "페이지 내 미리보기는 제공하지 않고, 생성 시각 확인과 JSON 다운로드만 지원합니다."
                                }
                            />
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        size="sm"
                        onClick={() => void load()}
                        disabled={loading || creating}
                        className={refreshButtonClassName}
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 shrink-0 ${
                                loading ? "animate-spin" : ""
                            }`}
                        />
                        <span className="whitespace-nowrap">
                            {loading ? (
                                <LocalizedText text={"새로고침 중..."} />
                            ) : (
                                <LocalizedText text={"새로고침"} />
                            )}
                        </span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => void handleCreateSnapshot()}
                        disabled={creating || loading}
                        className="bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                    >
                        <Plus className="mr-2 h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">
                            {creating ? (
                                <LocalizedText text={"생성 중..."} />
                            ) : (
                                <LocalizedText text={"Take snapshot"} />
                            )}
                        </span>
                    </Button>
                </div>

                {status && (
                    <p
                        className={[
                            "text-sm font-medium",
                            status.ok ? "text-green-600" : "text-red-500",
                        ].join(" ")}
                    >
                        {<LocalizedText text={status.text} />}
                    </p>
                )}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                {snapshots.length === 0 && !loading && (
                    <p className="text-sm text-(--color-muted)">
                        <LocalizedText
                            text={"저장된 DB Snapshot이 없습니다."}
                        />
                    </p>
                )}

                <div className="space-y-3">
                    {snapshots.map((snapshot) => (
                        <div
                            key={snapshot.id}
                            className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4"
                        >
                            <div className="flex flex-wrap items-start gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="truncate font-mono text-sm text-(--color-foreground)">
                                        {snapshot.filename}
                                    </p>
                                    <p className="text-xs text-(--color-muted)">
                                        <LocalizedRichText
                                            text={"생성 시각: {0}"}
                                            values={[
                                                new Date(
                                                    snapshot.created_at
                                                ).toLocaleString(locale),
                                            ]}
                                        />
                                    </p>
                                    <p className="text-xs text-(--color-muted)">
                                        <LocalizedRichText
                                            text={"포함 테이블: {0}개"}
                                            values={[
                                                snapshot.table_names.length,
                                            ]}
                                        />
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 self-center">
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void handleDownloadSnapshot(
                                                snapshot
                                            )
                                        }
                                        disabled={
                                            downloadingId === snapshot.id ||
                                            deletingId === snapshot.id ||
                                            creating
                                        }
                                        className="bg-(--color-accent) text-(--color-on-accent) hover:opacity-90"
                                    >
                                        <Download className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {downloadingId === snapshot.id ? (
                                                <LocalizedText
                                                    text={"다운로드 준비 중..."}
                                                />
                                            ) : (
                                                <LocalizedText
                                                    text={"다운로드"}
                                                />
                                            )}
                                        </span>
                                    </Button>

                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void handleDeleteSnapshot(snapshot)
                                        }
                                        disabled={
                                            deletingId === snapshot.id ||
                                            downloadingId === snapshot.id ||
                                            creating
                                        }
                                        className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {deletingId === snapshot.id ? (
                                                <LocalizedText
                                                    text={"삭제 중..."}
                                                />
                                            ) : (
                                                <LocalizedText text={"삭제"} />
                                            )}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
