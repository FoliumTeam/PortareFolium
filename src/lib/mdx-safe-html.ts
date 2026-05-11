const VOID_TAG_PATTERN =
    /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b([^>]*)>/gi;

const HTML_ATTR_PATTERN =
    /\s(class|colspan|rowspan|cellpadding|cellspacing|tabindex|readonly)=/gi;

const HTML_TO_JSX_ATTRS: Record<string, string> = {
    class: "className",
    colspan: "colSpan",
    rowspan: "rowSpan",
    cellpadding: "cellPadding",
    cellspacing: "cellSpacing",
    tabindex: "tabIndex",
    readonly: "readOnly",
};

function normalizeHtmlAttributeNames(html: string): string {
    return html.replace(HTML_ATTR_PATTERN, (_match, attr: string) => {
        return ` ${HTML_TO_JSX_ATTRS[attr.toLowerCase()] ?? attr}=`;
    });
}

function normalizeVoidTags(html: string): string {
    return html.replace(
        VOID_TAG_PATTERN,
        (match, tagName: string, attributes: string) => {
            if (attributes.trimEnd().endsWith("/")) return match;
            return `<${tagName}${attributes} />`;
        }
    );
}

function normalizeTextAlignStyle(html: string): string {
    return html.replace(
        /<p\b([^>]*)\sstyle="\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*"([^>]*)>/gi,
        (_match, before: string, align: string, after: string) =>
            `<p${before} data-text-align="${align.toLowerCase()}"${after}>`
    );
}

function normalizeStyleAttributes(html: string): string {
    return html.replace(/\sstyle="([^"]*)"/gi, (_match, style: string) => {
        const declarations = style
            .split(";")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.split(":"))
            .map(([property, ...valueParts]) => ({
                property: property?.trim().toLowerCase(),
                value: valueParts.join(":").trim(),
            }))
            .filter(({ property, value }) => property && value);

        const safeEntries = declarations.flatMap(({ property, value }) => {
            if (
                property === "height" &&
                /^\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(value)
            ) {
                return [`height: "${value}"`];
            }
            return [];
        });

        if (safeEntries.length === 0) return "";
        return ` style={{ ${safeEntries.join(", ")} }}`;
    });
}

export function normalizeMdxSafeHtml(html: string): string {
    return normalizeVoidTags(
        normalizeHtmlAttributeNames(
            normalizeStyleAttributes(normalizeTextAlignStyle(html))
        )
    );
}

export function normalizeKTableMdxHtml(content: string): string {
    return content.replace(
        /<table\b(?=[^>]*data-ktable=["']true["'])[^>]*>[\s\S]*?<\/table>/gi,
        (table) => normalizeMdxSafeHtml(table)
    );
}
