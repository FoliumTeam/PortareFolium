import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { KTableExtension } from "@/extensions/KTableExtension";
import { renderMarkdown } from "@/lib/markdown";
import { normalizeKTableMdxHtml } from "@/lib/mdx-safe-html";
import { getCleanMarkdown } from "@/lib/tiptap-markdown";

function createEditor() {
    return new Editor({
        extensions: [
            StarterKit,
            Markdown.configure({ html: true, tightLists: true }),
            KTableExtension.configure({ resizable: true }),
        ],
        content: "<p>table anchor</p>",
    });
}

describe("KTableExtension", () => {
    it("inserts full-width bordered tables by default", () => {
        const editor = createEditor();

        editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });

        const html = editor.getHTML();
        expect(html).toContain('data-ktable="true"');
        expect(html).toContain('data-table-width="100%"');
        expect(html).toContain('data-table-bordered="true"');
        expect(html).not.toContain("style=");
    });

    it("renders cell attributes used by the table property UI", () => {
        const editor = createEditor();

        editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
        editor.commands.setCellAttribute("tailwindColor", "blue-200");
        editor.commands.setCellAttribute("textAlign", "center");

        const html = editor.getHTML();
        expect(html).toContain('data-tw-color="blue-200"');
        expect(html).toContain('data-text-align="center"');
        expect(html).not.toContain("style=");
    });

    it("serializes KTable attrs as MDX-safe HTML so table properties survive save/load", () => {
        const editor = createEditor();

        editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
        editor.commands.updateAttributes("table", { bordered: false });
        editor.commands.setCellAttribute("tailwindColor", "blue-200");
        editor.commands.setCellAttribute("textAlign", "center");

        const markdown = getCleanMarkdown(editor as never);
        expect(markdown).toContain("<table");
        expect(markdown).toContain('data-table-bordered="false"');
        expect(markdown).toContain('data-tw-color="blue-200"');
        expect(markdown).toContain('data-text-align="center"');
        expect(markdown).not.toContain("style=");

        const reloaded = createEditor();
        reloaded.commands.setContent(markdown);
        const html = reloaded.getHTML();
        expect(html).toContain('data-table-bordered="false"');
        expect(html).toContain('data-tw-color="blue-200"');
        expect(html).toContain('data-text-align="center"');
    });

    it("drops unsupported table attrs when normalizing imported HTML", () => {
        const editor = createEditor();

        editor.commands.setContent(
            '<table data-ktable="true" data-table-bordered="false" data-evil="ignored" onclick="alert(1)" style="color:red"><tbody><tr><td data-tw-color="blue-200" data-text-align="center" data-bg-color="#000" data-vertical-align="top" onclick="alert(1)" style="background:red">Cell</td></tr></tbody></table>'
        );

        const markdown = getCleanMarkdown(editor as never);
        expect(markdown).toContain('data-table-bordered="false"');
        expect(markdown).toContain('data-tw-color="blue-200"');
        expect(markdown).toContain('data-text-align="center"');
        expect(markdown).not.toContain("data-evil");
        expect(markdown).not.toContain("onclick");
        expect(markdown).not.toContain("style=");
        expect(markdown).not.toContain("data-bg-color");
        expect(markdown).not.toContain("data-vertical-align");
    });

    it("renders persisted KTable HTML through the public markdown renderer", async () => {
        const html = await renderMarkdown(`
            <table data-ktable="true" data-table-width="100%" data-table-bordered="false">
                <tbody>
                    <tr>
                        <td data-tw-color="blue-200" data-text-align="center">Cell</td>
                    </tr>
                </tbody>
            </table>
        `);

        expect(html).toContain('data-ktable="true"');
        expect(html).toContain('data-table-width="100%"');
        expect(html).toContain('data-table-bordered="false"');
        expect(html).toContain('data-tw-color="blue-200"');
        expect(html).toContain('data-text-align="center"');
        expect(html).toContain("Cell");
        expect(html).not.toContain("style=");
    }, 15_000);

    it("normalizes generated KTable image HTML into MDX-safe JSX", () => {
        const markdown = normalizeKTableMdxHtml(`
            <table data-table-width="100%" data-table-bordered="true" data-ktable="true" class="ktable">
                <tr><th colspan="1" rowspan="1"><p style="text-align: center;"><img src="https://example.com/a.webp"></p></th></tr>
            </table>
        `);

        expect(markdown).toContain('className="ktable"');
        expect(markdown).toContain('colSpan="1"');
        expect(markdown).toContain('rowSpan="1"');
        expect(markdown).toContain('data-text-align="center"');
        expect(markdown).toContain('<img src="https://example.com/a.webp" />');
        expect(markdown).not.toContain("style=");
        expect(markdown).not.toContain("colspan=");
        expect(markdown).not.toContain("rowspan=");
    });

    it("keeps generated KTable row height as an MDX-safe style object", () => {
        const markdown = normalizeKTableMdxHtml(`
            <table data-ktable="true"><tbody><tr data-row-height="48px" style="height: 48px"><td>Cell</td></tr></tbody></table>
        `);

        expect(markdown).toContain('data-row-height="48px"');
        expect(markdown).toContain('style={{ height: "48px" }}');
        expect(markdown).not.toContain('style="height: 48px"');
    });

    it("renders generated KTable images that were saved as browser HTML", async () => {
        const html = await renderMarkdown(`
            <table data-table-width="100%" data-table-bordered="true" data-ktable="true" class="ktable">
                <tr><th colspan="1" rowspan="1"><p style="text-align: center;"><img src="https://example.com/a.webp"></p></th></tr>
            </table>
        `);

        expect(html).toContain('data-ktable="true"');
        expect(html).toContain('src="https://example.com/a.webp"');
        expect(html).toContain('data-text-align="center"');
        expect(html).not.toContain("MDX 렌더링 중 오류");
        expect(html).not.toContain("style=");
    }, 15_000);

    it("renders generated KTable row height that was saved as browser HTML", async () => {
        const html = await renderMarkdown(`
            <table data-ktable="true"><tbody><tr data-row-height="48px" style="height: 48px"><td>Cell</td></tr></tbody></table>
        `);

        expect(html).toContain('data-row-height="48px"');
        expect(html).toContain('style="height:48px"');
        expect(html).toContain("Cell");
        expect(html).not.toContain("MDX 렌더링 중 오류");
    }, 15_000);
});
