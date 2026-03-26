"use client";

import { useState, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Image from "@tiptap/extension-image";
import { ColoredTableExtension } from "@/extensions/ColoredTableExtension";
import EditorToolbar from "@/components/admin/EditorToolbar";
import EditorFullscreenModal from "@/components/admin/EditorFullscreenModal";
import TiptapImageUpload from "@/components/admin/TiptapImageUpload";

interface RichMarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    folderPath?: string;
    storageKey?: string;
    onEditorReady?: (editor: Editor) => void;
}

export default function RichMarkdownEditor({
    value,
    onChange,
    placeholder,
    disabled = false,
    folderPath,
    storageKey,
    onEditorReady,
}: RichMarkdownEditorProps) {
    const AUTOSAVE_KEY = `portare_autosave_editor_${storageKey ?? "default"}`;

    // 이미지 업로드 모달 상태
    const [imageUploadOpen, setImageUploadOpen] = useState(false);

    // source 편집 모드
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceText, setSourceText] = useState("");

    // WYSIWYG → Source 전환
    const enterSourceMode = () => {
        if (!editor) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const md = (editor.storage as any).markdown.getMarkdown() as string;
        setSourceText(md);
        setSourceMode(true);
    };

    // Source → WYSIWYG 전환
    const exitSourceMode = () => {
        if (!editor) return;
        editor.commands.setContent(sourceText);
        onChange(sourceText);
        setSourceMode(false);
    };

    // source 모드에서 textarea 변경
    const handleSourceChange = (val: string) => {
        setSourceText(val);
        onChange(val);
    };

    const initialContent = useMemo(() => {
        if (!value) return "";
        if (value.trimStart().startsWith("{")) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: { languageClassPrefix: "language-" },
            }),
            Markdown.configure({ html: true, tightLists: true }),
            Image.configure({ inline: true, allowBase64: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Youtube.configure({ controls: true, nocookie: true }),
            Placeholder.configure({
                placeholder: placeholder ?? "Start writing...",
            }),
            ColoredTableExtension.configure({ resizable: false }),
        ],
        content: initialContent,
        editable: !disabled,
        onUpdate({ editor: e }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const md = (e.storage as any).markdown.getMarkdown() as string;
            onChange(md);
        },
    });

    // editor 준비 콜백
    useEffect(() => {
        if (editor && onEditorReady) onEditorReady(editor);
    }, [editor, onEditorReady]);

    // --- Autosave (localStorage, 5-second interval) ---
    useEffect(() => {
        if (!editor || disabled) return;
        const id = setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const md = (editor.storage as any).markdown.getMarkdown() as string;
            if (md) {
                localStorage.setItem(
                    AUTOSAVE_KEY,
                    JSON.stringify({
                        content: md,
                        savedAt: new Date().toISOString(),
                    })
                );
            }
        }, 5000);
        return () => clearInterval(id);
    }, [editor, disabled, AUTOSAVE_KEY]);

    // --- Fullscreen ---
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

    return (
        <>
            {/* Normal inline mode */}
            <div className={isFullscreen ? "invisible" : ""}>
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <EditorToolbar
                        editor={editor}
                        isFullscreen={false}
                        onToggleFullscreen={toggleFullscreen}
                        onImageUpload={() => setImageUploadOpen(true)}
                        sourceMode={sourceMode}
                        onSourceToggle={
                            sourceMode ? exitSourceMode : enterSourceMode
                        }
                    />
                    {sourceMode ? (
                        <div
                            className="min-h-[300px] w-full bg-zinc-50 p-6 dark:bg-zinc-800"
                            onClick={(e) => {
                                // textarea 외 영역 클릭 시 textarea에 focus
                                const ta = (
                                    e.currentTarget as HTMLElement
                                ).querySelector("textarea");
                                if (ta) ta.focus();
                            }}
                        >
                            <textarea
                                value={sourceText}
                                onChange={(e) => {
                                    handleSourceChange(e.target.value);
                                    // 자동 높이 조절
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                        e.target.scrollHeight + "px";
                                }}
                                ref={(el) => {
                                    // mount 시 높이 자동 조절
                                    if (el) {
                                        el.style.height = "auto";
                                        el.style.height =
                                            el.scrollHeight + "px";
                                    }
                                }}
                                className="w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-zinc-800 outline-none dark:text-zinc-200"
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <div className="prose prose-base min-h-[300px] max-w-none p-6">
                            <EditorContent editor={editor} />
                        </div>
                    )}
                </div>
            </div>

            {/* Fullscreen modal */}
            <EditorFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                editor={editor}
                toolbar={
                    <div className="relative flex items-center">
                        <EditorToolbar
                            editor={editor}
                            isFullscreen={true}
                            onToggleFullscreen={toggleFullscreen}
                            onImageUpload={() => setImageUploadOpen(true)}
                            sourceMode={sourceMode}
                            onSourceToggle={
                                sourceMode ? exitSourceMode : enterSourceMode
                            }
                        />
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            aria-label="Exit fullscreen"
                        >
                            ✕
                        </button>
                    </div>
                }
            >
                {sourceMode ? (
                    <div className="w-full bg-zinc-50 p-6 dark:bg-zinc-800">
                        <textarea
                            value={sourceText}
                            onChange={(e) => {
                                handleSourceChange(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height =
                                    e.target.scrollHeight + "px";
                            }}
                            ref={(el) => {
                                if (el) {
                                    el.style.height = "auto";
                                    el.style.height = el.scrollHeight + "px";
                                }
                            }}
                            className="w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-zinc-800 outline-none dark:text-zinc-200"
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <EditorContent editor={editor} />
                )}
            </EditorFullscreenModal>

            {/* 이미지 업로드 모달 */}
            <TiptapImageUpload
                editor={editor}
                isOpen={imageUploadOpen}
                onClose={() => setImageUploadOpen(false)}
                folderPath={folderPath}
            />
        </>
    );
}
