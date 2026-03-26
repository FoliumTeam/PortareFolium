import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { tailwindToHex } from "@/lib/tailwind-colors";

// tailwindColor attribute를 가진 TableCell 확장
export const ColoredTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            tailwindColor: {
                default: null,
                parseHTML: (element) =>
                    element.getAttribute("data-tw-color") || null,
                renderHTML: (attributes) => {
                    if (!attributes.tailwindColor) return {};
                    const hex = tailwindToHex(attributes.tailwindColor);
                    return {
                        "data-tw-color": attributes.tailwindColor,
                        style: hex ? `background-color: ${hex}` : undefined,
                    };
                },
            },
        };
    },
});

// ColoredTableCell을 포함한 Table 확장
export const ColoredTableExtension = Table.extend({
    addExtensions() {
        return [TableRow, TableHeader, ColoredTableCell];
    },
});
