// 이미지 업로드 유틸: WebP 변환 + Cloudflare R2
import { browserClient } from "@/lib/supabase";

// Supabase 세션 토큰 (API route 인증용)
async function getAccessToken(): Promise<string> {
    if (!browserClient) throw new Error("Supabase가 설정되지 않았습니다.");
    const { data } = await browserClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("인증 세션 없음");
    return token;
}

// 이미지 파일/Blob → WebP Blob 변환
export async function toWebPBlob(
    source: File | Blob,
    quality = 0.85,
    maxEdge?: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl: string | null = URL.createObjectURL(source);

        const cleanup = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const scale =
                maxEdge && Math.max(width, height) > maxEdge
                    ? maxEdge / Math.max(width, height)
                    : 1;
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                cleanup();
                reject(new Error("Canvas context unavailable"));
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

// 고유 파일 경로 생성
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

// sidecar path 생성
export function getSidecarPath(
    path: string,
    suffix: "poster" | "thumb"
): string {
    return path.replace(/\.[^./]+$/, `.${suffix}.webp`);
}

// R2 업로드 요청
async function uploadBlobToPath(
    blob: Blob,
    path: string,
    token: string
): Promise<string> {
    const formData = new FormData();
    formData.append("file", blob, path.split("/").pop() ?? "upload.webp");
    formData.append("path", path);

    const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "업로드 실패");
    }

    const { url } = await res.json();
    return url;
}

// R2에 이미지 업로드, public URL 반환
export async function uploadImage(
    file: File,
    folderPath?: string
): Promise<string> {
    const isGif =
        file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    const blob =
        file.type === "image/webp" || isGif ? file : await toWebPBlob(file);
    const ext = isGif ? "gif" : "webp";
    const path = getStoragePath(folderPath, ext);

    const token = await getAccessToken();
    const url = await uploadBlobToPath(blob, path, token);

    const sidecarJobs: Promise<unknown>[] = [];
    sidecarJobs.push(
        toWebPBlob(file, 0.75, 256).then((thumbBlob) =>
            uploadBlobToPath(thumbBlob, getSidecarPath(path, "thumb"), token)
        )
    );

    if (isGif) {
        sidecarJobs.push(
            toWebPBlob(file, 0.8).then((posterBlob) =>
                uploadBlobToPath(
                    posterBlob,
                    getSidecarPath(path, "poster"),
                    token
                )
            )
        );
    }

    const results = await Promise.allSettled(sidecarJobs);
    results.forEach((result) => {
        if (result.status === "rejected") {
            console.error(
                "[image-upload::uploadImage] sidecar 업로드 실패",
                result.reason
            );
        }
    });

    return url;
}

// R2 폴더 내 파일 목록 조회
export async function listStorageFiles(folder: string): Promise<string[]> {
    const token = await getAccessToken();
    const res = await fetch("/api/storage-ops", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "list", prefix: folder }),
    });
    if (!res.ok) return [];
    const { files } = await res.json();
    return files ?? [];
}

// R2 폴더 전체 이동 (old → new)
export async function moveStorageFolder(
    oldFolder: string,
    newFolder: string
): Promise<void> {
    const token = await getAccessToken();
    await fetch("/api/storage-ops", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            action: "move",
            oldPrefix: oldFolder,
            newPrefix: newFolder,
        }),
    });
}

// R2 폴더 전체 삭제
export async function deleteStorageFolder(folder: string): Promise<void> {
    const token = await getAccessToken();
    await fetch("/api/storage-ops", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete", prefix: folder }),
    });
}

// R2 특정 key 목록 삭제
export async function deleteStorageKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const token = await getAccessToken();
    await fetch("/api/storage-ops", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete-keys", keys }),
    });
}

// 콘텐츠 내 이미지 URL 폴더 경로 치환
export function replaceImageUrls(
    content: string,
    oldFolder: string,
    newFolder: string
): string {
    // R2 URL: ...r2.dev/blog/old-slug/uuid.webp → ...r2.dev/blog/new-slug/uuid.webp
    // Supabase URL 잔존 대비: .../images/blog/old-slug/... → .../images/blog/new-slug/...
    return content.replaceAll(`/${oldFolder}/`, `/${newFolder}/`);
}

// TODO: 이미지 중복 처리
// 동일 이미지를 여러 포스트에서 업로드할 때 기존 이미지를 재사용하는 기능
// 접근 방식: 파일 해시(SHA-256) 기반 중복 검출 + 메타데이터 테이블 (hash → path 매핑)
// 삭제 시 참조 카운트 관리 필요 (다른 포스트가 참조 중이면 삭제 불가)
// 현재 규모에서 ROI가 낮아 보류
