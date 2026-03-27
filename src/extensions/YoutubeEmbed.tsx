"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
    ReactNodeViewRenderer,
    NodeViewWrapper,
    type ReactNodeViewProps,
} from "@tiptap/react";

// 에디터 내 YouTube 프리뷰 컴포넌트
function YoutubePreview({ node }: ReactNodeViewProps) {
    const id = node.attrs.videoId as string;
    return (
        <NodeViewWrapper className="my-3">
            <div className="rich-editor-youtube-wrapper">
                {id ? (
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        title="YouTube video"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rich-editor-youtube-embed"
                    />
                ) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800">
                        YouTube ID 없음
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

// YouTube embed node extension (directive 기반)
export const YoutubeEmbed = Node.create({
    name: "youtubeEmbed",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            videoId: {
                default: null,
                parseHTML: (el) => el.getAttribute("data-youtube-id"),
                renderHTML: (attrs) => ({
                    "data-youtube-id": attrs.videoId,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-youtube-id]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-youtube-id": HTMLAttributes["data-youtube-id"],
            }),
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(YoutubePreview);
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    state: {
                        write: (s: string) => void;
                        closeBlock: (n: unknown) => void;
                    },
                    node: { attrs: { videoId: string } }
                ) {
                    state.write(
                        `::youtube[]{id="${node.attrs.videoId ?? ""}"}`
                    );
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },
});

// markdown 로드 전 ::youtube directive → HTML 변환 (tiptap parseHTML 호환)
export function youtubeDirectiveToHtml(md: string): string {
    return md.replace(
        /::youtube\[\]\{id="([^"]+)"\}/g,
        '<div data-youtube-id="$1"></div>'
    );
}
