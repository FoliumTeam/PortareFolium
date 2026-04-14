"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
    ReactNodeViewRenderer,
    NodeViewWrapper,
    NodeViewContent,
    type ReactNodeViewProps,
} from "@tiptap/react";
import { useState } from "react";

// 에디터 내 Accordion 프리뷰 컴포넌트 (title inline 편집 + collapse toggle)
function AccordionPreview({ node, updateAttributes }: ReactNodeViewProps) {
    const title = (node.attrs.title as string) ?? "";
    const [isOpen, setIsOpen] = useState(true);

    return (
        <NodeViewWrapper className="my-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div
                className="flex cursor-pointer items-center gap-2 bg-zinc-50 px-3 py-2 dark:bg-zinc-800"
                contentEditable={false}
                onClick={(e) => {
                    // input 클릭 시 토글 방지
                    if ((e.target as HTMLElement).tagName === "INPUT") return;
                    setIsOpen((v) => !v);
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-zinc-500 transition-transform"
                    style={{
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                >
                    <path d="M9 6l6 6-6 6" />
                </svg>
                <input
                    type="text"
                    value={title}
                    onChange={(e) =>
                        updateAttributes({ title: e.target.value })
                    }
                    placeholder="Accordion title"
                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 outline-none dark:text-zinc-100"
                />
            </div>
            <NodeViewContent
                className={`px-4 py-3 ${isOpen ? "" : "hidden"}`}
                as="div"
            />
        </NodeViewWrapper>
    );
}

// Accordion node extension (directive 기반, inner content 포함)
export const AccordionNode = Node.create({
    name: "accordion",
    group: "block",
    content: "block+",
    defining: true,

    addAttributes() {
        return {
            title: {
                default: "",
                parseHTML: (el) =>
                    el.getAttribute("data-accordion-title") ?? "",
                renderHTML: (attrs) => ({
                    "data-accordion-title": attrs.title,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-accordion-title]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AccordionPreview);
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    state: {
                        write: (s: string) => void;
                        renderContent: (n: unknown) => void;
                        closeBlock: (n: unknown) => void;
                    },
                    node: { attrs: { title: string } }
                ) {
                    // title 내 [ ] 이스케이프 (directive 경계 충돌 방지)
                    const safeTitle = (node.attrs.title ?? "").replace(
                        /[\[\]]/g,
                        ""
                    );
                    state.write(`:::accordion[${safeTitle}]\n\n`);
                    state.renderContent(node);
                    state.write(`:::`);
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },
});

// markdown 로드 전 :::accordion directive → HTML 변환 (tiptap parseHTML 호환)
// inner content는 markdown으로 유지 (tiptap-markdown이 재파싱)
export function accordionDirectiveToHtml(md: string): string {
    return md.replace(
        /:::accordion\[([^\]]*)\]\n([\s\S]*?)\n:::/g,
        (_, title, inner) => {
            const safeTitle = String(title).replace(/"/g, "&quot;");
            return `<div data-accordion-title="${safeTitle}">\n\n${inner}\n\n</div>`;
        }
    );
}
