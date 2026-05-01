import { describe, expect, it } from "vitest";
import {
    cleanseMarkdownContent,
    convertRenderedColoredTablesToJsx,
    normalizeHtmlAttributeNames,
    protectCurrencyDollarsInHtmlTables,
} from "@/lib/markdown-cleanse";

describe("markdown cleanse", () => {
    it("converts rendered colored table HTML back to ColoredTable JSX", () => {
        const input = `<div class="colored-table-wrapper">
<table class="colored-table has-col-colors">
<thead>
<tr>
<th class="pt-head-col ft-nowrap">서비스</th>
<th class="pt-head-col ft-nowrap">Storage 무료</th>
<th class="pt-head-col ft-nowrap">Egress 무료</th>
<th class="pt-head-col ft-nowrap">적합도</th>
</tr>
</thead>
<tbody>
<tr>
<td class="pt-body-col ft-nowrap">Cloudflare R2</td>
<td class="pt-body-col ft-nowrap">10 GB</td>
<td class="pt-body-col ft-nowrap">무제한 ($0)</td>
<td class="pt-body-col ft-nowrap">⭐⭐⭐⭐⭐</td>
</tr>
<tr>
<td class="pt-body-col ft-nowrap">bunny.net</td>
<td class="pt-body-col ft-nowrap">$0.01/GB</td>
<td class="pt-body-col ft-nowrap">$0.01/GB</td>
<td class="pt-body-col ft-nowrap">⭐⭐ (저렴하나 무료 X)</td>
</tr>
</tbody>
</table>
</div>`;

        const result = convertRenderedColoredTablesToJsx(input);

        expect(result).toContain("<ColoredTable");
        expect(result).toContain('"무제한 ($0)"');
        expect(result).toContain('"⭐⭐⭐⭐⭐"');
        expect(result).not.toContain("<td");
        expect(result).not.toContain('class="');
    });

    it("normalizes HTML attributes that React warns about", () => {
        const input = `<table><tbody><tr><td class="x" colspan="2" rowspan='3'>cell</td></tr></tbody></table>`;

        expect(normalizeHtmlAttributeNames(input)).toBe(
            `<table><tbody><tr><td className="x" colSpan="2" rowSpan='3'>cell</td></tr></tbody></table>`
        );
    });

    it("protects currency dollars inside generic HTML tables from remark-math", () => {
        const input = `<table><tbody><tr><td>$0.01/GB</td><td>무제한 ($0)</td></tr></tbody></table>`;

        expect(protectCurrencyDollarsInHtmlTables(input)).toBe(
            `<table><tbody><tr><td>\\$0.01/GB</td><td>무제한 (\\$0)</td></tr></tbody></table>`
        );
    });

    it("does not rewrite fenced code blocks", () => {
        const input = '```html\n<td class="x" colspan="2">$0</td>\n```';

        expect(cleanseMarkdownContent(input)).toBe(input);
    });
});
