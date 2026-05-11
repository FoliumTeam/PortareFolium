import { unstable_cache } from "next/cache";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypeShiki from "@shikijs/rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import React from "react";
import { visit } from "unist-util-visit";
import {
    directiveToJsx,
    transformOutsideCodeBlocks,
} from "@/lib/mdx-directive-converter";
import { unescapeJsxBrackets } from "@/lib/tiptap-markdown";
import { normalizeKTableMdxHtml } from "@/lib/mdx-safe-html";
import MarkdownImage from "@/components/MarkdownImage";
import ImageGroup from "@/components/ImageGroup";

function YouTube({ id }: { id?: string }) {
    if (!id) return null;
    return (
        <div className="youtube-embed-wrapper" data-youtube-id={id}>
            <button
                type="button"
                data-lightbox-open="youtube"
                data-youtube-id={id}
                className="absolute top-3 right-3 z-10 rounded-lg bg-black/75 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                aria-label="영상 확대 보기"
            >
                Lightbox
            </button>
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

function Accordion({
    title,
    children,
}: {
    title?: string;
    children?: React.ReactNode;
}) {
    return (
        <details className="accordion-block">
            <summary className="accordion-summary">
                <svg
                    className="accordion-arrow"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M9 6l6 6-6 6" />
                </svg>
                <span>{title || "Accordion"}</span>
            </summary>
            <div className="accordion-body">{children}</div>
        </details>
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
    Accordion,
    Mermaid,
    img: MarkdownImage,
    // 콘텐츠 내 <Image> JSX 사용 시 next/image 대신 안전한 컴포넌트로 대체
    Image: MarkdownImage,
    ImageGroup,
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

// 모듈 레벨 선언 — slug + content가 실제 cache key의 일부로 포함됨
// 클로저 방식(매 호출마다 새 함수 생성)은 content가 key에서 누락되어 stale 결과를 서빙
const _renderCached = unstable_cache(
    async (_slug: string, content: string) => renderMarkdown(content),
    ["mdx-html"],
    { revalidate: false }
);

// slug + content를 key로 MDX 렌더링 결과 캐싱
export function getCachedMarkdown(
    slug: string,
    content: string
): Promise<string> {
    return _renderCached(slug, content);
}

export async function renderMarkdown(content: string): Promise<string> {
    // JSX 태그 내부 \[ \] escape 복원 (예외 경로로 DB에 오염된 content 방어)
    let mdx = unescapeJsxBrackets(content);
    mdx = directiveToJsx(mdx);
    mdx = transformOutsideCodeBlocks(mdx, normalizeKTableMdxHtml);
    mdx = transformOutsideCodeBlocks(mdx, escapeStrayCurlyBraces);
    try {
        // 콘텐츠 내 next/image import 제거 — renderToString 서버 컨텍스트 호환
        mdx = mdx.replace(
            /^import\s+\S+\s+from\s+['"]next\/image['"]\s*;?\s*$/gm,
            ""
        );

        const { default: MDXContent } = await evaluate(mdx, {
            ...(runtime as any),
            remarkPlugins: [remarkGfm, remarkMath, remarkMermaid],
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
        // diagnostic: dump content around error location
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = e as any;
        if (err?.line && err?.column != null) {
            const line = mdx.split("\n")[err.line - 1] ?? "";
            const col = Number(err.column);
            console.error(
                `[mdx-debug] line ${err.line} col ${col} ± 40:`,
                JSON.stringify(line.substring(Math.max(0, col - 40), col + 40))
            );
            console.error(
                `[mdx-debug] hex around col ${col}:`,
                [...line.substring(Math.max(0, col - 10), col + 10)]
                    .map(
                        (c) =>
                            c +
                            "(U+" +
                            c.charCodeAt(0).toString(16).toUpperCase() +
                            ")"
                    )
                    .join(" ")
            );
        }
        if (err?.cause?.pos != null) {
            const p = Number(err.cause.pos);
            console.error(
                `[mdx-debug] cause.pos ${p} ± 60:`,
                JSON.stringify(mdx.substring(Math.max(0, p - 60), p + 60))
            );
        }
        if (err?.cause?.raisedAt != null) {
            console.error(
                `[mdx-debug] cause.raisedAt ${err.cause.raisedAt} (position within JSX expression)`
            );
        }
        return `<p class="text-red-500">MDX 렌더링 중 오류가 발생했습니다: ${(e as Error).message}</p>`;
    }
}
