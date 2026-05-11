import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { getHTMLFromFragment, mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

const cellAttributes = {
    tailwindColor: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-tw-color") || null,
        renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.tailwindColor) return {};
            return { "data-tw-color": attributes.tailwindColor };
        },
    },
    textAlign: {
        default: null,
        parseHTML: (element: HTMLElement) =>
            element.getAttribute("data-text-align") || null,
        renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.textAlign) return {};
            return { "data-text-align": attributes.textAlign };
        },
    },
};

const KTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            ...cellAttributes,
        };
    },
});

const KTableHeader = TableHeader.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            ...cellAttributes,
        };
    },
});

const KTableRow = TableRow.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            height: {
                default: null,
                parseHTML: (element: HTMLElement) =>
                    element.getAttribute("data-row-height") ||
                    element.style.height ||
                    null,
                renderHTML: (attributes: Record<string, unknown>) => {
                    if (!attributes.height) return {};
                    const height = String(attributes.height);
                    return {
                        "data-row-height": height,
                        style: `height: ${height}`,
                    };
                },
            },
        };
    },
});

function formatTableBlock(html: string): string {
    return html
        .trim()
        .replace(/^(<table\b[^>]*>)([\s\S]*)(<\/table>)$/i, "$1\n$2\n$3");
}

const ROW_RESIZE_HANDLE_SIZE = 6;
const MIN_ROW_HEIGHT = 28;

function findCellElement(
    target: EventTarget | null
): HTMLTableCellElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest("td, th");
}

function isNearRowBottom(
    event: MouseEvent,
    cell: HTMLTableCellElement
): boolean {
    const row = cell.parentElement;
    if (!(row instanceof HTMLTableRowElement)) return false;

    const rowRect = row.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const nearColumnEdge =
        cellRect.right - event.clientX <= ROW_RESIZE_HANDLE_SIZE;
    if (nearColumnEdge) return false;

    return (
        rowRect.bottom - event.clientY >= -ROW_RESIZE_HANDLE_SIZE &&
        rowRect.bottom - event.clientY <= ROW_RESIZE_HANDLE_SIZE
    );
}

function getRowPosition(
    view: EditorView,
    cell: HTMLTableCellElement
): number | null {
    const cellPosition = view.posAtDOM(cell, 0);
    const $position = view.state.doc.resolve(cellPosition);

    for (let depth = $position.depth; depth > 0; depth -= 1) {
        if ($position.node(depth).type.name === "tableRow") {
            return $position.before(depth);
        }
    }

    return null;
}

function setRowHeight(view: EditorView, rowPosition: number, height: number) {
    const row = view.state.doc.nodeAt(rowPosition);
    if (!row || row.type.name !== "tableRow") return;

    const tr = view.state.tr.setNodeMarkup(rowPosition, undefined, {
        ...row.attrs,
        height: `${Math.round(height)}px`,
    });
    view.dispatch(tr);
}

function createRowResizePlugin() {
    let cleanup: (() => void) | null = null;

    return new Plugin({
        key: new PluginKey("ktableRowResize"),
        view: () => ({
            destroy() {
                cleanup?.();
                cleanup = null;
            },
        }),
        props: {
            handleDOMEvents: {
                mousedown(view, event) {
                    const mouseEvent = event as MouseEvent;
                    const cell = findCellElement(mouseEvent.target);
                    if (!cell || !isNearRowBottom(mouseEvent, cell)) {
                        return false;
                    }

                    const row = cell.parentElement;
                    if (!(row instanceof HTMLTableRowElement)) return false;

                    const rowPosition = getRowPosition(view, cell);
                    if (rowPosition === null) return false;

                    cleanup?.();

                    const startY = mouseEvent.clientY;
                    const startHeight = Math.max(
                        row.getBoundingClientRect().height,
                        MIN_ROW_HEIGHT
                    );

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const nextHeight = Math.max(
                            MIN_ROW_HEIGHT,
                            startHeight + moveEvent.clientY - startY
                        );
                        setRowHeight(view, rowPosition, nextHeight);
                    };

                    const handleMouseUp = () => {
                        cleanup?.();
                        cleanup = null;
                    };

                    cleanup = () => {
                        document.removeEventListener(
                            "mousemove",
                            handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                        view.dom.classList.remove("row-resize-cursor");
                    };

                    view.dom.classList.add("row-resize-cursor");
                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                    mouseEvent.preventDefault();
                    return true;
                },
            },
        },
    });
}

export const KTableExtension = Table.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: "100%",
                parseHTML: (element: HTMLElement) =>
                    element.getAttribute("data-table-width") ||
                    element.getAttribute("width") ||
                    "100%",
                renderHTML: (attributes: Record<string, unknown>) => ({
                    "data-table-width": attributes.width || "100%",
                }),
            },
            bordered: {
                default: true,
                parseHTML: (element: HTMLElement) =>
                    element.getAttribute("data-table-bordered") !== "false",
                renderHTML: (attributes: Record<string, unknown>) => ({
                    "data-table-bordered":
                        attributes.bordered === false ? "false" : "true",
                }),
            },
        };
    },

    renderHTML({ HTMLAttributes }) {
        const bordered = HTMLAttributes["data-table-bordered"] !== "false";
        return [
            "table",
            mergeAttributes(HTMLAttributes, {
                "data-ktable": "true",
                class: bordered ? "ktable" : "ktable ktable-borderless",
            }),
            0,
        ];
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    this: {
                        editor: {
                            schema: unknown;
                            storage: {
                                markdown?: { options?: { html?: boolean } };
                            };
                        };
                    },
                    state: {
                        write: (value: string) => void;
                        closeBlock: (node: unknown) => void;
                    },
                    node: { type: { schema: unknown }; isBlock: boolean }
                ) {
                    if (!this.editor.storage.markdown?.options?.html) {
                        state.write("[table]");
                        state.closeBlock(node);
                        return;
                    }

                    const html = getHTMLFromFragment(
                        Fragment.from(node as never),
                        this.editor.schema as never
                    );
                    state.write(formatTableBlock(html));
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },

    addExtensions() {
        return [KTableRow, KTableHeader, KTableCell];
    },

    addProseMirrorPlugins() {
        return [...(this.parent?.() ?? []), createRowResizePlugin()];
    },
});
