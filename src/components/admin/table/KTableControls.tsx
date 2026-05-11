"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Columns3,
    Merge,
    PaintBucket,
    PanelLeft,
    PanelTop,
    Settings2,
    Split,
    Table2,
    Trash2,
    Rows3,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

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

const iconButtonClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-700";
const popoverIconButtonClassName =
    "inline-flex h-9 w-9 items-center justify-center rounded border border-zinc-200 text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-indigo-400";

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

function IconTooltip({
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

function ToolbarButton({
    onClick,
    label,
    children,
    disabled,
}: {
    onClick: () => void;
    label: string;
    children: ReactNode;
    disabled?: boolean;
}) {
    return (
        <IconTooltip label={label}>
            <button
                type="button"
                aria-label={label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onClick}
                disabled={disabled}
                className={iconButtonClassName}
            >
                {children}
            </button>
        </IconTooltip>
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
            <IconTooltip label={title}>
                <button
                    type="button"
                    aria-label={title}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setOpen((value) => !value)}
                    className={iconButtonClassName}
                >
                    {button}
                </button>
            </IconTooltip>
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

function PopoverIconButton({
    label,
    onClick,
    children,
    className = "",
    style,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <IconTooltip label={label}>
            <button
                type="button"
                aria-label={label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onClick}
                className={`${popoverIconButtonClassName} ${className}`}
                style={style}
            >
                {children}
            </button>
        </IconTooltip>
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
        <PopoverShell title="표 삽입" button={<Table2 className="h-4 w-4" />}>
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
            title="표 설정"
            button={<Settings2 className="h-4 w-4" />}
            align="right"
        >
            <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    표 전체 설정
                </p>
                <div className="grid grid-cols-4 gap-2">
                    <PopoverIconButton
                        label="테두리 표시"
                        onClick={() =>
                            run(editor, (chain) =>
                                chain.updateAttributes("table", {
                                    bordered: true,
                                })
                            )
                        }
                    >
                        <Table2 className="h-4 w-4" />
                    </PopoverIconButton>
                    <PopoverIconButton
                        label="테두리 숨김"
                        onClick={() =>
                            run(editor, (chain) =>
                                chain.updateAttributes("table", {
                                    bordered: false,
                                })
                            )
                        }
                    >
                        <Table2 className="h-4 w-4 opacity-45" />
                    </PopoverIconButton>
                    <PopoverIconButton
                        label="첫 행을 머리글로 전환"
                        onClick={() =>
                            run(editor, (chain) => chain.toggleHeaderRow())
                        }
                    >
                        <PanelTop className="h-4 w-4" />
                    </PopoverIconButton>
                    <PopoverIconButton
                        label="첫 열을 머리글로 전환"
                        onClick={() =>
                            run(editor, (chain) => chain.toggleHeaderColumn())
                        }
                    >
                        <PanelLeft className="h-4 w-4" />
                    </PopoverIconButton>
                </div>
            </div>
        </PopoverShell>
    );
}

function KTableCellPropertiesPopover({ editor }: { editor: Editor }) {
    return (
        <PopoverShell
            title="셀 설정"
            button={<PaintBucket className="h-4 w-4" />}
        >
            <div className="space-y-3">
                <div>
                    <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        셀 배경색
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {CELL_COLORS.map((color) => (
                            <PopoverIconButton
                                key={color.label}
                                label={`셀 배경색: ${color.label}`}
                                onClick={() => {
                                    run(editor, (chain) =>
                                        chain.setCellAttribute(
                                            "tailwindColor",
                                            color.name || null
                                        )
                                    );
                                }}
                                className="h-6 w-6 transition-transform hover:scale-110"
                                style={{ backgroundColor: color.hex }}
                            >
                                <span className="sr-only">{color.label}</span>
                            </PopoverIconButton>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        셀 텍스트 정렬
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                        {[
                            ["left", "셀 텍스트 왼쪽 정렬", AlignLeft],
                            ["center", "셀 텍스트 가운데 정렬", AlignCenter],
                            ["right", "셀 텍스트 오른쪽 정렬", AlignRight],
                            ["justify", "셀 텍스트 양쪽 정렬", AlignJustify],
                        ].map(([value, label, Icon]) => {
                            const AlignIcon = Icon as typeof AlignLeft;
                            return (
                                <PopoverIconButton
                                    key={value as string}
                                    label={label as string}
                                    onClick={() =>
                                        run(editor, (chain) =>
                                            chain.setCellAttribute(
                                                "textAlign",
                                                value
                                            )
                                        )
                                    }
                                >
                                    <AlignIcon className="h-4 w-4" />
                                </PopoverIconButton>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PopoverShell>
    );
}

export function KTableControls({ editor }: { editor: Editor }) {
    const inTable = useSelectionInTable(editor);
    const { confirm } = useConfirmDialog();

    const handleDeleteTable = async () => {
        const ok = await confirm({
            title: "표 삭제",
            description:
                "표 전체를 삭제할까요? 이 작업은 표 안의 모든 내용도 함께 제거합니다.",
            confirmText: "표 삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        run(editor, (chain) => chain.deleteTable());
    };

    return (
        <TooltipProvider delayDuration={120}>
            <KTableInsertPopover editor={editor} />
            {inTable && (
                <>
                    <KTablePropertiesPopover editor={editor} />
                    <KTableCellPropertiesPopover editor={editor} />
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addRowAfter())
                        }
                        label="현재 행 아래에 새 행 추가"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addRowBefore())
                        }
                        label="현재 행 위에 새 행 추가"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.deleteRow())
                        }
                        label="현재 행 삭제"
                    >
                        <Rows3 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addColumnAfter())
                        }
                        label="현재 열 오른쪽에 새 열 추가"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.addColumnBefore())
                        }
                        label="현재 열 왼쪽에 새 열 추가"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.deleteColumn())
                        }
                        label="현재 열 삭제"
                    >
                        <Columns3 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.mergeCells())
                        }
                        label="선택한 셀 병합"
                    >
                        <Merge className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            run(editor, (chain) => chain.splitCell())
                        }
                        label="병합된 셀 분할"
                    >
                        <Split className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => void handleDeleteTable()}
                        label="표 전체 삭제"
                    >
                        <Trash2 className="h-4 w-4" />
                    </ToolbarButton>
                </>
            )}
        </TooltipProvider>
    );
}
