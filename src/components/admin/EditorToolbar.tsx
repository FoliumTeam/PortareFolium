"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Editor } from "@tiptap/react";
import katex from "katex";
import { Maximize2, Minimize2 } from "lucide-react";
import { KTableControls } from "@/components/admin/table/KTableControls";

// --- Tiptap UI Primitives ---
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";

// --- Tiptap UI Components ---
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface EditorToolbarProps {
    editor: Editor | null;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onImageUpload?: () => void;
    sourceMode?: boolean;
    onSourceToggle?: () => void;
}

function ToolbarTooltip({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent sideOffset={6}>{label}</TooltipContent>
        </Tooltip>
    );
}

// YouTube directive 삽입 서브 컴포넌트
function YoutubeInput({ editor }: { editor: Editor }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleInsert = () => {
        if (!url.trim()) return;
        // URL에서 video ID 추출
        let id = url.trim();
        try {
            const parsed = new URL(id);
            id =
                parsed.searchParams.get("v") ||
                parsed.pathname.split("/").pop() ||
                id;
        } catch {
            // ID 직접 입력으로 간주
        }
        // YoutubeEmbed 노드 삽입 (에디터에서 iframe 프리뷰, 저장 시 directive로 serialize)
        editor
            .chain()
            .focus()
            .insertContent({ type: "youtubeEmbed", attrs: { videoId: id } })
            .run();
        setUrl("");
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <ToolbarTooltip label="YouTube 삽입">
                <button
                    className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="YouTube 삽입"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="#FF0000"
                    >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                </button>
            </ToolbarTooltip>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                        placeholder="YouTube URL 또는 ID"
                        className="w-52 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        autoFocus
                    />
                    <button
                        onClick={handleInsert}
                        className="rounded bg-zinc-800 px-2 py-1 text-sm whitespace-nowrap text-white transition-opacity hover:opacity-80 dark:bg-zinc-200 dark:text-zinc-900"
                    >
                        삽입
                    </button>
                </div>
            )}
        </div>
    );
}

// LaTeX 수식 삽입 서브 컴포넌트
function LatexInput({ editor }: { editor: Editor }) {
    const [open, setOpen] = useState(false);
    const [src, setSrc] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleInsert = () => {
        if (!src.trim()) return;
        editor
            .chain()
            .focus()
            .insertContent({ type: "latexEmbed", attrs: { src: src.trim() } })
            .run();
        setSrc("");
        setOpen(false);
    };

    // KaTeX 프리뷰 HTML
    let previewHtml = "";
    if (src.trim()) {
        try {
            previewHtml = katex.renderToString(src.trim(), {
                throwOnError: false,
                displayMode: true,
            });
        } catch {
            previewHtml = "";
        }
    }

    return (
        <div ref={ref} className="relative">
            <ToolbarTooltip label="수식 삽입">
                <button
                    className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="수식 삽입"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <text
                            x="12"
                            y="18"
                            fontSize="18"
                            fontWeight="normal"
                            fill="currentColor"
                            textAnchor="middle"
                            fontFamily="serif"
                        >
                            ∑
                        </text>
                    </svg>
                </button>
            </ToolbarTooltip>
            {open && (
                <div className="absolute top-full right-0 z-50 mt-1 w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    <textarea
                        value={src}
                        onChange={(e) => setSrc(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                                handleInsert();
                        }}
                        placeholder={"\\alpha + \\beta = \\gamma"}
                        rows={3}
                        className="w-full resize-none rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        autoFocus
                    />
                    {previewHtml && (
                        <div
                            className="mt-2 overflow-x-auto rounded border border-zinc-100 bg-zinc-50 p-2 text-center dark:border-zinc-700 dark:bg-zinc-900"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    )}
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                            Ctrl+Enter 삽입 · \alpha → α
                        </span>
                        <button
                            onClick={handleInsert}
                            className="rounded bg-zinc-800 px-2 py-1 text-sm whitespace-nowrap text-white transition-opacity hover:opacity-80 dark:bg-zinc-200 dark:text-zinc-900"
                        >
                            삽입
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// 색상 프리셋 — base name만 사용 (shade는 렌더링 시 고정: header 300/700, body 100/800)
// 미지정 시 테마 상대 기본색 적용. picker 미리보기 hex는 *-300 기준.
// Accordion 삽입 버튼
function AccordionInsert({ editor }: { editor: Editor }) {
    const handleInsert = () => {
        editor
            .chain()
            .focus()
            .insertContent({
                type: "accordion",
                attrs: { title: "아코디언 제목" },
                content: [
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "아코디언 내용" }],
                    },
                ],
            })
            .run();
    };

    return (
        <ToolbarTooltip label="아코디언 삽입">
            <button
                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleInsert}
                aria-label="아코디언 삽입"
            >
                <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="3" y="4" width="18" height="4" rx="1" />
                    <rect x="3" y="10" width="18" height="4" rx="1" />
                    <rect x="3" y="16" width="18" height="4" rx="1" />
                    <path d="M19 12l-2-2m2 2l-2 2" />
                </svg>
            </button>
        </ToolbarTooltip>
    );
}

export default function EditorToolbar({
    editor,
    isFullscreen,
    onToggleFullscreen,
    onImageUpload,
    sourceMode,
    onSourceToggle,
}: EditorToolbarProps) {
    // editor가 없으면 렌더 생략
    if (!editor) return null;

    const toolbarClass = isFullscreen
        ? "backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-zinc-200/50 dark:border-zinc-700/50"
        : undefined;

    return (
        <TooltipProvider delayDuration={120}>
            <Toolbar variant="fixed" className={toolbarClass}>
                {/* 1. History */}
                <ToolbarGroup>
                    <UndoRedoButton editor={editor} action="undo" />
                    <UndoRedoButton editor={editor} action="redo" />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 2. Headings & Lists & Blocks */}
                <ToolbarGroup>
                    <HeadingDropdownMenu
                        editor={editor}
                        levels={[1, 2, 3, 4, 5, 6]}
                    />
                    <ListDropdownMenu
                        editor={editor}
                        types={["bulletList", "orderedList", "taskList"]}
                    />
                    <BlockquoteButton editor={editor} />
                    <CodeBlockButton editor={editor} />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 3. Inline marks */}
                <ToolbarGroup>
                    <MarkButton editor={editor} type="bold" />
                    <MarkButton editor={editor} type="italic" />
                    <MarkButton editor={editor} type="strike" />
                    <MarkButton editor={editor} type="code" />
                    <MarkButton editor={editor} type="underline" />
                    <ColorHighlightPopover editor={editor} />
                    <LinkPopover editor={editor} />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 4. Superscript / Subscript */}
                <ToolbarGroup>
                    <MarkButton editor={editor} type="superscript" />
                    <MarkButton editor={editor} type="subscript" />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 5. Text align */}
                <ToolbarGroup>
                    <TextAlignButton editor={editor} align="left" />
                    <TextAlignButton editor={editor} align="center" />
                    <TextAlignButton editor={editor} align="right" />
                    <TextAlignButton editor={editor} align="justify" />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 6. Tables */}
                <ToolbarGroup>
                    <KTableControls editor={editor} />
                </ToolbarGroup>

                <ToolbarSeparator />

                {/* 7. Media */}
                <ToolbarGroup>
                    <YoutubeInput editor={editor} />
                    <LatexInput editor={editor} />
                    <AccordionInsert editor={editor} />
                </ToolbarGroup>

                <Spacer />

                {/* 8. Image + Source + Fullscreen */}
                <ToolbarGroup>
                    {onImageUpload && (
                        <ToolbarTooltip label="이미지 삽입">
                            <button
                                onClick={onImageUpload}
                                disabled={sourceMode}
                                aria-label="이미지 삽입"
                                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect
                                        width="18"
                                        height="18"
                                        x="3"
                                        y="3"
                                        rx="2"
                                        ry="2"
                                    />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </button>
                        </ToolbarTooltip>
                    )}
                    {onSourceToggle && (
                        <ToolbarTooltip
                            label={sourceMode ? "미리보기 편집" : "소스 편집"}
                        >
                            <button
                                onClick={onSourceToggle}
                                aria-label={
                                    sourceMode ? "미리보기 편집" : "소스 편집"
                                }
                                className={`rounded p-1.5 text-sm transition-colors ${
                                    sourceMode
                                        ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                }`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="16 18 22 12 16 6" />
                                    <polyline points="8 6 2 12 8 18" />
                                </svg>
                            </button>
                        </ToolbarTooltip>
                    )}
                    <ToolbarTooltip
                        label={isFullscreen ? "전체화면 종료" : "전체화면"}
                    >
                        <button
                            onClick={onToggleFullscreen}
                            aria-label={
                                isFullscreen ? "전체화면 종료" : "전체화면"
                            }
                            className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                            {isFullscreen ? (
                                <Minimize2 size={16} />
                            ) : (
                                <Maximize2 size={16} />
                            )}
                        </button>
                    </ToolbarTooltip>
                </ToolbarGroup>
            </Toolbar>
        </TooltipProvider>
    );
}
