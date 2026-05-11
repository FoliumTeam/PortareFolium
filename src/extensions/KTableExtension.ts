import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
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

const rowResizingPluginKey = new PluginKey<{
    activeHandle: number;
    dragging: { startY: number; startHeight: number } | null;
}>("ktableRowResize");

function updateRowHandle(view: EditorView, value: number) {
    view.dispatch(
        view.state.tr.setMeta(rowResizingPluginKey, { setHandle: value })
    );
}

function handleRowMouseMove(view: EditorView, event: MouseEvent) {
    if (!view.editable) return;

    const pluginState = rowResizingPluginKey.getState(view.state);
    if (!pluginState || pluginState.dragging) return;

    const cell = findCellElement(event.target);
    const rowPosition =
        cell && isNearRowBottom(event, cell)
            ? getRowPosition(view, cell)
            : null;
    const activeHandle = rowPosition ?? -1;

    if (activeHandle !== pluginState.activeHandle) {
        updateRowHandle(view, activeHandle);
    }
}

function handleRowMouseLeave(view: EditorView) {
    if (!view.editable) return;

    const pluginState = rowResizingPluginKey.getState(view.state);
    if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) {
        updateRowHandle(view, -1);
    }
}

function handleRowMouseDown(view: EditorView, event: MouseEvent) {
    if (!view.editable) return false;

    const pluginState = rowResizingPluginKey.getState(view.state);
    if (
        !pluginState ||
        pluginState.activeHandle === -1 ||
        pluginState.dragging
    ) {
        return false;
    }

    const cell = findCellElement(event.target);
    const row = cell?.parentElement;
    if (!(row instanceof HTMLTableRowElement)) return false;

    const rowPosition = pluginState.activeHandle;
    const startHeight = Math.max(
        row.getBoundingClientRect().height,
        MIN_ROW_HEIGHT
    );

    view.dispatch(
        view.state.tr.setMeta(rowResizingPluginKey, {
            setDragging: { startY: event.clientY, startHeight },
        })
    );

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const dragging = rowResizingPluginKey.getState(view.state)?.dragging;
        if (!dragging) return;

        moveEvent.preventDefault();
        const nextHeight = Math.max(
            MIN_ROW_HEIGHT,
            dragging.startHeight + moveEvent.clientY - dragging.startY
        );
        setRowHeight(view, rowPosition, nextHeight);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        handleMouseMove(upEvent);
        view.dispatch(
            view.state.tr.setMeta(rowResizingPluginKey, { setDragging: null })
        );
        updateRowHandle(view, -1);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    event.preventDefault();
    return true;
}

function rowHandleDecorations(state: EditorState, rowPosition: number) {
    const row = state.doc.nodeAt(rowPosition);
    if (!row || row.type.name !== "tableRow") return DecorationSet.empty;

    const decorations: Decoration[] = [];
    const pluginState = rowResizingPluginKey.getState(state);
    let cellPosition = rowPosition + 1;

    if (pluginState?.dragging) {
        decorations.push(
            Decoration.node(rowPosition, rowPosition + row.nodeSize, {
                class: "row-resize-dragging",
            })
        );
    }

    row.forEach((cell) => {
        const dom = document.createElement("div");
        dom.className = "row-resize-handle";
        decorations.push(
            Decoration.widget(cellPosition + cell.nodeSize - 1, dom)
        );
        cellPosition += cell.nodeSize;
    });

    return DecorationSet.create(state.doc, decorations);
}

function createRowResizePlugin() {
    return new Plugin({
        key: rowResizingPluginKey,
        state: {
            init: () => ({ activeHandle: -1, dragging: null }),
            apply(tr, previous) {
                const action = tr.getMeta(rowResizingPluginKey);
                if (action?.setHandle !== undefined) {
                    return {
                        activeHandle: action.setHandle as number,
                        dragging: null,
                    };
                }
                if (action?.setDragging !== undefined) {
                    return {
                        ...previous,
                        dragging: action.setDragging,
                    };
                }
                if (previous.activeHandle > -1 && tr.docChanged) {
                    const activeHandle = tr.mapping.map(
                        previous.activeHandle,
                        -1
                    );
                    const row = tr.doc.nodeAt(activeHandle);
                    return {
                        ...previous,
                        activeHandle:
                            row?.type.name === "tableRow" ? activeHandle : -1,
                    };
                }
                return previous;
            },
        },
        props: {
            attributes: (state): Record<string, string> => {
                const pluginState = rowResizingPluginKey.getState(state);
                if (pluginState && pluginState.activeHandle > -1) {
                    return { class: "row-resize-cursor" };
                }
                return {};
            },
            handleDOMEvents: {
                mousemove(view, event) {
                    handleRowMouseMove(view, event as MouseEvent);
                    return false;
                },
                mouseleave(view) {
                    handleRowMouseLeave(view);
                    return false;
                },
                mousedown(view, event) {
                    return handleRowMouseDown(view, event as MouseEvent);
                },
            },
            decorations: (state) => {
                const pluginState = rowResizingPluginKey.getState(state);
                if (pluginState && pluginState.activeHandle > -1) {
                    return rowHandleDecorations(
                        state,
                        pluginState.activeHandle
                    );
                }
                return undefined;
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
