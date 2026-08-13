// 마크다운 본문 img 요소 대체 — 서버 renderToString 호환, 지연 로딩 적용
// next/image는 "use client" 경계로 인해 renderToString 컨텍스트에서 사용 불가
export default function MarkdownImage({
    src,
    alt,
    caption,
    sourceUrl,
    sourceLabel,
}: {
    src?: string;
    alt?: string;
    caption?: string;
    sourceUrl?: string;
    sourceLabel?: string;
}) {
    if (!src) return null;
    return (
        <figure className="my-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                className="h-auto max-w-full rounded"
            />
            {(caption || sourceUrl) && (
                <figcaption className="mt-2 text-center text-sm leading-relaxed text-(--color-muted)">
                    {caption}
                    {sourceUrl && (
                        <a
                            href={sourceUrl}
                            className="ml-1 underline-offset-4 hover:underline"
                        >
                            {sourceLabel ?? "출처"}
                        </a>
                    )}
                </figcaption>
            )}
        </figure>
    );
}
