"use client";

import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";

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

interface EditorToolbarProps {
    editor: Editor | null;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onImageUpload?: () => void;
    sourceMode?: boolean;
    onSourceToggle?: () => void;
}

// 테이블 셀 색상 picker 서브 컴포넌트
function CellColorPicker({ editor }: { editor: Editor }) {
    const [open, setOpen] = useState(false);
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

    const colors = [
        { name: "slate-200", label: "Slate" },
        { name: "red-200", label: "Red" },
        { name: "orange-200", label: "Orange" },
        { name: "yellow-200", label: "Yellow" },
        { name: "green-200", label: "Green" },
        { name: "blue-200", label: "Blue" },
        { name: "purple-200", label: "Purple" },
        { name: "pink-200", label: "Pink" },
    ];

    // Tailwind 색상명 → hex 매핑 (미리보기용)
    const colorHex: Record<string, string> = {
        "slate-200": "#e2e8f0",
        "red-200": "#fecaca",
        "orange-200": "#fed7aa",
        "yellow-200": "#fef08a",
        "green-200": "#bbf7d0",
        "blue-200": "#bfdbfe",
        "purple-200": "#e9d5ff",
        "pink-200": "#fbcfe8",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd = (e: Editor) => e.chain().focus() as any;

    return (
        <div ref={ref} className="relative">
            <button
                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                onClick={() => setOpen((v) => !v)}
                title="셀 배경색"
            >
                🎨
            </button>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex gap-1">
                        {colors.map((c) => (
                            <button
                                key={c.name}
                                title={c.label}
                                className="h-5 w-5 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-600"
                                style={{ backgroundColor: colorHex[c.name] }}
                                onClick={() => {
                                    cmd(editor)
                                        .updateAttributes("tableCell", {
                                            tailwindColor: c.name,
                                        })
                                        .run();
                                    setOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// YouTube URL 입력 서브 컴포넌트
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor.commands as any).setYoutubeVideo({ src: url.trim() });
        setUrl("");
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                onClick={() => setOpen((v) => !v)}
                title="YouTube 삽입"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            </button>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                        placeholder="YouTube URL"
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

// 테이블 삽입/편집 버튼
function Btn({
    onClick,
    title,
    children,
}: {
    onClick: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
        >
            {children}
        </button>
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

    // 테이블 커서 여부
    const inTable = editor.isActive("table");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd = (e: Editor) => e.chain().focus() as any;

    const toolbarClass = isFullscreen
        ? "backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-zinc-200/50 dark:border-zinc-700/50"
        : undefined;

    return (
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
                <Btn
                    onClick={() =>
                        cmd(editor)
                            .insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true,
                            })
                            .run()
                    }
                    title="테이블 삽입"
                >
                    ⊞
                </Btn>
                {inTable && (
                    <>
                        <Btn
                            onClick={() => cmd(editor).addRowAfter().run()}
                            title="아래 행 추가"
                        >
                            ↓+
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).addRowBefore().run()}
                            title="위 행 추가"
                        >
                            ↑+
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).deleteRow().run()}
                            title="행 삭제"
                        >
                            ↕✕
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).addColumnAfter().run()}
                            title="오른쪽 열 추가"
                        >
                            →+
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).addColumnBefore().run()}
                            title="왼쪽 열 추가"
                        >
                            ←+
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).deleteColumn().run()}
                            title="열 삭제"
                        >
                            ↔✕
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).deleteTable().run()}
                            title="테이블 삭제"
                        >
                            ⊟
                        </Btn>
                        <CellColorPicker editor={editor} />
                    </>
                )}
            </ToolbarGroup>

            <ToolbarSeparator />

            {/* 7. Media */}
            <ToolbarGroup>
                <YoutubeInput editor={editor} />
            </ToolbarGroup>

            <Spacer />

            {/* 8. Image + Source + Fullscreen */}
            <ToolbarGroup>
                {onImageUpload && (
                    <button
                        onClick={onImageUpload}
                        disabled={sourceMode}
                        title="이미지 삽입"
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
                )}
                {onSourceToggle && (
                    <button
                        onClick={onSourceToggle}
                        title={sourceMode ? "Markdown 뷰" : "Source 편집"}
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
                )}
                <button
                    onClick={onToggleFullscreen}
                    title="전체화면 토글"
                    className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                    {isFullscreen ? "⤡" : "⤢"}
                </button>
            </ToolbarGroup>
        </Toolbar>
    );
}
