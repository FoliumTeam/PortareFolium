"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
    NodeViewWrapper,
    ReactNodeViewRenderer,
    type ReactNodeViewProps,
} from "@tiptap/react";
import { Trash2 } from "lucide-react";

type ImageGroupAttributes = {
    images: string[];
    layout: string;
};

type ImageGroupNodeOptions = {
    hasThumbnailAction?: () => boolean;
    onSetThumbnail?: (url: string) => void;
};

// ImageGroup 미리보기
function ImageGroupPreview({
    deleteNode,
    node,
    selected,
    updateAttributes,
    extension,
}: ReactNodeViewProps) {
    const images = Array.isArray(node.attrs.images) ? node.attrs.images : [];
    const layout =
        typeof node.attrs.layout === "string" ? node.attrs.layout : "stack";
    const options = extension.options as ImageGroupNodeOptions;
    const showThumbnailButton = options.hasThumbnailAction?.() ?? false;

    const removeImage = (target: string, index: number) => {
        const nextImages = images.filter(
            (image, imageIndex) => !(image === target && imageIndex === index)
        );

        if (nextImages.length === 0) {
            deleteNode();
            return;
        }

        updateAttributes({ images: nextImages });
    };

    return (
        <NodeViewWrapper
            className={`my-4 rounded-[28px] border p-4 ${
                selected
                    ? "border-zinc-950 shadow-lg dark:border-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800"
            }`}
        >
            <div contentEditable={false}>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                        ImageGroup
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {layout}
                        </span>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => deleteNode()}
                            className="rounded bg-red-600 p-1.5 text-white transition-opacity hover:opacity-90"
                            aria-label="이미지 그룹 삭제"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
                <div
                    className={
                        layout === "slider"
                            ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                            : "flex flex-col gap-4"
                    }
                >
                    {images.map((src, index) => (
                        <span
                            key={`${src}-${index}`}
                            className={
                                layout === "slider"
                                    ? "group relative inline-block w-[78%] max-w-none shrink-0 snap-center"
                                    : "group relative block max-w-full"
                            }
                        >
                            <img
                                src={src}
                                alt=""
                                className={
                                    layout === "slider"
                                        ? "h-auto w-full rounded"
                                        : "h-auto max-w-full rounded"
                                }
                            />
                            <span className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                {showThumbnailButton && (
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() =>
                                            options.onSetThumbnail?.(src)
                                        }
                                        className="rounded bg-(--color-accent) px-2 py-1 text-xs font-medium whitespace-nowrap text-(--color-on-accent)"
                                    >
                                        썸네일로 설정
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => removeImage(src, index)}
                                    className="rounded bg-red-600 p-1.5 text-white transition-opacity hover:opacity-90"
                                    aria-label="그룹 내부 이미지 삭제"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </NodeViewWrapper>
    );
}

// ImageGroup node 등록
export const ImageGroupNode = Node.create<ImageGroupNodeOptions>({
    name: "imageGroup",
    group: "block",
    atom: true,
    draggable: true,

    addOptions() {
        return {
            hasThumbnailAction: undefined,
            onSetThumbnail: undefined,
        };
    },

    addAttributes() {
        return {
            layout: {
                default: "stack",
                parseHTML: (element) =>
                    element.getAttribute("data-image-group-layout") ?? "stack",
                renderHTML: (attributes) => ({
                    "data-image-group-layout": attributes.layout,
                }),
            },
            images: {
                default: [],
                parseHTML: (element) => {
                    const raw =
                        element.getAttribute("data-image-group-images") ?? "[]";
                    try {
                        const parsed = JSON.parse(raw) as unknown;
                        return Array.isArray(parsed)
                            ? parsed.filter(
                                  (image): image is string =>
                                      typeof image === "string" &&
                                      image.trim().length > 0
                              )
                            : [];
                    } catch {
                        return [];
                    }
                },
                renderHTML: (attributes) => ({
                    "data-image-group-images": JSON.stringify(
                        Array.isArray(attributes.images)
                            ? attributes.images
                            : []
                    ),
                }),
            },
        };
    },

    parseHTML() {
        return [
            { tag: "div[data-image-group-layout][data-image-group-images]" },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-image-group-layout":
                    HTMLAttributes["data-image-group-layout"],
                "data-image-group-images":
                    HTMLAttributes["data-image-group-images"],
            }),
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageGroupPreview);
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    state: {
                        write: (value: string) => void;
                        closeBlock: (node: unknown) => void;
                    },
                    node: { attrs: ImageGroupAttributes }
                ) {
                    const layout =
                        typeof node.attrs.layout === "string"
                            ? node.attrs.layout
                            : "stack";
                    const images = JSON.stringify(
                        Array.isArray(node.attrs.images)
                            ? node.attrs.images
                            : []
                    ).replace(/'/g, "\\'");

                    state.write(
                        `::image-group[]{layout="${layout}" images='${images}'}`
                    );
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },
});

// image-group directive → HTML 변환
export function imageGroupDirectiveToHtml(markdown: string): string {
    return markdown.replace(
        /::image-group(?:\[\])?\{([^}]*)\}/g,
        (directive, attrs) => {
            const parsedAttrs = new Map<string, string>();
            const regex = /(\w+)=(['"])([\s\S]*?)\2(?=\s+\w+=|$)/g;
            let match: RegExpExecArray | null;

            while ((match = regex.exec(attrs)) !== null) {
                parsedAttrs.set(match[1], match[3].replace(/&quot;/g, '"'));
            }

            const layout = parsedAttrs.get("layout");
            const images = parsedAttrs.get("images");
            if (!layout || !images) return directive;

            const safeLayout = layout.replace(/"/g, "&quot;");
            const safeImages = images.replace(/"/g, "&quot;");

            return `<div data-image-group-layout="${safeLayout}" data-image-group-images="${safeImages}"></div>`;
        }
    );
}
