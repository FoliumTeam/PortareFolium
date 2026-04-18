// Tiptap 본문 drag-drop / paste 이미지 업로드 + URL paste 처리
// File drop / paste → R2 업로드 후 image node 삽입
// 외부 image URL paste → fetch 후 image node 삽입 (R2 업로드 안 함)
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { uploadImage } from "@/lib/image-upload";

const IMAGE_URL_RE =
    /^(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif|svg))(?:\?[^\s#]*)?(?:#[^\s]*)?$/i;

export type ImageDropPasteOptions = {
    // folderPath getter — slug rename 대응 위해 매 이벤트마다 호출
    getFolderPath?: () => string | undefined;
    // multi-image layout modal 오픈
    onOpenMultiImageLayout?: (files: File[], position: number) => void;
};

// extension 등록 — folderPath는 매 이벤트마다 getter로 최신값 조회
export const ImageDropPaste = Extension.create<ImageDropPasteOptions>({
    name: "imageDropPaste",

    addOptions() {
        return { getFolderPath: undefined, onOpenMultiImageLayout: undefined };
    },

    addProseMirrorPlugins() {
        const ext = this;
        return [
            new Plugin({
                key: new PluginKey("imageDropPaste"),
                props: {
                    handleDOMEvents: {
                        drop: (view, event) => {
                            const dt = event.dataTransfer;
                            if (!dt) return false;
                            const files = Array.from(dt.files).filter((f) =>
                                f.type.startsWith("image/")
                            );
                            if (files.length === 0) return false;
                            event.preventDefault();
                            event.stopPropagation();

                            const coords = view.posAtCoords({
                                left: event.clientX,
                                top: event.clientY,
                            });
                            const startPos =
                                coords?.pos ?? view.state.selection.from;

                            if (files.length > 1) {
                                ext.options.onOpenMultiImageLayout?.(
                                    files,
                                    startPos
                                );
                                return true;
                            }

                            const folderPath = ext.options.getFolderPath?.();

                            void Promise.all(
                                files.map((f) => uploadImage(f, folderPath))
                            )
                                .then((urls) => {
                                    let pos = startPos;
                                    for (const src of urls) {
                                        if (!src) continue;
                                        const node =
                                            view.state.schema.nodes.image.create(
                                                { src }
                                            );
                                        const tr = view.state.tr.insert(
                                            pos,
                                            node
                                        );
                                        view.dispatch(tr);
                                        pos += node.nodeSize;
                                    }
                                })
                                .catch((e) => {
                                    console.error(
                                        "[ImageDropPaste::drop] upload 실패",
                                        e
                                    );
                                });
                            return true;
                        },
                    },
                    handlePaste: (view, event) => {
                        const cb = event.clipboardData;
                        if (!cb) return false;

                        const files = Array.from(cb.files).filter((f) =>
                            f.type.startsWith("image/")
                        );
                        if (files.length > 0) {
                            event.preventDefault();
                            const startPos = view.state.selection.from;

                            if (files.length > 1) {
                                ext.options.onOpenMultiImageLayout?.(
                                    files,
                                    startPos
                                );
                                return true;
                            }

                            const folderPath = ext.options.getFolderPath?.();
                            void Promise.all(
                                files.map((f) => uploadImage(f, folderPath))
                            )
                                .then((urls) => {
                                    let pos = startPos;
                                    for (const src of urls) {
                                        if (!src) continue;
                                        const node =
                                            view.state.schema.nodes.image.create(
                                                {
                                                    src,
                                                }
                                            );
                                        const tr = view.state.tr.insert(
                                            pos,
                                            node
                                        );
                                        view.dispatch(tr);
                                        pos += node.nodeSize;
                                    }
                                })
                                .catch((e) => {
                                    console.error(
                                        "[ImageDropPaste::paste-file] upload 실패",
                                        e
                                    );
                                });
                            return true;
                        }

                        const text = cb.getData("text/plain")?.trim() ?? "";
                        if (text && IMAGE_URL_RE.test(text)) {
                            event.preventDefault();
                            const pos = view.state.selection.from;
                            // 외부 URL 그대로 image node 삽입 (R2 업로드 안 함)
                            const node = view.state.schema.nodes.image.create({
                                src: text,
                            });
                            const tr = view.state.tr.insert(pos, node);
                            view.dispatch(tr);
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

// source mode 텍스트의 bare image URL을 markdown image 문법으로 변환
// source → WYSIWYG 전환 시 호출
// 주의: lead에 `(` 포함 금지 — 이미 ![](url)로 감싸진 URL을 한 번 더 wrap하면 ![](![](url)) 손상 발생
export function bareImageUrlsToMarkdown(text: string): string {
    const repaired = repairDoubleWrappedImages(text);
    return repaired.replace(
        /(^|\s)(https?:\/\/\S+?\.(?:png|jpe?g|gif|webp|avif|svg))(?=[\s)]|$)/gi,
        (_, lead, url) => `${lead}![](${url})`
    );
}

// 과거 버그로 ![](![](url)) 또는 ![](![]\(url\)) 형태로 손상된 콘텐츠 복원
export function repairDoubleWrappedImages(text: string): string {
    return text.replace(
        /!\[\]\(!\[\]\\?\(([^()\\]+)\\?\)\)/g,
        (_, url) => `![](${url})`
    );
}
