import { unstable_cache } from "next/cache";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import React from "react";
import { visit } from "unist-util-visit";
import { tailwindToHex, isLightBackground } from "@/lib/tailwind-colors";
import {
    directiveToJsx,
    transformOutsideCodeBlocks,
} from "@/lib/mdx-directive-converter";
import MarkdownImage from "@/components/MarkdownImage";

function YouTube({ id }: { id?: string }) {
    if (!id) return null;
    return (
        <div className="youtube-embed-wrapper">
            <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="youtube-embed"
            />
        </div>
    );
}

function FoliumTable({
    columns,
    rows,
    columnHeadColors,
    columnHeadColorsDark,
    rowColors,
    rowColorsDark,
}: Record<string, any>) {
    function parseArr<T>(v: unknown): T[] {
        if (!v) return [];
        try {
            return typeof v === "string" ? JSON.parse(v) : (v as T[]);
        } catch {
            return [];
        }
    }

    const headers = parseArr<string>(columns);
    const dataRows = parseArr<string[]>(rows);
    const headColors = columnHeadColors
        ? parseArr<string>(columnHeadColors)
        : undefined;
    const headColorsDark = columnHeadColorsDark
        ? parseArr<string>(columnHeadColorsDark)
        : undefined;
    const bodyColors = rowColors ? parseArr<string>(rowColors) : undefined;
    const bodyColorsDark = rowColorsDark
        ? parseArr<string>(rowColorsDark)
        : undefined;

    const NOWRAP = 15;
    function getTextColor(name: string): string {
        return isLightBackground(name)
            ? "var(--color-foreground)"
            : "rgba(255,255,255,0.95)";
    }

    const hasColors = !!(headColors?.length || bodyColors?.length);

    return (
        <div className="folium-table-wrapper">
            <table
                className={`folium-table${hasColors ? "has-col-colors" : ""}`}
            >
                <thead>
                    <tr>
                        {headers.map((h, i) => {
                            const tl = headColors?.[i];
                            const td = headColorsDark?.[i];
                            const bgl = tl ? tailwindToHex(tl) : "";
                            const bgd = td ? tailwindToHex(td) : "";
                            const txl = tl ? getTextColor(tl) : "";
                            const txd = td
                                ? getTextColor(td)
                                : tl
                                  ? getTextColor(tl)
                                  : "";
                            const cls = [
                                tl || td ? "pt-head-col" : "",
                                h.length <= NOWRAP ? "ft-nowrap" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <th
                                    key={i}
                                    className={cls || undefined}
                                    style={
                                        bgl
                                            ? ({
                                                  "--pt-bg": bgl,
                                                  "--pt-text": txl,
                                              } as any)
                                            : undefined
                                    }
                                    data-pt-head-idx={i}
                                    data-pt-bg-dark={bgd || undefined}
                                    data-pt-text-dark={txd || undefined}
                                >
                                    {h}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                            {row.map((cell, i) => {
                                const tl = bodyColors?.[i];
                                const td = bodyColorsDark?.[i];
                                const bgl = tl ? tailwindToHex(tl) : "";
                                const bgd = td ? tailwindToHex(td) : "";
                                const txl = tl ? getTextColor(tl) : "";
                                const txd = td
                                    ? getTextColor(td)
                                    : tl
                                      ? getTextColor(tl)
                                      : "";
                                const text = cell || "—";
                                const cls = [
                                    tl || td ? "pt-body-col" : "",
                                    text.length <= NOWRAP ? "ft-nowrap" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                return (
                                    <td
                                        key={i}
                                        className={cls || undefined}
                                        style={
                                            bgl
                                                ? ({
                                                      "--pt-bg": bgl,
                                                      "--pt-text": txl,
                                                  } as any)
                                                : undefined
                                        }
                                        data-pt-body-idx={i}
                                        data-pt-bg-dark={bgd || undefined}
                                        data-pt-text-dark={txd || undefined}
                                    >
                                        {text}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Mermaid({ encoded }: { encoded: string }) {
    return (
        <div
            className="mermaid-pending"
            data-mermaid-definition={encoded}
        ></div>
    );
}

// Mermaid 블록 우회 (shiki가 mermaid를 못 찾아서 에러나는 것을 방지하고 나중에 프론트에서 렌더링하기 위해 사용)
function remarkMermaid() {
    return (tree: any) => {
        visit(tree, "code", (node: any) => {
            if (node.lang === "mermaid") {
                const encoded = Buffer.from(node.value || "", "utf-8").toString(
                    "base64"
                );
                node.type = "mdxJsxFlowElement";
                node.name = "Mermaid";
                node.attributes = [
                    {
                        type: "mdxJsxAttribute",
                        name: "encoded",
                        value: encoded,
                    },
                ];
                node.children = [];
                // 삭제
                delete node.lang;
                delete node.meta;
                delete node.value;
            }
        });
    };
}

const components = {
    YouTube,
    FoliumTable,
    Mermaid,
    img: MarkdownImage,
};

// 코드 블록 밖의 홀로 남은 { } 를 라인 단위로 이스케이프
function escapeStrayCurlyBraces(chunk: string): string {
    return chunk
        .split("\n")
        .map((line) => {
            // JSX 태그 라인은 건드리지 않음
            if (/<\w+[\s/>]/.test(line)) return line;
            return line
                .replace(/(?<!\{)\{(?!\{|\/\*|`)/g, "\\{")
                .replace(/(?<!\})\}(?!\})/g, "\\}");
        })
        .join("\n");
}

// slug + content를 key로 MDX 렌더링 결과 캐싱 (revalidate 시에만 재실행)
export function getCachedMarkdown(
    slug: string,
    content: string
): Promise<string> {
    return unstable_cache(() => renderMarkdown(content), [`mdx-html-${slug}`], {
        revalidate: 3600,
        tags: [`post-${slug}`],
    })();
}

export async function renderMarkdown(content: string): Promise<string> {
    try {
        // directive → JSX 변환 + 남은 {} 이스케이프
        let mdx = directiveToJsx(content);
        mdx = transformOutsideCodeBlocks(mdx, escapeStrayCurlyBraces);

        const { default: MDXContent } = await evaluate(mdx, {
            ...(runtime as any),
            remarkPlugins: [remarkMath, remarkMermaid],
            rehypePlugins: [
                rehypeKatex,
                [
                    rehypeShiki,
                    {
                        themes: { light: "github-light", dark: "github-dark" },
                        defaultColor: false,
                    },
                ],
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: "wrap" }],
            ],
        });

        const { renderToString } = await import("react-dom/server");
        const html = renderToString(<MDXContent components={components} />);
        return html;
    } catch (e) {
        console.error("MDX Rendering Error:", e);
        return `<p class="text-red-500">MDX 렌더링 중 오류가 발생했습니다: ${(e as Error).message}</p>`;
    }
}
