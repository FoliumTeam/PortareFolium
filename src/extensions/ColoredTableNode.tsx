"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
    ReactNodeViewRenderer,
    NodeViewWrapper,
    type ReactNodeViewProps,
} from "@tiptap/react";
import { tailwindToHex } from "@/lib/tailwind-colors";

// base name("green") 또는 full name("green-400") 모두 허용 — shade 부분은 무시됨
// 라이트: header=300, body=100 / 다크: header=700, body=800
function deriveColorHex(colorName: string, shade: number): string {
    const base = colorName.replace(/-\d+$/, "");
    return tailwindToHex(`${base}-${shade}`);
}

// 에디터 내 ColoredTable 프리뷰 (읽기 전용)
function ColoredTablePreview({ node }: ReactNodeViewProps) {
    const columns: string[] = safeParseJson(node.attrs.columns as string, []);
    const rows: string[][] = safeParseJson(node.attrs.rows as string, []);
    const headColors: string[] = safeParseJson(
        node.attrs.columnHeadColors as string,
        []
    );

    if (columns.length === 0) {
        return (
            <NodeViewWrapper className="my-3">
                <div className="rounded border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800">
                    ColoredTable — 컬럼 없음
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <div className="overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <table
                    style={{ margin: 0 }}
                    className="w-full border-collapse text-sm"
                >
                    <thead>
                        <tr>
                            {columns.map((col, ci) => {
                                const color = headColors[ci] || null;
                                const hex = color
                                    ? deriveColorHex(color, 300)
                                    : "";
                                return (
                                    <th
                                        key={ci}
                                        className="border-b border-zinc-200 px-3 py-2 text-left font-semibold dark:border-zinc-700"
                                        style={
                                            hex
                                                ? {
                                                      backgroundColor: hex,
                                                      color: "oklch(0.1 0 0)",
                                                  }
                                                : {
                                                      backgroundColor:
                                                          "var(--color-surface-subtle)",
                                                  }
                                        }
                                    >
                                        {col}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                {columns.map((_, ci) => {
                                    const color = headColors[ci] || null;
                                    const bodyBg = color
                                        ? deriveColorHex(color, 100)
                                        : "";
                                    return (
                                        <td
                                            key={ci}
                                            className="border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800"
                                            style={
                                                bodyBg
                                                    ? {
                                                          backgroundColor:
                                                              bodyBg,
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {row[ci] || "—"}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </NodeViewWrapper>
    );
}

function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
    if (!val) return fallback;
    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
}

// ColoredTable node extension
export const ColoredTableNode = Node.create({
    name: "coloredTableEmbed",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            columns: {
                default: "[]",
                parseHTML: (el) => el.getAttribute("data-ct-columns") || "[]",
            },
            rows: {
                default: "[]",
                parseHTML: (el) => el.getAttribute("data-ct-rows") || "[]",
            },
            columnHeadColors: {
                default: "[]",
                parseHTML: (el) =>
                    el.getAttribute("data-ct-head-colors") || "[]",
            },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-ct-columns]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes({
                "data-ct-columns": HTMLAttributes.columns,
                "data-ct-rows": HTMLAttributes.rows,
                "data-ct-head-colors": HTMLAttributes.columnHeadColors,
            }),
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ColoredTablePreview);
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    state: {
                        write: (s: string) => void;
                        closeBlock: (n: unknown) => void;
                    },
                    node: {
                        attrs: {
                            columns: string;
                            rows: string;
                            columnHeadColors: string;
                        };
                    }
                ) {
                    const { columns, rows, columnHeadColors } = node.attrs;
                    const hasColors =
                        columnHeadColors && columnHeadColors !== "[]";
                    const colorsPart = hasColors
                        ? ` columnHeadColors='${columnHeadColors}'`
                        : "";
                    state.write(
                        `::colored-table[]{columns='${columns}' rows='${rows}'${colorsPart}}`
                    );
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },
});

// markdown 로드 전 ::colored-table directive → HTML 변환
export function coloredTableDirectiveToHtml(md: string): string {
    return md.replace(
        /::colored-table\[\]\{([^}]+)\}/g,
        (_match, attrsStr: string) => {
            const columns = extractAttr(attrsStr, "columns") || "[]";
            const rows = extractAttr(attrsStr, "rows") || "[]";
            const headColors =
                extractAttr(attrsStr, "columnHeadColors") || "[]";
            return `<div data-ct-columns='${escHtml(columns)}' data-ct-rows='${escHtml(rows)}' data-ct-head-colors='${escHtml(headColors)}'></div>`;
        }
    );
}

// directive attribute 추출 (key='value' 또는 key="value" 형식)
function extractAttr(str: string, key: string): string | null {
    const re = new RegExp(`${key}=(?:'([^']*)'|"((?:[^"\\\\]|\\\\.)*)")`);
    const m = str.match(re);
    if (!m) return null;
    const val = m[1] ?? m[2];
    // escaped double quote 복원
    return val.replace(/\\"/g, '"');
}

// HTML attribute escaping (single quote 내부)
function escHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}
