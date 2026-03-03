/**
 * ImageUploader
 *
 * 블로그/포트폴리오 본문에 이미지 삽입.
 * - 파일 업로드: WebP 변환 후 Supabase Storage 저장
 * - URL 입력: URL 그대로 사용 또는 fetch 후 WebP 변환 업로드 (CORS 허용 시)
 */
import { useState, useCallback } from "react";
import { browserClient } from "@/lib/supabase";

const BUCKET = "images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type Mode = "upload" | "url";

/** 이미지 파일/Blob/URL → WebP Blob 변환 */
async function toWebPBlob(
    source: File | Blob | string,
    quality = 0.85
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        let objectUrl: string | null = null;

        const cleanup = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                cleanup();
                reject(new Error("Canvas context unavailable"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    cleanup();
                    if (blob) resolve(blob);
                    else reject(new Error("WebP 변환 실패"));
                },
                "image/webp",
                quality
            );
        };
        img.onerror = () => {
            cleanup();
            reject(new Error("이미지를 불러올 수 없습니다 (CORS 등)"));
        };

        if (typeof source === "string") {
            img.src = source;
        } else {
            objectUrl = URL.createObjectURL(source);
            img.src = objectUrl;
        }
    });
}

/** 고유 파일 경로 생성 */
function getStoragePath(folderPath?: string): string {
    const uuid = crypto.randomUUID();
    if (folderPath) return `${folderPath}/${uuid}.webp`;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `misc/${y}/${m}/${uuid}.webp`;
}

interface ImageUploaderProps {
    onInsert: (markdown: string) => void;
    onClose: () => void;
    folderPath?: string;
}

export default function ImageUploader({
    onInsert,
    onClose,
    folderPath,
}: ImageUploaderProps) {
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/")) {
            setError("이미지 파일만 업로드 가능합니다.");
            return;
        }
        if (f.size > MAX_SIZE) {
            setError("파일 크기는 5MB 이하여야 합니다.");
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
            if (f.size > MAX_SIZE) setError("파일 크기는 5MB 이하여야 합니다.");
            else {
                setError(null);
                setFile(f);
                setPreview(URL.createObjectURL(f));
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleUrlChange = async () => {
        const url = urlInput.trim();
        if (!url) return;
        setError(null);

        // URL 유효성
        try {
            new URL(url);
        } catch {
            setError("올바른 URL을 입력해 주세요.");
            return;
        }

        setUploading(true);
        try {
            // CORS 허용 시: fetch → WebP 변환 → Supabase 업로드
            const converted = await toWebPBlob(url);
            const path = getStoragePath(folderPath);

            if (!browserClient) {
                // Supabase 미설정 시 URL 그대로 삽입
                const md = altInput.trim()
                    ? `![${altInput}](${url})`
                    : `![](${url})`;
                onInsert(md);
                onClose();
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

            const md = altInput.trim()
                ? `![${altInput}](${publicUrl})`
                : `![](${publicUrl})`;
            onInsert(md);
            onClose();
        } catch (err) {
            // CORS 실패 등 → URL 그대로 사용
            const md = altInput.trim()
                ? `![${altInput}](${url})`
                : `![](${url})`;
            onInsert(md);
            onClose();
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        try {
            let blob: Blob;
            if (file.type === "image/webp") {
                blob = file;
            } else {
                blob = await toWebPBlob(file);
            }

            const path = getStoragePath(folderPath);

            if (!browserClient) {
                setError("Supabase가 설정되지 않았습니다.");
                setUploading(false);
                return;
            }

            const { error: uploadErr } = await browserClient.storage
                .from(BUCKET)
                .upload(path, blob, {
                    contentType: "image/webp",
                    upsert: false,
                });

            if (uploadErr) throw uploadErr;

            const {
                data: { publicUrl },
            } = browserClient.storage.from(BUCKET).getPublicUrl(path);

            const md = altInput.trim()
                ? `![${altInput}](${publicUrl})`
                : `![](${publicUrl})`;
            onInsert(md);
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "업로드에 실패했습니다."
            );
        } finally {
            setUploading(false);
        }
    };

    const handleInsertUrlAsIs = () => {
        const url = urlInput.trim();
        if (!url) return;
        try {
            new URL(url);
        } catch {
            setError("올바른 URL을 입력해 주세요.");
            return;
        }
        const md = altInput.trim() ? `![${altInput}](${url})` : `![](${url})`;
        onInsert(md);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="mx-4 w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-surface) p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-4 text-xl font-semibold text-(--color-foreground)">
                    이미지 삽입
                </h3>

                {/* 탭: 업로드 / URL */}
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

                {/* Alt 텍스트 (공통) */}
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
                    <>
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
                                id="image-upload-input"
                            />
                            <label
                                htmlFor="image-upload-input"
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
                    </>
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
                            Supabase 업로드 시도 후, 실패하면 URL 그대로 사용
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mb-4 text-base text-red-500">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
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
                                onClick={handleUrlChange}
                                disabled={!urlInput.trim() || uploading}
                                className="rounded-lg bg-(--color-accent) px-4 py-2 text-base font-medium text-(--color-on-accent) disabled:opacity-50"
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
