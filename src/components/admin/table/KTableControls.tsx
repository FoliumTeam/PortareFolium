"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

const CELL_COLORS = [
    { name: "", label: "색상 지우기", hex: "transparent" },
    { name: "slate-200", label: "회색", hex: "#e2e8f0" },
    { name: "red-200", label: "빨강", hex: "#fecaca" },
    { name: "orange-200", label: "주황", hex: "#fed7aa" },
    { name: "yellow-200", label: "노랑", hex: "#fef08a" },
    { name: "green-200", label: "초록", hex: "#bbf7d0" },
    { name: "blue-200", label: "파랑", hex: "#bfdbfe" },
    { name: "purple-200", label: "보라", hex: "#e9d5ff" },
    { name: "pink-200", label: "분홍", hex: "#fbcfe8" },
];

function useOutsideClick<T extends HTMLElement>(
    open: boolean,
    onClose: () => void
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose, open]);

    return ref;
}

function ToolbarButton({
    onClick,
    title,
    children,
    disabled,
}: {
    onClick: () => void;
    title: string;
    children: ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            title={title}
            disabled={disabled}
            className="rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
        >
            {children}
        </button>
    );
}

function PopoverShell({
    title,
    button,
    children,
    align = "left",
}: {
    title: string;
    button: ReactNode;
    children: ReactNode;
    align?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpen((value) => !value)}
                title={title}
                className="rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
            >
                {button}
            </button>
            {open && (
                <div
                    className={`absolute top-full z-[100] mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-800 ${
                        align === "right" ? "right-0" : "left-0"
                    }`}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

function run(
    editor: Editor,
    command: (chain: ChainedCommands) => ChainedCommands
) {
    command(editor.chain().focus()).run();
}

function isSelectionInTable(editor: Editor): boolean {
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth -= 1) {
        const nodeName = $from.node(depth).type.name;
        if (
            nodeName === "table" ||
            nodeName === "tableRow" ||
            nodeName === "tableCell" ||
            nodeName === "tableHeader"
        ) {
            return true;
        }
    }

    return false;
}

function useSelectionInTable(editor: Editor): boolean {
    const [inTable, setInTable] = useState(() => isSelectionInTable(editor));

    useEffect(() => {
        const update = () => setInTable(isSelectionInTable(editor));

        update();
        editor.on("transaction", update);
        editor.on("selectionUpdate", update);
        editor.on("focus", update);
        editor.on("blur", update);

        return () => {
            editor.off("transaction", update);
            editor.off("selectionUpdate", update);
            editor.off("focus", update);
            editor.off("blur", update);
        };
    }, [editor]);

    return inTable;
}

function KTableInsertPopover({ editor }: { editor: Editor }) {
    const presets = [
        { label: "2×2 머리글", rows: 2, cols: 2, withHeaderRow: true },
        { label: "3×3 머리글", rows: 3, cols: 3, withHeaderRow: true },
        { label: "4×4 머리글", rows: 4, cols: 4, withHeaderRow: true },
        { label: "3×3 일반", rows: 3, cols: 3, withHeaderRow: false },
    ];

    return (
        <PopoverShell title="표 삽입: 행과 열 preset 선택" button="표 삽입">
            <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    표 크기 선택
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                                run(editor, (chain) =>
                                    chain.insertTable({
                                        rows: preset.rows,
                                        cols: preset.cols,
                                        withHeaderRow: preset.withHeaderRow,
                                    })
                                )
                            }
                            className="rounded border border-zinc-200 px-2 py-1 text-left whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:hover:border-indigo-400"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>
        </PopoverShell>
    );
}

function KTablePropertiesPopover({ editor }: { editor: Editor }) {
    return (
        <PopoverShell
            title="표 설정: 테두리와 머리글 전환"
            button="표 설정"
            align="right"
        >
            <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    표 전체 설정
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                            run(editor, (chain) =>
                                chain.updateAttributes("table", {
                                    bordered: true,
                                })
                            )
                        }
                        className="rounded border border-zinc-200 px-2 py-1 whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
                    >
                        테두리 표시
                    </button>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                            run(editor, (chain) =>
                                chain.updateAttributes("table", {
                                    bordered: false,
                                })
                            )
                        }
                        className="rounded border border-zinc-200 px-2 py-1 whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
                    >
                        테두리 숨김
                    </button>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                            run(editor, (chain) => chain.toggleHeaderRow())
                        }
                        className="rounded border border-zinc-200 px-2 py-1 whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
                    >
                        첫 행 머리글
                    </button>
                    <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                            run(editor, (chain) => chain.toggleHeaderColumn())
                        }
                        className="rounded border border-zinc-200 px-2 py-1 whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
                    >
                        첫 열 머리글
                    </button>
                </div>
            </div>
        </PopoverShell>
    );
}

function KTableCellPropertiesPopover({ editor }: { editor: Editor }) {
    return (
        <PopoverShell title="셀 설정: 배경색과 정렬 변경" button="셀 설정">
            <div className="space-y-3">
                <div>
                    <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        셀 배경색
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {CELL_COLORS.map((color) => (
                            <button
                                key={color.label}
                                type="button"
                                title={`셀 배경색: ${color.label}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    run(editor, (chain) =>
                                        chain.setCellAttribute(
                                            "tailwindColor",
                                            color.name || null
                                        )
                                    );
                                }}
                                className="h-6 w-6 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-600"
                                style={{ backgroundColor: color.hex }}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        셀 텍스트 정렬
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                        {[
                            ["left", "왼쪽"],
                            ["center", "가운데"],
                            ["right", "오른쪽"],
                            ["justify", "양쪽"],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                title={`셀 텍스트 ${label} 정렬`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                    run(editor, (chain) =>
                                        chain.setCellAttribute(
                                            "textAlign",
                                            value
                                        )
                                    )
                                }
                                className="rounded border border-zinc-200 px-2 py-1 text-xs whitespace-nowrap hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </PopoverShell>
    );
}

export function KTableControls({ editor }: { editor: Editor }) {
    const inTable = useSelectionInTable(editor);

    return (
        <>
            <KTableInsertPopover editor={editor} />
            {inTable && (
                <>
                    <KTablePropertiesPopover editor={editor} />
                    <KTableCellPropertiesPopover editor={editor} />
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addRowAfter())
                        }
                        title="현재 행 아래에 새 행 추가"
                    >
                        아래 행
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addRowBefore())
                        }
                        title="현재 행 위에 새 행 추가"
                    >
                        위 행
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.deleteRow())
                        }
                        title="현재 행 삭제"
                    >
                        행 삭제
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addColumnAfter())
                        }
                        title="현재 열 오른쪽에 새 열 추가"
                    >
                        오른쪽 열
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addColumnBefore())
                        }
                        title="현재 열 왼쪽에 새 열 추가"
                    >
                        왼쪽 열
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.deleteColumn())
                        }
                        title="현재 열 삭제"
                    >
                        열 삭제
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.mergeCells())
                        }
                        title="선택한 셀 병합"
                    >
                        셀 병합
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.splitCell())
                        }
                        title="병합된 셀 분할"
                    >
                        셀 분할
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.deleteTable())
                        }
                        title="표 전체 삭제"
                    >
                        표 삭제
                    </ToolbarButton>
                </>
            )}
        </>
    );
}
