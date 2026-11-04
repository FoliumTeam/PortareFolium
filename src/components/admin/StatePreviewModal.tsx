"use client";
import { useUILocale } from "@/components/LocaleProvider";
import { LocalizedText, LocalizedElement } from "@/components/LocalizedText";

// Snapshot 미리보기 모달 (markdown source / frontend render 전환)
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Image from "@tiptap/extension-image";

interface StatePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    label: string;
    savedAt: string;
}

type PreviewMode = "source" | "render";

export default function StatePreviewModal({
    isOpen,
    onClose,
    content,
    label,
    savedAt,
}: StatePreviewModalProps) {
    const { locale } = useUILocale();
    const [mode, setMode] = useState<PreviewMode>("render");

    // read-only Tiptap editor for frontend render
    const editor = useEditor({
        immediatelyRender: false,
        editable: false,
        extensions: [
            StarterKit,
            Markdown.configure({ html: true, tightLists: true }),
            Image.configure({ inline: true }),
        ],
        content,
    });

    // content 변경 시 editor 업데이트
    useEffect(() => {
        if (editor && content) {
            editor.commands.setContent(content);
        }
    }, [editor, content]);

    // Escape 키로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // badge 텍스트 변환
    const badgeText = useMemo(() => {
        if (label === "Initial") return "초기 (Initial)";
        if (label === "Auto-save") return "자동 (Auto)";
        return "수동 (Manual)";
    }, [label]);

    if (!isOpen || typeof window === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="tablet:mx-4 tablet:max-w-3xl mx-2 flex max-h-[80vh] w-full flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {<LocalizedText text={badgeText} />}
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {new Date(savedAt).toLocaleString(locale)}
                        </span>
                    </div>
                    <LocalizedElement
                        as="button"
                        translatedProps={["aria-label"]}
                        onClick={onClose}
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label="Close preview"
                    >
                        ✕
                    </LocalizedElement>
                </div>

                {/* 모드 전환 탭 */}
                <div className="flex gap-2 border-b border-zinc-200 px-6 py-2 dark:border-zinc-700">
                    <button
                        type="button"
                        onClick={() => setMode("render")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                            mode === "render"
                                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                    >
                        <LocalizedText text={"렌더링 (Render)"} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("source")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                            mode === "source"
                                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                    >
                        <LocalizedText text={"소스 (Source)"} />
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {mode === "source" ? (
                        <pre className="rounded-lg bg-zinc-50 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {content}
                        </pre>
                    ) : (
                        <div className="prose prose-base dark:prose-invert max-w-none">
                            {editor && <EditorContent editor={editor} />}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
