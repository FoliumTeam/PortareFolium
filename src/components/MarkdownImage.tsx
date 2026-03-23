import Image from "next/image";

// 마크다운 본문 img 요소 대체 — next/image WebP 변환 + 지연 로딩
export default function MarkdownImage({
    src,
    alt,
}: {
    src?: string;
    alt?: string;
}) {
    // http(s) URL이 아니면 일반 img로 fallback
    if (!src || !src.startsWith("http")) {
        // eslint-disable-next-line @next/next/no-img-element
        return (
            <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
        );
    }
    return (
        <span
            className="relative my-4 block w-full"
            style={{ aspectRatio: "16/9" }}
        >
            <Image
                src={src}
                alt={alt ?? ""}
                fill
                unoptimized
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 768px"
            />
        </span>
    );
}
