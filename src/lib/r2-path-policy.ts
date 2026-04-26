// R2 storage 경로/업로드 검증 policy

// content prefix allowlist
const ALLOWED_PREFIXES = [
    "portfolio/",
    "blog/",
    "books/",
    "about/",
    "resume/",
    "misc/",
] as const;

// 단일 path segment 허용 charset
const SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;

// path 전체 길이 cap
const MAX_KEY_LENGTH = 512;

// 이미지 업로드 size cap (bytes)
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// 허용 이미지 확장자 → MIME
const IMAGE_MIME_BY_EXT: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
};

export class R2PathPolicyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "R2PathPolicyError";
    }
}

// prefix가 allowlist에 매칭되는지
// value === p 분기는 prefix 형식 입력용이며 key path에서는 실제로 도달하지 않는 dead branch
function matchesAllowedPrefix(value: string): boolean {
    return ALLOWED_PREFIXES.some((p) => value === p || value.startsWith(p));
}

// path 공통 검증 (segment / traversal / 길이)
function assertPathShape(value: string, label: string): void {
    if (typeof value !== "string" || value.length === 0) {
        throw new R2PathPolicyError(`${label} 빈 값`);
    }
    if (value.length > MAX_KEY_LENGTH) {
        throw new R2PathPolicyError(`${label} 길이 초과`);
    }
    if (value.startsWith("/") || value.startsWith("\\")) {
        throw new R2PathPolicyError(`${label} leading slash 금지`);
    }
    if (value.includes("\\")) {
        throw new R2PathPolicyError(`${label} backslash 금지`);
    }
    if (value.includes("//")) {
        throw new R2PathPolicyError(`${label} double slash 금지`);
    }
    const segments = value.split("/");
    for (const seg of segments) {
        if (seg === "" || seg === "." || seg === "..") {
            throw new R2PathPolicyError(`${label} traversal 또는 빈 segment`);
        }
        if (!SEGMENT_PATTERN.test(seg)) {
            throw new R2PathPolicyError(`${label} 잘못된 문자 포함`);
        }
    }
}

// R2 prefix 검증 (list/move/delete folder)
export function assertSafeR2Prefix(value: string, label = "prefix"): void {
    assertPathShape(value, label);
    const normalized = value.endsWith("/") ? value : `${value}/`;
    if (!matchesAllowedPrefix(normalized)) {
        throw new R2PathPolicyError(`${label} 허용된 prefix가 아님`);
    }
}

// R2 key 검증 (upload / delete-keys)
export function assertSafeR2Key(value: string, label = "key"): void {
    assertPathShape(value, label);
    if (!matchesAllowedPrefix(value)) {
        throw new R2PathPolicyError(`${label} 허용된 prefix 외부`);
    }
    const lastSegment = value.split("/").pop() ?? "";
    if (!lastSegment.includes(".")) {
        throw new R2PathPolicyError(`${label} 확장자 없음`);
    }
}

// 파일명에서 이미지 확장자 추출 (소문자)
export function getImageExtension(filename: string): string | null {
    const lower = filename.toLowerCase();
    const dot = lower.lastIndexOf(".");
    if (dot < 0 || dot === lower.length - 1) return null;
    const ext = lower.slice(dot + 1);
    return ext in IMAGE_MIME_BY_EXT ? ext : null;
}

// 확장자에 매핑된 ContentType 반환
export function resolveImageContentType(filename: string): string | null {
    const ext = getImageExtension(filename);
    return ext ? IMAGE_MIME_BY_EXT[ext] : null;
}
