import { transformOutsideCodeBlocks } from "@/lib/mdx-directive-converter";

const REACT_ATTRIBUTE_NAMES: Record<string, string> = {
    class: "className",
    colspan: "colSpan",
    rowspan: "rowSpan",
};

export function cleanseMarkdownContent(content: string): string {
    if (!content) return content;
    return normalizeHtmlAttributeNames(
        protectCurrencyDollarsInHtmlTables(
            convertRenderedColoredTablesToJsx(content)
        )
    );
}

export function normalizeHtmlAttributeNames(content: string): string {
    return transformOutsideCodeBlocks(content, (chunk) =>
        chunk.replace(/<[a-z][\w:-]*(?:\s+[^<>]*?)?\/?>/g, (tag) =>
            tag.replace(
                /(\s)(class|colspan|rowspan)(\s*=)/gi,
                (_, prefix: string, name: string, suffix: string) =>
                    `${prefix}${REACT_ATTRIBUTE_NAMES[name.toLowerCase()]}${suffix}`
            )
        )
    );
}

export function protectCurrencyDollarsInHtmlTables(content: string): string {
    return transformOutsideFencedCodeBlocks(content, (chunk) =>
        chunk.replace(/<table\b[\s\S]*?<\/table>/gi, (table) =>
            table.replace(/(^|[^\\])\$(?=\d)/g, "$1\\$")
        )
    );
}

export function convertRenderedColoredTablesToJsx(content: string): string {
    return transformOutsideFencedCodeBlocks(content, (chunk) =>
        chunk.replace(
            /<div\b(?=[^>]*\bclass=(?:"[^"]*\bcolored-table-wrapper\b[^"]*"|'[^']*\bcolored-table-wrapper\b[^']*'))[^>]*>\s*(<table\b[\s\S]*?<\/table>)\s*<\/div>/gi,
            (block, table: string) => renderedColoredTableToJsx(table) ?? block
        )
    );
}

function renderedColoredTableToJsx(table: string): string | null {
    if (
        !/\bclass=(?:"[^"]*\bcolored-table\b[^"]*"|'[^']*\bcolored-table\b[^']*')/i.test(
            table
        )
    ) {
        return null;
    }

    const thead = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1];
    const tbody = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
    if (!thead || !tbody) return null;

    const headerCells = parseCells(thead, "th");
    const columns = headerCells.map((cell) => cell.text);
    if (columns.length === 0) return null;

    const rows = Array.from(tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
        .map(([, rowHtml]) =>
            parseCells(rowHtml, "td").map((cell) => cell.text)
        )
        .filter((row) => row.length > 0);
    if (rows.length === 0) return null;

    const columnHeadColors = headerCells.map(
        (cell) => getAttributeValue(cell.attrs, "data-ct-color") ?? ""
    );

    return [
        "",
        `<ColoredTable columns={'${toJsxSingleQuotedJson(columns)}'} rows={'${toJsxSingleQuotedJson(rows)}'} columnHeadColors={'${toJsxSingleQuotedJson(columnHeadColors)}'} />`,
        "",
    ].join("\n");
}

function parseCells(
    html: string,
    tagName: "th" | "td"
): Array<{ attrs: string; text: string }> {
    const cellPattern = new RegExp(
        `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
        "gi"
    );
    return Array.from(html.matchAll(cellPattern)).map(([, attrs, inner]) => ({
        attrs,
        text: htmlCellToText(inner),
    }));
}

function getAttributeValue(attrs: string, name: string): string | null {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = attrs.match(
        new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
    );
    return match ? decodeHtmlEntities(match[1] ?? match[2] ?? "") : null;
}

function htmlCellToText(html: string): string {
    return decodeHtmlEntities(
        html
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/[ \t\r\n]+/g, " ")
            .trim()
    );
}

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#x27;/gi, "'")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&rarr;/g, "→")
        .replace(/&larr;/g, "←")
        .replace(/&middot;/g, "·")
        .replace(/&#(\d+);/g, (_, code: string) =>
            String.fromCodePoint(Number(code))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
            String.fromCodePoint(Number.parseInt(code, 16))
        );
}

function toJsxSingleQuotedJson(value: unknown): string {
    return JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function transformOutsideFencedCodeBlocks(
    content: string,
    transform: (text: string) => string
): string {
    return content
        .split(/(```[\s\S]*?```)/g)
        .map((part, index) => (index % 2 === 0 ? transform(part) : part))
        .join("");
}
