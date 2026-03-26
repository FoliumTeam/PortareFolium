// 마크다운 본문 img 요소 대체 — 서버 renderToString 호환, 지연 로딩 적용
// next/image는 "use client" 경계로 인해 renderToString 컨텍스트에서 사용 불가
export default function MarkdownImage({
    src,
    alt,
}: {
    src?: string;
    alt?: string;
}) {
    if (!src) return null;
    return (
        <span className="my-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                className="h-auto max-w-full rounded"
            />
        </span>
    );
}
