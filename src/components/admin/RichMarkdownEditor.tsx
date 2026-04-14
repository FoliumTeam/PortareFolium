"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { ColoredTableExtension } from "@/extensions/ColoredTableExtension";
import {
    YoutubeEmbed,
    youtubeDirectiveToHtml,
} from "@/extensions/YoutubeEmbed";
import {
    ColoredTableNode,
    coloredTableDirectiveToHtml,
} from "@/extensions/ColoredTableNode";
import { LatexNode, latexDirectiveToHtml } from "@/extensions/LatexNode";
import {
    AccordionNode,
    accordionDirectiveToHtml,
} from "@/extensions/AccordionNode";
import { jsxToDirective, directiveToJsx } from "@/lib/mdx-directive-converter";
import EditorToolbar from "@/components/admin/EditorToolbar";
import TiptapImageUpload from "@/components/admin/TiptapImageUpload";

interface RichMarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    folderPath?: string;
    storageKey?: string;
    onEditorReady?: (editor: Editor) => void;
    transferring?: boolean;
}

export default function RichMarkdownEditor({
    value,
    onChange,
    placeholder,
    disabled = false,
    folderPath,
    storageKey,
    onEditorReady,
    transferring = false,
}: RichMarkdownEditorProps) {
    const AUTOSAVE_KEY = `portare_autosave_editor_${storageKey ?? "default"}`;

    // 이미지 업로드 모달 상태
    const [imageUploadOpen, setImageUploadOpen] = useState(false);

    // source 편집 모드
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceText, setSourceText] = useState("");

    // source → WYSIWYG 전환 시 setContent 예약 (flushSync 충돌 방지)
    const pendingContent = useRef<string | null>(null);

    // 모드 전환 시 스크롤 비율 보존
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const pendingScrollRatio = useRef<number | null>(null);

    const getScrollContainer = (): Element | null =>
        scrollAreaRef.current &&
        scrollAreaRef.current.scrollHeight > scrollAreaRef.current.clientHeight
            ? scrollAreaRef.current
            : document.scrollingElement;

    const saveScrollRatio = () => {
        const el = getScrollContainer();
        if (!el || el.scrollHeight <= el.clientHeight) {
            pendingScrollRatio.current = 0;
            return;
        }
        pendingScrollRatio.current =
            el.scrollTop / (el.scrollHeight - el.clientHeight);
    };

    // source 모드 textarea ref (안정적 ref — 매 렌더마다 재호출 방지)
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaRefCallback = useCallback(
        (el: HTMLTextAreaElement | null) => {
            textareaRef.current = el;
            if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
            }
        },
        []
    );

    // WYSIWYG → Source 전환 (directive → JSX 변환 후 표시)
    const enterSourceMode = () => {
        if (!editor) return;
        saveScrollRatio();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const md = (editor.storage as any).markdown.getMarkdown() as string;
        setSourceText(directiveToJsx(md));
        setSourceMode(true);
    };

    // Source → WYSIWYG 전환 (JSX → directive 변환 후 에디터 로드, DB에는 JSX 저장)
    const exitSourceMode = () => {
        if (!editor) return;
        saveScrollRatio();
        const jsxContent = directiveToJsx(sourceText);
        // directive → HTML 전처리 (YoutubeEmbed, ColoredTableNode parseHTML 호환)
        const directives = jsxToDirective(jsxContent);
        const preprocessed = accordionDirectiveToHtml(
            latexDirectiveToHtml(
                coloredTableDirectiveToHtml(youtubeDirectiveToHtml(directives))
            )
        );
        onChange(jsxContent);
        // setContent를 useEffect로 defer — React 렌더 완료 후 실행 (flushSync 충돌 방지)
        pendingContent.current = preprocessed;
        setSourceMode(false);
    };

    // source 모드에서 textarea 변경 (directive → JSX 변환 후 저장)
    const handleSourceChange = (val: string) => {
        setSourceText(val);
        onChange(directiveToJsx(val));
    };

    const initialContent = useMemo(() => {
        if (!value) return "";
        // Tiptap JSON 형식
        if (value.trimStart().startsWith("{")) {
            try {
                return JSON.parse(value);
            } catch {
                // JSON 파싱 실패 시 마크다운으로 처리
            }
        }
        // JSX → directive 변환 후 Tiptap에 로드 (JSX를 그대로 넘기면 FoliumTable 등이 소실됨)
        // directive → HTML 변환 (YoutubeEmbed, ColoredTableNode parseHTML 호환)
        const directives = jsxToDirective(value);
        return accordionDirectiveToHtml(
            latexDirectiveToHtml(
                coloredTableDirectiveToHtml(youtubeDirectiveToHtml(directives))
            )
        );
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
            YoutubeEmbed,
            ColoredTableNode,
            LatexNode,
            AccordionNode,
            Placeholder.configure({
                placeholder: placeholder ?? "Start writing...",
            }),
            ColoredTableExtension.configure({ resizable: true }),
        ],
        content: initialContent,
        editable: !disabled,
        onUpdate({ editor: e }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const md = (e.storage as any).markdown.getMarkdown() as string;
            // directive → JSX 변환 후 저장 (DB에는 항상 JSX 형식 유지)
            onChange(directiveToJsx(md));
        },
    });

    // editor 준비 콜백
    useEffect(() => {
        if (editor && onEditorReady) onEditorReady(editor);
    }, [editor, onEditorReady]);

    // source → WYSIWYG 전환 후 setContent 실행 (React 렌더 완료 이후 보장)
    useEffect(() => {
        if (!sourceMode && pendingContent.current && editor) {
            editor.commands.setContent(pendingContent.current);
            pendingContent.current = null;
        }
    }, [sourceMode, editor]);

    // 모드 전환 후 스크롤 비율 복원 (content-set useEffect 이후 실행)
    useEffect(() => {
        if (pendingScrollRatio.current === null) return;
        const ratio = pendingScrollRatio.current;
        pendingScrollRatio.current = null;
        // rAF 2회: 첫 번째는 DOM 업데이트 대기, 두 번째는 레이아웃 완료 대기
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const container = getScrollContainer();
                if (
                    container &&
                    container.scrollHeight > container.clientHeight
                ) {
                    container.scrollTop =
                        ratio *
                        (container.scrollHeight - container.clientHeight);
                }
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceMode]);

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

    // Lock body scroll when fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    // Close fullscreen on Escape
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullscreen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    return (
        <>
            {/* Outer wrapper: invisible placeholder preserves layout space when fullscreen */}
            <div className={isFullscreen ? "invisible" : ""}>
                {/* Editor container: CSS fixed overlay when fullscreen, inline card otherwise.
                    visible overrides inherited invisible so the fixed overlay remains visible. */}
                <div
                    className={
                        isFullscreen
                            ? "visible fixed inset-0 z-100 flex flex-col bg-zinc-100 dark:bg-zinc-950"
                            : "relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }
                >
                    {/* 에셋 이전 중 overlay */}
                    {transferring && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
                            <div className="flex items-center gap-3 text-sm font-medium text-(--color-muted)">
                                <svg
                                    className="h-5 w-5 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                에셋 이전 중...
                            </div>
                        </div>
                    )}
                    {/* Toolbar */}
                    <div
                        className={
                            isFullscreen
                                ? "sticky top-0 z-30 flex items-center"
                                : ""
                        }
                    >
                        <EditorToolbar
                            editor={editor}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={toggleFullscreen}
                            onImageUpload={() => setImageUploadOpen(true)}
                            sourceMode={sourceMode}
                            onSourceToggle={
                                sourceMode ? exitSourceMode : enterSourceMode
                            }
                        />
                        {isFullscreen && (
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                aria-label="Exit fullscreen"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Scrollable content area (source + WYSIWYG share same scroll/paper container) */}
                    <div
                        ref={scrollAreaRef}
                        className={isFullscreen ? "flex-1 overflow-y-auto" : ""}
                    >
                        {/* Source mode textarea */}
                        {sourceMode && (
                            <div
                                className={`min-h-[300px] w-full bg-zinc-50 p-6 dark:bg-zinc-800 ${
                                    isFullscreen
                                        ? "tablet:p-8 laptop:p-16 mx-auto my-8 max-w-4xl rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
                                        : ""
                                }`}
                                onClick={(e) => {
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
                                        // 스크롤 위치 보존: height=auto가 textarea를 일시적으로 축소시켜 스크롤 리셋 유발
                                        const scrollParent = (e.target.closest(
                                            ".overflow-y-auto"
                                        ) ??
                                            document.scrollingElement) as HTMLElement | null;
                                        const savedScrollTop =
                                            scrollParent?.scrollTop ?? 0;
                                        e.target.style.height = "auto";
                                        e.target.style.height =
                                            e.target.scrollHeight + "px";
                                        if (scrollParent)
                                            scrollParent.scrollTop =
                                                savedScrollTop;
                                    }}
                                    ref={textareaRefCallback}
                                    className="w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-zinc-800 outline-none dark:text-zinc-200"
                                    spellCheck={false}
                                />
                            </div>
                        )}

                        {/* WYSIWYG editor — single instance, always mounted, never remounted */}
                        <div
                            className={`prose ${
                                isFullscreen
                                    ? "prose-lg tablet:p-8 laptop:p-16 mx-auto my-8 min-h-[1100px] max-w-4xl rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
                                    : "prose-base min-h-[300px] max-w-none p-6"
                            } ${sourceMode ? "hidden" : ""}`}
                        >
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </div>
            </div>

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
