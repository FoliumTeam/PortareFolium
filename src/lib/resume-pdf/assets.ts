import type { ResumePdfModel } from "@/types/resume-pdf";

// 사진·썸네일 준비 (R1·F20): R2 공개 주소 아래 파일만 저장소에서 직접 읽어 축소 → data URI
// 임의 주소로 요청하지 않음 (SSRF 차단). 그 밖의 그림은 생략

export type ReadR2 = (
    key: string
) => Promise<{ bytes: Uint8Array; mimeType: string } | null>;

const MAX_BYTES = 10 * 1024 * 1024;

// 모델에 쓰인 그림 주소 (중복 제거)
export const collectImageUrls = (m: ResumePdfModel): string[] => [
    ...new Set(
        [
            m.basics.image,
            ...Object.values(m.projects)
                .flat()
                .map((p) => p.thumb),
        ].filter((u): u is string => Boolean(u))
    ),
];

// R2 공개 주소 → 저장소 key. 다른 origin·경로 이탈은 null
export const r2KeyFromUrl = (url: string, publicUrl: string): string | null => {
    if (!publicUrl) return null;
    try {
        const source = new URL(url);
        const base = new URL(
            publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`
        );
        if (
            source.origin !== base.origin ||
            !source.pathname.startsWith(base.pathname)
        )
            return null;
        const key = decodeURIComponent(
            source.pathname.slice(base.pathname.length)
        );
        if (!key || key.includes("..") || key.startsWith("/")) return null;
        return key;
    } catch {
        return null;
    }
};

// 그림 주소 → data URI 표. 실패·대상 밖은 표에 없음 (생략)
export const loadImages = async (
    urls: string[],
    publicUrl: string,
    readR2: ReadR2
): Promise<{ images: Map<string, string>; skipped: string[] }> => {
    const { default: sharp } = await import("sharp");
    const images = new Map<string, string>();
    const skipped: string[] = [];
    await Promise.all(
        urls.map(async (url) => {
            const key = r2KeyFromUrl(url, publicUrl);
            if (!key) return void skipped.push(url);
            try {
                const file = await readR2(key);
                if (
                    !file ||
                    file.bytes.byteLength > MAX_BYTES ||
                    !file.mimeType.startsWith("image/")
                )
                    return void skipped.push(url);
                const out = await sharp(file.bytes, {
                    limitInputPixels: 40_000_000,
                })
                    .rotate()
                    .resize({
                        width: 800,
                        height: 800,
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .flatten({ background: "#ffffff" })
                    .jpeg({ quality: 82 })
                    .toBuffer();
                images.set(
                    url,
                    `data:image/jpeg;base64,${out.toString("base64")}`
                );
            } catch {
                skipped.push(url);
            }
        })
    );
    return { images, skipped };
};
