/**
 * 이미지 업로드 유틸: WebP 변환 + Supabase Storage
 * MDXEditor imageUploadHandler 및 ImageUploader에서 공유
 */
import { browserClient } from "@/lib/supabase";

const BUCKET = "images";

/** 이미지 파일/Blob → WebP Blob 변환 */
export async function toWebPBlob(
    source: File | Blob,
    quality = 0.85
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl: string | null = URL.createObjectURL(source);

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
            reject(new Error("이미지를 불러올 수 없습니다"));
        };
        img.src = objectUrl;
    });
}

/** 고유 파일 경로 생성 */
export function getStoragePath(
    folderPath?: string,
    ext: string = "webp"
): string {
    const uuid = crypto.randomUUID();
    if (folderPath) {
        return `${folderPath}/${uuid}.${ext}`;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `misc/${y}/${m}/${uuid}.${ext}`;
}

/** Supabase Storage에 업로드, public URL 반환 */
export async function uploadImageToSupabase(
    file: File,
    folderPath?: string
): Promise<string> {
    const isGif =
        file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    const blob =
        file.type === "image/webp" || isGif ? file : await toWebPBlob(file);
    const ext = isGif ? "gif" : "webp";
    const path = getStoragePath(folderPath, ext);

    if (!browserClient) throw new Error("Supabase가 설정되지 않았습니다.");

    const { error } = await browserClient.storage
        .from(BUCKET)
        .upload(path, blob, {
            contentType: isGif ? "image/gif" : "image/webp",
            upsert: false,
        });

    if (error) throw error;

    const {
        data: { publicUrl },
    } = browserClient.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
}
