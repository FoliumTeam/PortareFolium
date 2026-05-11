"use client";

// 에디터 임시 저장 모달 (Supabase 기반 snapshot 데이터 손실 방지)
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Clock3, FileClock, History, Save } from "lucide-react";
import type { Editor } from "@tiptap/react";
import {
    createEditorSnapshot,
    deleteEditorSnapshot,
    deleteEditorSnapshotsByLabel,
    initializeEditorSnapshots,
} from "@/app/admin/actions/editor-states";
import { getCleanMarkdown } from "@/lib/tiptap-markdown";
import { triggerSnapshotCleanup } from "@/lib/snapshot-cleanup";
import StatePreviewModal from "@/components/admin/StatePreviewModal";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

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
    const initialSaved = useRef(false);
    const { confirm } = useConfirmDialog();

    // snapshot 변경 시 부모에 count 전달
    useEffect(() => {
        onSnapshotCountChange?.(snapshots.length, 6);
    }, [snapshots, onSnapshotCountChange]);

    // 초기 로드 + Initial snapshot upsert (1회만)
    useEffect(() => {
        if (!editor || initialSaved.current) return;
        initialSaved.current = true;

        const init = async () => {
            const loaded = await initializeEditorSnapshots(
                entityType,
                entitySlug,
                currentContent
            );
            setSnapshots(loaded);
            fireCleanup();
        };
        void init();
    }, [editor, entityType, entitySlug, currentContent]);

    // 5분 간격 Auto-save (최대 5개, FIFO eviction)
    useEffect(() => {
        if (!editor) return;

        const id = setInterval(async () => {
            const md = getCleanMarkdown(editor);
            if (!md) return;

            const loaded = await createEditorSnapshot(
                entityType,
                entitySlug,
                "Auto-save",
                md
            );
            setSnapshots(loaded);
            fireCleanup();
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

        const loaded = await createEditorSnapshot(
            entityType,
            entitySlug,
            "Bookmark",
            md
        );
        setSnapshots(loaded);
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
            const loaded = await deleteEditorSnapshot(
                entityType,
                entitySlug,
                id
            );
            setSnapshots(loaded);
            fireCleanup();
        },
        [entityType, entitySlug, fireCleanup]
    );

    // 섹션 전체 삭제 (Auto-save 또는 Bookmark)
    const handleDeleteAll = useCallback(
        async (label: "Auto-save" | "Bookmark") => {
            const isAuto = label === "Auto-save";
            const ok = await confirm({
                title: isAuto ? "자동 저장 모두 삭제" : "수동 저장 모두 삭제",
                description: isAuto
                    ? "자동 임시 저장본을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다."
                    : "수동 임시 저장본을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
                confirmText: "모두 삭제",
                cancelText: "취소",
                variant: "destructive",
            });
            if (!ok) return;

            const loaded = await deleteEditorSnapshotsByLabel(
                entityType,
                entitySlug,
                label
            );
            setSnapshots(loaded);
            fireCleanup();
        },
        [confirm, entityType, entitySlug, fireCleanup]
    );

    // badge label 표시 텍스트
    function getBadgeText(label: string): string {
        if (label === "Initial") return "초기본";
        if (label === "Auto-save") return "자동 저장";
        return "수동 저장";
    }

    function getSnapshotIcon(label: string) {
        if (label === "Initial") return FileClock;
        if (label === "Auto-save") return Clock3;
        return Save;
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
        const SnapshotIcon = getSnapshotIcon(snap.label);

        return (
            <div
                key={snap.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
                <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold ${getBadgeClass(snap.label)}`}
                    >
                        <SnapshotIcon className="h-4 w-4" />
                        {getBadgeText(snap.label)}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(snap.savedAt).toLocaleString()}
                    </span>
                </div>

                {/* Revert 확인 UI */}
                {confirmRevertId === snap.id ? (
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-describedby={`revert-desc-${snap.id}`}
                        className="flex flex-col gap-2 text-sm"
                    >
                        <span
                            id={`revert-desc-${snap.id}`}
                            className="text-amber-600 dark:text-amber-400"
                        >
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
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-describedby={`delete-desc-${snap.id}`}
                        className="flex flex-col gap-2 text-sm"
                    >
                        <span
                            id={`delete-desc-${snap.id}`}
                            className="text-red-600 dark:text-red-400"
                        >
                            이 임시 저장본을 삭제하시겠습니까?
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
                    <div className="flex gap-2 text-sm">
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
                    className="tablet:mx-4 tablet:max-w-4xl mx-2 flex max-h-[80vh] w-full flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                        <div className="min-w-0">
                            <p className="text-sm font-bold tracking-[0.16em] text-zinc-500 uppercase dark:text-zinc-400">
                                Draft snapshots
                            </p>
                            <h3 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                                <History className="h-5 w-5 text-indigo-500" />
                                임시 저장
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                자동 저장본과 직접 저장한 복구 지점을 확인하고
                                되돌릴 수 있습니다.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold whitespace-nowrap text-white">
                                {snapshots.length}개
                            </span>
                            <button
                                onClick={onClose}
                                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                aria-label="닫기"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* 현재 상태 저장 버튼 */}
                    <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                        <button
                            type="button"
                            onClick={handleBookmark}
                            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            현재 내용을 수동 임시 저장
                        </button>
                        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                            저장 버튼을 누르기 전에도 복구용 지점을 남길 수
                            있습니다.
                        </p>
                    </div>

                    {/* 3개 카테고리로 나눈 snapshot 목록 */}
                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {/* 초기본 섹션 */}
                        <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-700 dark:text-zinc-300">
                            <FileClock className="h-4 w-4 text-blue-500" />
                            초기본
                        </h4>
                        <div className="flex flex-col gap-2">
                            {initialSnapshots.map(renderSnapshotCard)}
                        </div>

                        <hr className="my-3 border-zinc-200 dark:border-zinc-700" />

                        {/* 자동 저장 섹션 */}
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-2 text-base font-semibold text-zinc-700 dark:text-zinc-300">
                                <Clock3 className="h-4 w-4 text-zinc-500" />
                                자동 저장
                            </h4>
                            {autoSnapshots.length > 0 && (
                                <button
                                    onClick={() =>
                                        void handleDeleteAll("Auto-save")
                                    }
                                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    모두 삭제
                                </button>
                            )}
                        </div>
                        {autoSnapshots.length === 0 ? (
                            <p className="py-1 text-sm text-zinc-400 dark:text-zinc-500">
                                자동 저장 없음
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {autoSnapshots.map(renderSnapshotCard)}
                            </div>
                        )}

                        <hr className="my-3 border-zinc-200 dark:border-zinc-700" />

                        {/* 수동 저장 섹션 */}
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-2 text-base font-semibold text-zinc-700 dark:text-zinc-300">
                                <Save className="h-4 w-4 text-purple-500" />
                                수동 저장
                            </h4>
                            {manualSnapshots.length > 0 && (
                                <button
                                    onClick={() =>
                                        void handleDeleteAll("Bookmark")
                                    }
                                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                >
                                    모두 삭제
                                </button>
                            )}
                        </div>
                        {manualSnapshots.length === 0 ? (
                            <p className="py-1 text-sm text-zinc-400 dark:text-zinc-500">
                                수동 저장 없음
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {manualSnapshots.map(renderSnapshotCard)}
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
                    label={getBadgeText(previewSnapshot.label)}
                    savedAt={previewSnapshot.savedAt}
                />
            )}
        </>,
        document.body
    );
}
