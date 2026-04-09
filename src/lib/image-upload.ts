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

// 폴더 내 파일 목록 조회
export async function listStorageFiles(folder: string): Promise<string[]> {
    if (!browserClient) return [];
    const { data, error } = await browserClient.storage
        .from(BUCKET)
        .list(folder);
    if (error) {
        console.error("[image-upload::listStorageFiles]", error.message);
        return [];
    }
    if (!data) return [];
    return data
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => `${folder}/${f.name}`);
}

// 폴더 전체 이동 (old → new)
export async function moveStorageFolder(
    oldFolder: string,
    newFolder: string
): Promise<void> {
    if (!browserClient) return;
    const files = await listStorageFiles(oldFolder);
    if (files.length === 0) return;
    for (const filePath of files) {
        const fileName = filePath.split("/").pop()!;
        const { error } = await browserClient.storage
            .from(BUCKET)
            .move(filePath, `${newFolder}/${fileName}`);
        if (error) {
            console.error(
                "[image-upload::moveStorageFolder]",
                filePath,
                error.message
            );
        }
    }
}

// 폴더 전체 삭제
export async function deleteStorageFolder(folder: string): Promise<void> {
    if (!browserClient) return;
    const files = await listStorageFiles(folder);
    if (files.length === 0) return;
    const { error } = await browserClient.storage.from(BUCKET).remove(files);
    if (error) {
        console.error("[image-upload::deleteStorageFolder]", error.message);
    }
}

// 콘텐츠 내 이미지 URL 폴더 경로 치환
export function replaceImageUrls(
    content: string,
    oldFolder: string,
    newFolder: string
): string {
    return content.replaceAll(`/images/${oldFolder}/`, `/images/${newFolder}/`);
}

// TODO: 이미지 중복 처리
// 동일 이미지를 여러 포스트에서 업로드할 때 기존 이미지를 재사용하는 기능
// 접근 방식: 파일 해시(SHA-256) 기반 중복 검출 + 메타데이터 테이블 (hash → path 매핑)
// 삭제 시 참조 카운트 관리 필요 (다른 포스트가 참조 중이면 삭제 불가)
// 현재 규모에서 ROI가 낮아 보류
