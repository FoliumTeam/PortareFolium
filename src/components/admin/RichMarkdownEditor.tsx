"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    useEditor,
    EditorContent,
    NodeViewWrapper,
    ReactNodeViewRenderer,
} from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { KTableExtension } from "@/extensions/KTableExtension";
import {
    YoutubeEmbed,
    youtubeDirectiveToHtml,
} from "@/extensions/YoutubeEmbed";
import {
    ColoredTableNode,
    coloredTableDirectiveToHtml,
} from "@/extensions/ColoredTableNode";
import { LatexNode, latexDirectiveToHtml } from "@/extensions/LatexNode";
import {
    AccordionNode,
    accordionDirectiveToHtml,
} from "@/extensions/AccordionNode";
import {
    ImageGroupNode,
    imageGroupDirectiveToHtml,
} from "@/extensions/ImageGroupNode";
import { jsxToDirective, directiveToJsx } from "@/lib/mdx-directive-converter";
import { cleanseMarkdownContent } from "@/lib/markdown-cleanse";
import { getCleanMarkdown } from "@/lib/tiptap-markdown";
import {
    ImageDropPaste,
    bareImageUrlsToMarkdown,
} from "@/extensions/ImageDropPaste";
import { uploadImage } from "@/lib/image-upload";
import type { ImageGroupLayout } from "@/components/ImageGroup";
import EditorToolbar from "@/components/admin/EditorToolbar";
import ImageDeleteConfirmDialog from "@/components/admin/ImageDeleteConfirmDialog";
import ImageLayoutModal from "@/components/admin/ImageLayoutModal";
import type { MultiImageLayout } from "@/components/admin/ImageLayoutModal";
import TiptapImageUpload from "@/components/admin/TiptapImageUpload";

interface RichMarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    folderPath?: string;
    storageKey?: string;
    onEditorReady?: (editor: Editor) => void;
    transferring?: boolean;
    onSetThumbnail?: (url: string) => void;
    // Trigger 1 — 본문에서 image 노드가 제거되면 호출 (1초 debounce, coalesced URL 배열)
    onImagesRemoved?: (urls: string[]) => void;
}

type PendingMultiImageInsert = {
    files: File[];
    position: number;
};

// directive → HTML 전처리
function preprocessDirectiveContent(content: string): string {
    return accordionDirectiveToHtml(
        latexDirectiveToHtml(
            imageGroupDirectiveToHtml(
                coloredTableDirectiveToHtml(youtubeDirectiveToHtml(content))
            )
        )
    );
}

export default function RichMarkdownEditor({
    value,
    onChange,
    placeholder,
    disabled = false,
    folderPath,
    storageKey,
    onEditorReady,
    transferring = false,
    onSetThumbnail,
    onImagesRemoved,
}: RichMarkdownEditorProps) {
    const AUTOSAVE_KEY = `portare_autosave_editor_${storageKey ?? "default"}`;

    // 이미지 업로드 모달 상태
    const [imageUploadOpen, setImageUploadOpen] = useState(false);
    const [pendingMultiImageInsert, setPendingMultiImageInsert] =
        useState<PendingMultiImageInsert | null>(null);

    // source 편집 모드
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceText, setSourceText] = useState("");

    // source → WYSIWYG 전환 시 setContent 예약 (flushSync 충돌 방지)
    const pendingContent = useRef<string | null>(null);
    const pendingContentTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    // 모드 전환 시 스크롤 비율 보존
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const pendingScrollRatio = useRef<number | null>(null);

    const getScrollContainer = (): Element | null =>
        scrollAreaRef.current &&
        scrollAreaRef.current.scrollHeight > scrollAreaRef.current.clientHeight
            ? scrollAreaRef.current
            : document.scrollingElement;

    const saveScrollRatio = () => {
        const el = getScrollContainer();
        if (!el || el.scrollHeight <= el.clientHeight) {
            pendingScrollRatio.current = 0;
            return;
        }
        pendingScrollRatio.current =
            el.scrollTop / (el.scrollHeight - el.clientHeight);
    };

    // source 모드 textarea ref (안정적 ref — 매 렌더마다 재호출 방지)
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaRefCallback = useCallback(
        (el: HTMLTextAreaElement | null) => {
            textareaRef.current = el;
            if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
            }
        },
        []
    );

    // WYSIWYG → Source 전환 (directive → JSX 변환 후 표시)
    const enterSourceMode = () => {
        if (!editor) return;
        saveScrollRatio();
        const md = getCleanMarkdown(editor);
        setSourceText(cleanseMarkdownContent(directiveToJsx(md)));
        setSourceMode(true);
    };

    // Source → WYSIWYG 전환 (JSX → directive 변환 후 에디터 로드, DB에는 JSX 저장)
    const exitSourceMode = () => {
        if (!editor) return;
        saveScrollRatio();
        // bare image URL → ![](url) markdown 변환 (paste된 URL이 image로 렌더링되도록)
        const normalized = bareImageUrlsToMarkdown(
            cleanseMarkdownContent(sourceText)
        );
        const jsxContent = cleanseMarkdownContent(directiveToJsx(normalized));
        const directives = jsxToDirective(jsxContent);
        const preprocessed = preprocessDirectiveContent(directives);
        onChange(jsxContent);
        // setContent를 useEffect로 defer — React 렌더 완료 후 실행 (flushSync 충돌 방지)
        pendingContent.current = preprocessed;
        setSourceMode(false);
    };

    // source 모드에서 textarea 변경 (directive → JSX 변환 후 저장)
    const handleSourceChange = (val: string) => {
        setSourceText(val);
        onChange(cleanseMarkdownContent(directiveToJsx(val)));
    };

    // onSetThumbnail 최신 콜백 유지 (extension 재생성 없이 ref로 접근)
    const onSetThumbnailRef = useRef(onSetThumbnail);
    onSetThumbnailRef.current = onSetThumbnail;

    // folderPath 최신값 ref (ImageDropPaste extension closure)
    const folderPathRef = useRef(folderPath);
    folderPathRef.current = folderPath;

    // multi-image layout modal 오픈
    const handleOpenMultiImageLayout = useCallback(
        (files: File[], position: number) => {
            setPendingMultiImageInsert({ files, position });
        },
        []
    );

    // Trigger 1 image-removal 추적 + 1000ms global debounce
    const onImagesRemovedRef = useRef(onImagesRemoved);
    onImagesRemovedRef.current = onImagesRemoved;
    const imagesBeforeRef = useRef<Set<string>>(new Set());
    const removedQueueRef = useRef<Set<string>>(new Set());
    const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flushRemoved = useCallback(() => {
        removeTimerRef.current = null;
        const urls = Array.from(removedQueueRef.current);
        removedQueueRef.current.clear();
        if (urls.length === 0) return;
        onImagesRemovedRef.current?.(urls);
    }, []);
    const collectImageSrcs = useCallback((e: Editor): Set<string> => {
        const srcs = new Set<string>();
        e.state.doc.descendants((node) => {
            if (
                node.type.name === "image" &&
                typeof node.attrs.src === "string"
            ) {
                srcs.add(node.attrs.src);
            }
            if (
                node.type.name === "imageGroup" &&
                Array.isArray(node.attrs.images)
            ) {
                node.attrs.images.forEach((image: unknown) => {
                    if (typeof image === "string") srcs.add(image);
                });
            }
        });
        return srcs;
    }, []);

    // Image extension with NodeView: WYSIWYG hover 시 thumbnail/delete 버튼 표시
    const ImageWithThumbnail = useMemo(
        () =>
            Image.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(function ImageNodePreview({
                        node,
                        deleteNode,
                    }: NodeViewProps) {
                        const [confirmOpen, setConfirmOpen] = useState(false);

                        return (
                            <NodeViewWrapper
                                as="span"
                                className="editor-image-node group inline-block max-w-full align-top"
                            >
                                <span
                                    contentEditable={false}
                                    className="relative inline-flex max-w-full align-top leading-none"
                                >
                                    <img
                                        src={node.attrs.src as string}
                                        alt={(node.attrs.alt as string) ?? ""}
                                        title={
                                            (node.attrs.title as string) ||
                                            undefined
                                        }
                                        className="block h-auto max-w-full"
                                    />
                                    <span
                                        contentEditable={false}
                                        className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        {onSetThumbnailRef.current &&
                                            node.attrs.src && (
                                                <button
                                                    type="button"
                                                    contentEditable={false}
                                                    onMouseDown={(e) =>
                                                        e.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        onSetThumbnailRef.current?.(
                                                            node.attrs
                                                                .src as string
                                                        );
                                                        toast.success(
                                                            "썸네일로 설정됨"
                                                        );
                                                    }}
                                                    className="rounded bg-(--color-accent) px-2 py-1 text-xs font-medium whitespace-nowrap text-(--color-on-accent)"
                                                >
                                                    썸네일로 설정
                                                </button>
                                            )}
                                        <button
                                            type="button"
                                            contentEditable={false}
                                            aria-label="이미지 삭제"
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() => setConfirmOpen(true)}
                                            className="rounded bg-red-600 p-1.5 text-white transition-opacity hover:opacity-90"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                </span>
                                <ImageDeleteConfirmDialog
                                    open={confirmOpen}
                                    onOpenChange={setConfirmOpen}
                                    title="이미지 삭제 확인"
                                    description="이 이미지를 본문에서 삭제할지 확인합니다. cleanup trigger가 실행되면 참조가 사라진 R2 이미지도 정리 대상이 됩니다."
                                    images={[
                                        typeof node.attrs.src === "string"
                                            ? node.attrs.src
                                            : "",
                                    ].filter(Boolean)}
                                    onConfirm={() => deleteNode()}
                                />
                            </NodeViewWrapper>
                        );
                    });
                },
            }).configure({ inline: true, allowBase64: true }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const initialValue = useMemo(() => {
        if (!value) return "";
        if (value.trimStart().startsWith("{")) return value;
        return cleanseMarkdownContent(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initialContent = useMemo(() => {
        if (!initialValue) return "";
        // Tiptap JSON 형식
        if (initialValue.trimStart().startsWith("{")) {
            try {
                return JSON.parse(initialValue);
            } catch {
                // JSON 파싱 실패 시 마크다운으로 처리
            }
        }
        // JSX → directive 변환 후 Tiptap에 로드 (JSX를 그대로 넘기면 FoliumTable 등이 소실됨)
        const directives = jsxToDirective(initialValue);
        return preprocessDirectiveContent(directives);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                codeBlock: { languageClassPrefix: "language-" },
            }),
            Markdown.configure({ html: true, tightLists: true }),
            ImageWithThumbnail,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            YoutubeEmbed,
            ColoredTableNode,
            LatexNode,
            AccordionNode,
            ImageGroupNode.configure({
                hasThumbnailAction: () => Boolean(onSetThumbnailRef.current),
                onSetThumbnail: (url) => {
                    onSetThumbnailRef.current?.(url);
                    toast.success("썸네일로 설정됨");
                },
            }),
            Placeholder.configure({
                placeholder: placeholder ?? "Start writing...",
            }),
            KTableExtension.configure({ resizable: true }),
            ImageDropPaste.configure({
                getFolderPath: () => folderPathRef.current,
                onOpenMultiImageLayout: handleOpenMultiImageLayout,
            }),
        ],
        content: initialContent,
        editable: !disabled,
        onUpdate({ editor: e }) {
            const md = getCleanMarkdown(e);
            // directive → JSX 변환 후 저장 (DB에는 항상 JSX 형식 유지)
            onChange(cleanseMarkdownContent(directiveToJsx(md)));

            // Trigger 1 — image 노드 제거 감지, debounce 후 onImagesRemoved 호출
            const after = collectImageSrcs(e);
            const before = imagesBeforeRef.current;
            for (const src of before) {
                if (!after.has(src)) removedQueueRef.current.add(src);
            }
            imagesBeforeRef.current = after;
            if (removedQueueRef.current.size > 0) {
                if (removeTimerRef.current)
                    clearTimeout(removeTimerRef.current);
                removeTimerRef.current = setTimeout(flushRemoved, 1000);
            }
        },
    });

    // multi-image group 삽입
    const handleInsertImageGroup = useCallback(
        async (layout: MultiImageLayout) => {
            if (!editor || !pendingMultiImageInsert) return;
            try {
                const folder = folderPathRef.current;
                const uploadedImages = await Promise.all(
                    pendingMultiImageInsert.files.map((file) =>
                        uploadImage(file, folder)
                    )
                );

                if (layout === "individual") {
                    let position = pendingMultiImageInsert.position;

                    uploadedImages.forEach((src) => {
                        const node = editor.state.schema.nodes.image.create({
                            src,
                        });
                        const tr = editor.state.tr.insert(position, node);
                        editor.view.dispatch(tr);
                        position += node.nodeSize;
                    });
                } else {
                    editor
                        .chain()
                        .focus()
                        .insertContentAt(pendingMultiImageInsert.position, {
                            type: "imageGroup",
                            attrs: {
                                layout: layout as ImageGroupLayout,
                                images: uploadedImages,
                            },
                        })
                        .run();
                }

                setPendingMultiImageInsert(null);
            } catch (error) {
                console.error(
                    "[RichMarkdownEditor::handleInsertImageGroup] group insert 실패",
                    error
                );
                toast.error("다중 이미지 삽입 실패");
                throw error;
            }
        },
        [editor, pendingMultiImageInsert]
    );

    // editor 준비 시 imagesBefore 초기 snapshot
    useEffect(() => {
        if (editor) imagesBeforeRef.current = collectImageSrcs(editor);
    }, [editor, collectImageSrcs]);

    // 기존 렌더링 HTML이 DB에 저장된 경우 최초 로드 때 표준 MDX/JSX 저장 형식으로 정리
    useEffect(() => {
        if (initialValue && initialValue !== value) onChange(initialValue);
        // 최초 로드 보정만 수행
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // unmount 시 debounce timer 정리
    useEffect(() => {
        return () => {
            if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
            if (pendingContentTimer.current) {
                clearTimeout(pendingContentTimer.current);
                pendingContentTimer.current = null;
            }
        };
    }, []);

    // editor 준비 콜백
    useEffect(() => {
        if (editor && onEditorReady) onEditorReady(editor);
    }, [editor, onEditorReady]);

    // source → WYSIWYG 전환 후 setContent 실행 (React 렌더 완료 이후 보장)
    useEffect(() => {
        if (sourceMode && pendingContentTimer.current) {
            clearTimeout(pendingContentTimer.current);
            pendingContentTimer.current = null;
        }
        if (!sourceMode && pendingContent.current && editor) {
            if (pendingContentTimer.current) {
                clearTimeout(pendingContentTimer.current);
            }
            pendingContentTimer.current = setTimeout(() => {
                if (!pendingContent.current) return;
                editor.commands.setContent(pendingContent.current);
                pendingContent.current = null;
                pendingContentTimer.current = null;
            }, 0);
        }
    }, [sourceMode, editor]);

    // 모드 전환 후 스크롤 비율 복원 (content-set useEffect 이후 실행)
    useEffect(() => {
        if (pendingScrollRatio.current === null) return;
        const ratio = pendingScrollRatio.current;
        pendingScrollRatio.current = null;
        // rAF 2회: 첫 번째는 DOM 업데이트 대기, 두 번째는 레이아웃 완료 대기
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const container = getScrollContainer();
                if (
                    container &&
                    container.scrollHeight > container.clientHeight
                ) {
                    container.scrollTop =
                        ratio *
                        (container.scrollHeight - container.clientHeight);
                }
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceMode]);

    // --- Autosave (localStorage, 5-second interval) ---
    useEffect(() => {
        if (!editor || disabled) return;
        const id = setInterval(() => {
            const md = getCleanMarkdown(editor);
            if (md) {
                localStorage.setItem(
                    AUTOSAVE_KEY,
                    JSON.stringify({
                        content: md,
                        savedAt: new Date().toISOString(),
                    })
                );
            }
        }, 5000);
        return () => clearInterval(id);
    }, [editor, disabled, AUTOSAVE_KEY]);

    // --- Fullscreen ---
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

    // Lock body scroll when fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    // Close fullscreen on Escape
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullscreen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    return (
        <>
            {/* Outer wrapper: invisible placeholder preserves layout space when fullscreen */}
            <div className={isFullscreen ? "invisible" : "tablet:h-full"}>
                {/* Editor container: CSS fixed overlay when fullscreen, inline card otherwise.
                    visible overrides inherited invisible so the fixed overlay remains visible.
                    tablet+ 에선 flex-col + h-full 로 내부 scroll 영역 fit, 모바일은 content 높이 그대로. */}
                <div
                    className={
                        isFullscreen
                            ? "visible fixed inset-0 z-100 flex flex-col bg-zinc-100 dark:bg-zinc-950"
                            : "tablet:flex tablet:h-full tablet:flex-col relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }
                >
                    {/* 에셋 이전 중 overlay */}
                    {transferring && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
                            <div className="flex items-center gap-3 text-sm font-medium text-(--color-muted)">
                                <svg
                                    className="h-5 w-5 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                에셋 이전 중...
                            </div>
                        </div>
                    )}
                    {/* Toolbar */}
                    <div
                        className={
                            isFullscreen
                                ? "sticky top-0 z-30 flex items-center"
                                : ""
                        }
                    >
                        <EditorToolbar
                            editor={editor}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={toggleFullscreen}
                            onImageUpload={() => setImageUploadOpen(true)}
                            sourceMode={sourceMode}
                            onSourceToggle={
                                sourceMode ? exitSourceMode : enterSourceMode
                            }
                        />
                        {isFullscreen && (
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                aria-label="Exit fullscreen"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Scrollable content area (source + WYSIWYG share same scroll/paper container).
                        모바일은 page scroll, tablet+ 은 이 영역이 자체 스크롤. */}
                    <div
                        ref={scrollAreaRef}
                        className={
                            isFullscreen
                                ? "flex-1 overflow-y-auto"
                                : "tablet:flex-1 tablet:overflow-y-auto"
                        }
                    >
                        {/* Source mode textarea */}
                        {sourceMode && (
                            <div
                                className={`min-h-[300px] w-full bg-zinc-50 p-6 dark:bg-zinc-800 ${
                                    isFullscreen
                                        ? "tablet:p-8 laptop:p-16 mx-auto my-8 max-w-4xl rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
                                        : ""
                                }`}
                                onClick={(e) => {
                                    const ta = (
                                        e.currentTarget as HTMLElement
                                    ).querySelector("textarea");
                                    if (ta) ta.focus();
                                }}
                            >
                                <textarea
                                    value={sourceText}
                                    onChange={(e) => {
                                        handleSourceChange(e.target.value);
                                        // 스크롤 위치 보존: height=auto가 textarea를 일시적으로 축소시켜 스크롤 리셋 유발
                                        const scrollParent = (e.target.closest(
                                            ".overflow-y-auto"
                                        ) ??
                                            document.scrollingElement) as HTMLElement | null;
                                        const savedScrollTop =
                                            scrollParent?.scrollTop ?? 0;
                                        e.target.style.height = "auto";
                                        e.target.style.height =
                                            e.target.scrollHeight + "px";
                                        if (scrollParent)
                                            scrollParent.scrollTop =
                                                savedScrollTop;
                                    }}
                                    ref={textareaRefCallback}
                                    className="w-full resize-none overflow-hidden bg-transparent font-mono text-sm leading-relaxed text-zinc-800 outline-none dark:text-zinc-200"
                                    spellCheck={false}
                                />
                            </div>
                        )}

                        {/* WYSIWYG editor — single instance, always mounted, never remounted */}
                        <div
                            className={`prose ${
                                isFullscreen
                                    ? "prose-lg tablet:p-8 laptop:p-16 mx-auto my-8 min-h-[1100px] max-w-4xl rounded-xl bg-white p-4 shadow-2xl dark:bg-zinc-900"
                                    : "prose-base min-h-[300px] max-w-none p-6"
                            } ${sourceMode ? "hidden" : ""}`}
                        >
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 이미지 업로드 모달 */}
            <TiptapImageUpload
                editor={editor}
                isOpen={imageUploadOpen}
                onClose={() => setImageUploadOpen(false)}
                folderPath={folderPath}
            />

            <ImageLayoutModal
                files={pendingMultiImageInsert?.files ?? []}
                isOpen={pendingMultiImageInsert !== null}
                onClose={() => setPendingMultiImageInsert(null)}
                onSubmit={handleInsertImageGroup}
            />
        </>
    );
}
