"use client";

import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import katex from "katex";
import { Maximize2, Minimize2 } from "lucide-react";

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
                                    editor
                                        .chain()
                                        .focus()
                                        .setCellAttribute(
                                            "tailwindColor",
                                            c.name
                                        )
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
            <button
                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                onClick={() => setOpen((v) => !v)}
                title="LaTeX 수식 삽입"
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
const COLOR_PRESETS = [
    { name: "slate", label: "Slate", hex: "#cbd5e1" },
    { name: "red", label: "Red", hex: "#fca5a5" },
    { name: "orange", label: "Orange", hex: "#fdba74" },
    { name: "yellow", label: "Yellow", hex: "#fde047" },
    { name: "green", label: "Green", hex: "#86efac" },
    { name: "blue", label: "Blue", hex: "#93c5fd" },
    { name: "purple", label: "Purple", hex: "#d8b4fe" },
    { name: "pink", label: "Pink", hex: "#f9a8d4" },
];

// 컬럼 헤더 색상 picker (미니)
function MiniColorPicker({
    value,
    onChange,
}: {
    value: string | null;
    onChange: (color: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const activeColor = COLOR_PRESETS.find((c) => c.name === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-4 w-4 rounded border border-zinc-300 dark:border-zinc-600"
                style={{
                    backgroundColor: activeColor?.hex,
                    background: activeColor
                        ? undefined
                        : "linear-gradient(135deg, #e2e8f0 50%, #475569 50%)",
                }}
                title="헤더 색상"
            />
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 rounded border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex gap-1">
                        {/* 기본 (테마 자동) */}
                        <button
                            type="button"
                            className="h-4 w-4 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-600"
                            style={{
                                background:
                                    "linear-gradient(135deg, #e2e8f0 50%, #475569 50%)",
                            }}
                            title="기본 (테마 자동)"
                            onClick={() => {
                                onChange(null);
                                setOpen(false);
                            }}
                        />
                        {COLOR_PRESETS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                title={c.label}
                                className="h-4 w-4 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-600"
                                style={{ backgroundColor: c.hex }}
                                onClick={() => {
                                    onChange(c.name);
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

// ColoredTable directive 삽입 서브 컴포넌트
interface ColDef {
    name: string;
    color: string | null;
}

function ColoredTableInsert({ editor }: { editor: Editor }) {
    const [open, setOpen] = useState(false);
    const [columns, setColumns] = useState<ColDef[]>([
        { name: "", color: null },
        { name: "", color: null },
    ]);
    const [rows, setRows] = useState<string[][]>([["", ""]]);
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

    // 컬럼 추가
    const addColumn = () => {
        setColumns((prev) => [...prev, { name: "", color: null }]);
        setRows((prev) => prev.map((row) => [...row, ""]));
    };

    // 컬럼 삭제
    const removeColumn = (idx: number) => {
        if (columns.length <= 1) return;
        setColumns((prev) => prev.filter((_, i) => i !== idx));
        setRows((prev) => prev.map((row) => row.filter((_, i) => i !== idx)));
    };

    // 컬럼명 변경
    const updateColumnName = (idx: number, name: string) => {
        setColumns((prev) =>
            prev.map((col, i) => (i === idx ? { ...col, name } : col))
        );
    };

    // 컬럼 색상 변경
    const updateColumnColor = (idx: number, color: string | null) => {
        setColumns((prev) =>
            prev.map((col, i) => (i === idx ? { ...col, color } : col))
        );
    };

    // 행 추가
    const addRow = () => {
        setRows((prev) => [...prev, columns.map(() => "")]);
    };

    // 행 삭제
    const removeRow = (idx: number) => {
        if (rows.length <= 1) return;
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    // 셀 값 변경
    const updateCell = (rowIdx: number, colIdx: number, value: string) => {
        setRows((prev) =>
            prev.map((row, ri) =>
                ri === rowIdx
                    ? row.map((cell, ci) => (ci === colIdx ? value : cell))
                    : row
            )
        );
    };

    // 삽입
    const handleInsert = () => {
        const colNames = columns.map(
            (c) => c.name || `Col ${columns.indexOf(c) + 1}`
        );
        const headColors = columns.map((c) => c.color ?? "");
        // ColoredTableNode 삽입 (에디터에서 테이블 프리뷰, 저장 시 directive로 serialize)
        editor
            .chain()
            .focus()
            .insertContent({
                type: "coloredTableEmbed",
                attrs: {
                    columns: JSON.stringify(colNames),
                    rows: JSON.stringify(rows),
                    columnHeadColors: JSON.stringify(headColors),
                },
            })
            .run();
        // 초기화
        setColumns([
            { name: "", color: null },
            { name: "", color: null },
        ]);
        setRows([["", ""]]);
        setOpen(false);
    };

    const inputCls =
        "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

    return (
        <div ref={ref} className="relative">
            <button
                className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                onClick={() => setOpen((v) => !v)}
                title="ColoredTable 삽입 (저장 후 렌더링)"
            >
                <svg
                    viewBox="0 0 18 18"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <rect x="1" y="1" width="16" height="16" rx="1" />
                    <line x1="1" y1="6.5" x2="17" y2="6.5" />
                    <line x1="7" y1="1" x2="7" y2="17" />
                    <line x1="13" y1="1" x2="13" y2="17" />
                    <rect
                        x="1.5"
                        y="1.5"
                        width="5"
                        height="4.5"
                        fill="#fef08a"
                        stroke="none"
                    />
                    <rect
                        x="7.5"
                        y="1.5"
                        width="5"
                        height="4.5"
                        fill="#bfdbfe"
                        stroke="none"
                    />
                </svg>
            </button>
            {open && (
                <div className="tablet:w-[480px] absolute top-full right-0 z-50 mt-1 flex max-h-[60vh] w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                    {/* 컬럼 헤더 영역 */}
                    <div className="flex items-end gap-1">
                        {columns.map((col, ci) => (
                            <div
                                key={ci}
                                className="flex min-w-0 flex-1 flex-col gap-1"
                            >
                                <div className="flex items-center gap-1">
                                    <MiniColorPicker
                                        value={col.color}
                                        onChange={(c) =>
                                            updateColumnColor(ci, c)
                                        }
                                    />
                                    {columns.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeColumn(ci)}
                                            className="text-xs text-zinc-400 hover:text-red-500"
                                            title="컬럼 삭제"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={col.name}
                                    onChange={(e) =>
                                        updateColumnName(ci, e.target.value)
                                    }
                                    placeholder={`Col ${ci + 1}`}
                                    className={`${inputCls} font-semibold`}
                                    style={{
                                        backgroundColor: COLOR_PRESETS.find(
                                            (p) => p.name === col.color
                                        )?.hex,
                                    }}
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addColumn}
                            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-600"
                            title="컬럼 추가"
                        >
                            +
                        </button>
                    </div>

                    {/* 구분선 */}
                    <hr className="border-zinc-200 dark:border-zinc-700" />

                    {/* 행 데이터 */}
                    <div className="flex flex-col gap-1.5">
                        {rows.map((row, ri) => (
                            <div key={ri} className="flex items-center gap-1">
                                {row.map((cell, ci) => (
                                    <input
                                        key={ci}
                                        type="text"
                                        value={cell}
                                        onChange={(e) =>
                                            updateCell(ri, ci, e.target.value)
                                        }
                                        placeholder="—"
                                        className={`min-w-0 flex-1 ${inputCls}`}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => removeRow(ri)}
                                    disabled={rows.length <= 1}
                                    className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:invisible"
                                    title="행 삭제"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 행 추가 */}
                    <button
                        type="button"
                        onClick={addRow}
                        className="w-full rounded border border-dashed border-zinc-300 py-1 text-sm text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-600"
                    >
                        + 행 추가
                    </button>

                    {/* 하단 액션 */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            저장 후 렌더링
                        </p>
                        <button
                            onClick={handleInsert}
                            className="rounded bg-zinc-800 px-4 py-1.5 text-sm whitespace-nowrap text-white transition-opacity hover:opacity-80 dark:bg-zinc-200 dark:text-zinc-900"
                        >
                            삽입
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Accordion 삽입 버튼
function AccordionInsert({ editor }: { editor: Editor }) {
    const handleInsert = () => {
        editor
            .chain()
            .focus()
            .insertContent({
                type: "accordion",
                attrs: { title: "Accordion title" },
                content: [
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "Accordion content" }],
                    },
                ],
            })
            .run();
    };

    return (
        <button
            className="rounded p-1.5 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsert}
            title="Accordion 삽입"
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
                            onClick={() => cmd(editor).mergeOrSplit().run()}
                            title="셀 병합/분할"
                        >
                            ⊡
                        </Btn>
                        <Btn
                            onClick={() => cmd(editor).toggleHeaderRow().run()}
                            title="헤더 행 토글"
                        >
                            H
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
                <ColoredTableInsert editor={editor} />
                <LatexInput editor={editor} />
                <AccordionInsert editor={editor} />
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
                    {isFullscreen ? (
                        <Minimize2 size={16} />
                    ) : (
                        <Maximize2 size={16} />
                    )}
                </button>
            </ToolbarGroup>
        </Toolbar>
    );
}
