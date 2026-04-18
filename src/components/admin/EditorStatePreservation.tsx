"use client";

// 에디터 상태 보존 모달 (Supabase 기반 snapshot 데이터 손실 방지)
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { browserClient } from "@/lib/supabase";
import { getCleanMarkdown } from "@/lib/tiptap-markdown";
import { triggerSnapshotCleanup } from "@/lib/snapshot-cleanup";
import StatePreviewModal from "@/components/admin/StatePreviewModal";

interface EditorSnapshot {
    id: string;
    content: string;
    savedAt: string;
    // "Initial" | "Auto-save" | "Bookmark"
    label: string;
}

interface EditorStatePreservationProps {
    editor: Editor | null;
    entityType: "post" | "portfolio" | "book";
    entitySlug: string;
    currentContent: string;
    isOpen: boolean;
    onClose: () => void;
    // total = 전체 snapshot 수, baseline = 6 (Initial 1 + Auto max 5)
    onSnapshotCountChange?: (total: number, baseline: number) => void;
    // Trigger 2 — snapshot 삭제 시 true-orphan cleanup 호출용 (post/portfolio만)
    folderPath?: string;
    thumbnail?: string;
}

const MAX_AUTO_SNAPSHOTS = 5;
const AUTOSAVE_INTERVAL = 5 * 60 * 1000; // 5분

// Supabase에서 snapshot 로드
async function loadSnapshots(
    entityType: string,
    entitySlug: string
): Promise<EditorSnapshot[]> {
    if (!browserClient) return [];
    try {
        const { data } = await browserClient
            .from("editor_states")
            .select("id, entity_type, entity_slug, label, content, created_at")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .order("created_at", { ascending: false });
        return (data ?? []).map((row) => ({
            id: row.id,
            content: row.content,
            savedAt: row.created_at,
            label: row.label,
        }));
    } catch {
        return [];
    }
}

// Supabase에 snapshot 저장
async function saveSnapshot(
    entityType: string,
    entitySlug: string,
    label: string,
    content: string
): Promise<EditorSnapshot | null> {
    if (!browserClient) return null;
    try {
        const { data } = await browserClient
            .from("editor_states")
            .insert({
                entity_type: entityType,
                entity_slug: entitySlug,
                label,
                content,
            })
            .select("id, label, content, created_at")
            .single();
        if (!data) return null;
        return {
            id: data.id,
            content: data.content,
            savedAt: data.created_at,
            label: data.label,
        };
    } catch {
        return null;
    }
}

// snapshot 삭제
async function deleteSnapshotById(id: string): Promise<void> {
    if (!browserClient) return;
    try {
        await browserClient.from("editor_states").delete().eq("id", id);
    } catch {
        // best-effort
    }
}

// 만료된 Initial + Auto 정리 (24시간 초과)
async function cleanupExpired(
    entityType: string,
    entitySlug: string
): Promise<void> {
    if (!browserClient) return;
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        await browserClient
            .from("editor_states")
            .delete()
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .in("label", ["Initial", "Auto-save"])
            .lt("created_at", cutoff);
    } catch {
        // best-effort
    }
}

// Auto-save FIFO eviction (max 5)
async function evictOldAutoSaves(
    entityType: string,
    entitySlug: string
): Promise<void> {
    if (!browserClient) return;
    try {
        const { data } = await browserClient
            .from("editor_states")
            .select("id")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .eq("label", "Auto-save")
            .order("created_at", { ascending: true });
        if (!data || data.length <= MAX_AUTO_SNAPSHOTS) return;
        const toDelete = data.slice(0, data.length - MAX_AUTO_SNAPSHOTS);
        for (const row of toDelete) {
            await browserClient.from("editor_states").delete().eq("id", row.id);
        }
    } catch {
        // best-effort
    }
}

// Initial upsert (기존 Initial 삭제 후 새 Initial 생성)
async function upsertInitial(
    entityType: string,
    entitySlug: string,
    content: string
): Promise<EditorSnapshot | null> {
    if (!browserClient) return null;
    try {
        await browserClient
            .from("editor_states")
            .delete()
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .eq("label", "Initial");
        return saveSnapshot(entityType, entitySlug, "Initial", content);
    } catch {
        return null;
    }
}

export default function EditorStatePreservation({
    editor,
    entityType,
    entitySlug,
    currentContent,
    isOpen,
    onClose,
    onSnapshotCountChange,
    folderPath,
    thumbnail,
}: EditorStatePreservationProps) {
    // currentContent / thumbnail 최신 ref — async cleanup 호출 시 stale 회피
    const contentRef = useRef(currentContent);
    contentRef.current = currentContent;
    const thumbRef = useRef(thumbnail ?? "");
    thumbRef.current = thumbnail ?? "";

    // Trigger 2 — snapshot 삭제 후 true-orphan cleanup
    // post/portfolio만 적용 (book entity는 scope 외)
    const fireCleanup = useCallback(() => {
        if (!folderPath) return;
        if (entityType !== "post" && entityType !== "portfolio") return;
        triggerSnapshotCleanup({
            folderPath,
            entityType,
            entitySlug,
            currentContent: contentRef.current,
            thumbnail: thumbRef.current,
        });
    }, [folderPath, entityType, entitySlug]);
    const [snapshots, setSnapshots] = useState<EditorSnapshot[]>([]);
    const [previewSnapshot, setPreviewSnapshot] =
        useState<EditorSnapshot | null>(null);
    const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmBulkDeleteAuto, setConfirmBulkDeleteAuto] = useState(false);
    const [confirmBulkDeleteManual, setConfirmBulkDeleteManual] =
        useState(false);
    const initialSaved = useRef(false);

    // snapshot 변경 시 부모에 count 전달
    useEffect(() => {
        onSnapshotCountChange?.(snapshots.length, 6);
    }, [snapshots, onSnapshotCountChange]);

    // 초기 로드 + Initial snapshot upsert (1회만)
    useEffect(() => {
        if (!editor || initialSaved.current) return;
        initialSaved.current = true;

        const init = async () => {
            await cleanupExpired(entityType, entitySlug);
            if (currentContent) {
                await upsertInitial(entityType, entitySlug, currentContent);
            }
            const loaded = await loadSnapshots(entityType, entitySlug);
            setSnapshots(loaded);
            // cleanupExpired/upsertInitial이 snapshot을 지웠을 수 있으므로 cleanup
            fireCleanup();
        };
        init();
    }, [editor, entityType, entitySlug, currentContent]);

    // 5분 간격 Auto-save (최대 5개, FIFO eviction)
    useEffect(() => {
        if (!editor) return;

        const id = setInterval(async () => {
            const md = getCleanMarkdown(editor);
            if (!md) return;

            const snap = await saveSnapshot(
                entityType,
                entitySlug,
                "Auto-save",
                md
            );
            await evictOldAutoSaves(entityType, entitySlug);
            if (snap) {
                const loaded = await loadSnapshots(entityType, entitySlug);
                setSnapshots(loaded);
                // evictOldAutoSaves가 FIFO eviction한 경우 cleanup
                fireCleanup();
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(id);
    }, [editor, entityType, entitySlug]);

    // Escape 키로 모달 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // 현재 상태 수동 저장 (Bookmark, 무제한)
    const handleBookmark = useCallback(async () => {
        if (!editor) return;
        const md = getCleanMarkdown(editor);
        if (!md) return;

        const snap = await saveSnapshot(entityType, entitySlug, "Bookmark", md);
        if (snap) {
            const loaded = await loadSnapshots(entityType, entitySlug);
            setSnapshots(loaded);
        }
    }, [editor, entityType, entitySlug]);

    // Revert 처리
    const handleRevert = useCallback(
        (snapshot: EditorSnapshot) => {
            if (!editor) return;
            editor.commands.setContent(snapshot.content);
            setConfirmRevertId(null);
        },
        [editor]
    );

    // Snapshot 삭제 (Initial 제외)
    const handleDelete = useCallback(
        async (id: string) => {
            await deleteSnapshotById(id);
            const loaded = await loadSnapshots(entityType, entitySlug);
            setSnapshots(loaded);
            fireCleanup();
        },
        [entityType, entitySlug, fireCleanup]
    );

    // 섹션 전체 삭제 (Auto-save 또는 Bookmark)
    const handleDeleteAll = useCallback(
        async (label: "Auto-save" | "Bookmark") => {
            const toDelete = snapshots.filter((s) => s.label === label);
            for (const snap of toDelete) {
                await deleteSnapshotById(snap.id);
            }
            const loaded = await loadSnapshots(entityType, entitySlug);
            setSnapshots(loaded);
            fireCleanup();
        },
        [snapshots, entityType, entitySlug, fireCleanup]
    );

    // badge label 표시 텍스트
    function getBadgeText(label: string): string {
        if (label === "Initial") return "초기 (Initial)";
        if (label === "Auto-save") return "자동 (Auto)";
        return "수동 (Manual)";
    }

    // badge color 클래스
    function getBadgeClass(label: string): string {
        if (label === "Initial")
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        if (label === "Auto-save")
            return "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400";
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    }

    if (!isOpen || typeof window === "undefined") return null;

    const initialSnapshots = snapshots.filter((s) => s.label === "Initial");
    const autoSnapshots = snapshots.filter((s) => s.label === "Auto-save");
    const manualSnapshots = snapshots.filter((s) => s.label === "Bookmark");

    // snapshot 카드 렌더링
    function renderSnapshotCard(snap: EditorSnapshot) {
        return (
            <div
                key={snap.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
            >
                <div className="mb-2 flex items-center justify-between">
                    <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${getBadgeClass(snap.label)}`}
                    >
                        {getBadgeText(snap.label)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(snap.savedAt).toLocaleString()}
                    </span>
                </div>

                {/* Revert 확인 UI */}
                {confirmRevertId === snap.id ? (
                    <div className="flex flex-col gap-2 text-xs">
                        <span className="text-amber-600 dark:text-amber-400">
                            현재 내용이 이 스냅샷으로 대체됩니다.
                            계속하시겠습니까?
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleRevert(snap)}
                                className="rounded-md bg-red-600 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                            >
                                확인
                            </button>
                            <button
                                onClick={() => setConfirmRevertId(null)}
                                className="rounded-md bg-zinc-400 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                ) : confirmDeleteId === snap.id ? (
                    <div className="flex flex-col gap-2 text-xs">
                        <span className="text-red-600 dark:text-red-400">
                            이 스냅샷을 삭제하시겠습니까?
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    handleDelete(snap.id);
                                    setConfirmDeleteId(null);
                                }}
                                className="rounded-md bg-red-600 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                            >
                                삭제
                            </button>
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md bg-zinc-400 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 text-xs">
                        <button
                            onClick={() => setPreviewSnapshot(snap)}
                            className="rounded-md bg-zinc-600 px-3 py-1.5 font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                        >
                            미리보기
                        </button>
                        <button
                            onClick={() => setConfirmRevertId(snap.id)}
                            className="rounded-md bg-amber-500 px-3 py-1.5 font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                        >
                            복원
                        </button>
                        {snap.label !== "Initial" && (
                            <button
                                onClick={() => setConfirmDeleteId(snap.id)}
                                className="rounded-md bg-red-600 px-3 py-1.5 font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                            >
                                삭제
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return createPortal(
        <>
            {/* 모달 backdrop */}
            <div
                className="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
                onClick={onClose}
            >
                <div
                    className="tablet:mx-4 tablet:max-w-md mx-2 flex max-h-[80vh] w-full flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            상태 기록 ({snapshots.length})
                        </span>
                        <button
                            onClick={onClose}
                            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 현재 상태 저장 버튼 */}
                    <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
                        <button
                            type="button"
                            onClick={handleBookmark}
                            className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-400 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            현재 상태 저장
                        </button>
                    </div>

                    {/* 3개 카테고리로 나눈 snapshot 목록 */}
                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {/* 초기 (Initial) 섹션 */}
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            초기 (Initial)
                        </h4>
                        <div className="flex flex-col gap-2">
                            {initialSnapshots.map(renderSnapshotCard)}
                        </div>

                        <hr className="my-3 border-zinc-200 dark:border-zinc-700" />

                        {/* 자동 (Auto) 섹션 */}
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            자동 (Auto)
                        </h4>
                        {autoSnapshots.length === 0 ? (
                            <p className="py-1 text-xs text-zinc-400 dark:text-zinc-500">
                                자동 저장 없음
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {autoSnapshots.map(renderSnapshotCard)}
                                {confirmBulkDeleteAuto ? (
                                    <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20">
                                        <span className="text-red-600 dark:text-red-400">
                                            자동 저장된 스냅샷을 모두
                                            삭제하시겠습니까?
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    await handleDeleteAll(
                                                        "Auto-save"
                                                    );
                                                    setConfirmBulkDeleteAuto(
                                                        false
                                                    );
                                                }}
                                                className="rounded-md bg-red-600 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                                            >
                                                삭제
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setConfirmBulkDeleteAuto(
                                                        false
                                                    )
                                                }
                                                className="rounded-md bg-zinc-400 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() =>
                                            setConfirmBulkDeleteAuto(true)
                                        }
                                        className="mt-1 w-full rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                    >
                                        모두 삭제
                                    </button>
                                )}
                            </div>
                        )}

                        <hr className="my-3 border-zinc-200 dark:border-zinc-700" />

                        {/* 수동 (Manual) 섹션 */}
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            수동 (Manual)
                        </h4>
                        {manualSnapshots.length === 0 ? (
                            <p className="py-1 text-xs text-zinc-400 dark:text-zinc-500">
                                수동 저장 없음
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {manualSnapshots.map(renderSnapshotCard)}
                                {confirmBulkDeleteManual ? (
                                    <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20">
                                        <span className="text-red-600 dark:text-red-400">
                                            수동 저장된 스냅샷을 모두
                                            삭제하시겠습니까?
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    await handleDeleteAll(
                                                        "Bookmark"
                                                    );
                                                    setConfirmBulkDeleteManual(
                                                        false
                                                    );
                                                }}
                                                className="rounded-md bg-red-600 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                                            >
                                                삭제
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setConfirmBulkDeleteManual(
                                                        false
                                                    )
                                                }
                                                className="rounded-md bg-zinc-400 px-2.5 py-1 font-medium whitespace-nowrap text-white"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() =>
                                            setConfirmBulkDeleteManual(true)
                                        }
                                        className="mt-1 w-full rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                    >
                                        모두 삭제
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview 모달 */}
            {previewSnapshot && (
                <StatePreviewModal
                    isOpen={true}
                    onClose={() => setPreviewSnapshot(null)}
                    content={previewSnapshot.content}
                    label={previewSnapshot.label}
                    savedAt={previewSnapshot.savedAt}
                />
            )}
        </>,
        document.body
    );
}
