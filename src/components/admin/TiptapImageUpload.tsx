"use client";

// Tiptap 에디터 전용 이미지 업로드 모달
// 파일 업로드 (drag & drop + file picker) 및 URL 입력 지원
import { useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { browserClient } from "@/lib/supabase";
import { toWebPBlob, getStoragePath } from "@/lib/image-upload";

const BUCKET = "images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type Mode = "upload" | "url";

interface TiptapImageUploadProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
    folderPath?: string;
}

export default function TiptapImageUpload({
    editor,
    isOpen,
    onClose,
    folderPath,
}: TiptapImageUploadProps) {
    const [mode, setMode] = useState<Mode>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [urlInput, setUrlInput] = useState("");
    const [altInput, setAltInput] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setFile(null);
        setUrlInput("");
        setError(null);
    }, []);

    const handleClose = useCallback(() => {
        reset();
        setAltInput("");
        onClose();
    }, [reset, onClose]);

    // 에디터에 이미지 삽입
    const insertImage = useCallback(
        (src: string, alt: string) => {
            if (!editor) return;
            editor.chain().focus().setImage({ src, alt }).run();
        },
        [editor]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/")) {
            setError("이미지 파일만 업로드 가능");
            return;
        }
        if (f.size > MAX_SIZE) {
            setError("파일 크기는 5MB 이하");
            return;
        }
        setError(null);
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) {
            if (f.size > MAX_SIZE) {
                setError("파일 크기는 5MB 이하");
            } else {
                setError(null);
                setFile(f);
                setPreview(URL.createObjectURL(f));
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    // 파일 업로드 → Supabase → 에디터 삽입
    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        try {
            const isGif =
                file.type === "image/gif" ||
                file.name.toLowerCase().endsWith(".gif");
            const blob =
                file.type === "image/webp" || isGif
                    ? file
                    : await toWebPBlob(file);
            const ext = isGif ? "gif" : "webp";
            const path = getStoragePath(folderPath, ext);

            if (!browserClient) {
                setError("Supabase가 설정되지 않음");
                return;
            }

            const { error: uploadErr } = await browserClient.storage
                .from(BUCKET)
                .upload(path, blob, {
                    contentType: isGif ? "image/gif" : "image/webp",
                    upsert: false,
                });

            if (uploadErr) throw uploadErr;

            const {
                data: { publicUrl },
            } = browserClient.storage.from(BUCKET).getPublicUrl(path);

            insertImage(publicUrl, altInput.trim());
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "업로드 실패");
        } finally {
            setUploading(false);
        }
    };

    // URL → WebP 변환 업로드 시도, 실패 시 URL 그대로 삽입
    const handleUrlUpload = async () => {
        const url = urlInput.trim();
        if (!url) return;

        try {
            new URL(url);
        } catch {
            setError("올바른 URL 입력 필요");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // URL에서 fetch → WebP 변환 → Supabase 업로드
            const res = await fetch(url);
            const blob = await res.blob();
            const converted = await toWebPBlob(blob);
            const path = getStoragePath(folderPath);

            if (!browserClient) {
                // Supabase 미설정 → URL 그대로 삽입
                insertImage(url, altInput.trim());
                handleClose();
                return;
            }

            const { error: uploadErr } = await browserClient.storage
                .from(BUCKET)
                .upload(path, converted, {
                    contentType: "image/webp",
                    upsert: false,
                });

            if (uploadErr) throw uploadErr;

            const {
                data: { publicUrl },
            } = browserClient.storage.from(BUCKET).getPublicUrl(path);

            insertImage(publicUrl, altInput.trim());
            handleClose();
        } catch {
            // 변환/업로드 실패 → URL 그대로 삽입
            insertImage(url, altInput.trim());
            handleClose();
        } finally {
            setUploading(false);
        }
    };

    // URL 그대로 삽입 (변환 없이)
    const handleInsertUrlAsIs = () => {
        const url = urlInput.trim();
        if (!url) return;
        try {
            new URL(url);
        } catch {
            setError("올바른 URL 입력 필요");
            return;
        }
        insertImage(url, altInput.trim());
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div
            // z-[110]: fullscreen 에디터 z-[100] (RichMarkdownEditor) 위에 렌더링
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"
            onClick={handleClose}
        >
            <div
                className="tablet:mx-4 tablet:max-w-md mx-2 w-full rounded-xl border border-(--color-border) bg-(--color-surface) p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-4 text-xl font-semibold text-(--color-foreground)">
                    이미지 삽입
                </h3>

                {/* 탭 전환 */}
                <div className="mb-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("upload");
                            reset();
                        }}
                        className={`rounded-lg px-3 py-1.5 text-base font-medium transition-colors ${
                            mode === "upload"
                                ? "bg-(--color-accent) text-(--color-on-accent)"
                                : "border border-(--color-border) text-(--color-muted) hover:bg-(--color-surface-subtle)"
                        }`}
                    >
                        파일 업로드
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("url");
                            reset();
                        }}
                        className={`rounded-lg px-3 py-1.5 text-base font-medium transition-colors ${
                            mode === "url"
                                ? "bg-(--color-accent) text-(--color-on-accent)"
                                : "border border-(--color-border) text-(--color-muted) hover:bg-(--color-surface-subtle)"
                        }`}
                    >
                        URL 입력
                    </button>
                </div>

                {/* Alt 텍스트 */}
                <div className="mb-4">
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        대체 텍스트 (선택)
                    </label>
                    <input
                        type="text"
                        value={altInput}
                        onChange={(e) => setAltInput(e.target.value)}
                        placeholder="이미지 설명"
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-base text-(--color-foreground)"
                    />
                </div>

                {mode === "upload" ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="mb-4 rounded-lg border-2 border-dashed border-(--color-border) p-8 text-center transition-colors hover:border-(--color-accent)/50"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="tiptap-image-upload-input"
                        />
                        <label
                            htmlFor="tiptap-image-upload-input"
                            className="block cursor-pointer"
                        >
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="미리보기"
                                    className="mx-auto max-h-48 rounded"
                                />
                            ) : (
                                <span className="text-base text-(--color-muted)">
                                    클릭하거나 이미지를 끌어다 놓으세요
                                    <br />
                                    (최대 5MB, WebP로 변환 저장)
                                </span>
                            )}
                        </label>
                    </div>
                ) : (
                    <div className="mb-4">
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            이미지 URL
                        </label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-base text-(--color-foreground)"
                        />
                        <p className="mt-1 text-sm text-(--color-muted)">
                            Supabase 업로드 시도 후, 실패하면 URL 그대로 삽입
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mb-4 text-base text-red-500">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg border border-(--color-border) px-4 py-2 text-base text-(--color-muted) hover:bg-(--color-surface-subtle)"
                    >
                        취소
                    </button>
                    {mode === "upload" ? (
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-medium text-(--color-on-accent) disabled:opacity-50"
                        >
                            {uploading ? "업로드 중..." : "삽입"}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleInsertUrlAsIs}
                                disabled={!urlInput.trim()}
                                className="rounded-lg border border-(--color-border) px-4 py-2 text-base text-(--color-foreground) hover:bg-(--color-surface-subtle) disabled:opacity-50"
                            >
                                URL 그대로
                            </button>
                            <button
                                type="button"
                                onClick={handleUrlUpload}
                                disabled={!urlInput.trim() || uploading}
                                className="rounded-lg bg-green-500 px-4 py-2 text-base font-medium text-white transition-colors hover:bg-green-400 disabled:opacity-50 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                            >
                                {uploading ? "업로드 중..." : "Supabase에 저장"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
