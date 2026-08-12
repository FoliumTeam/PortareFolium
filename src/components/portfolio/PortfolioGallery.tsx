import { ExternalLink } from "lucide-react";
import type { PortfolioMedia } from "@/types/portfolio";

type PortfolioGalleryProps = {
    media: PortfolioMedia[];
    heading?: string;
};

export default function PortfolioGallery({
    media,
    heading = "대표 이미지",
}: PortfolioGalleryProps) {
    if (media.length === 0) return null;

    return (
        <section
            className="portfolio-gallery"
            aria-labelledby="portfolio-gallery-heading"
            data-pdf-block
        >
            <h2
                id="portfolio-gallery-heading"
                className="mb-5 text-2xl font-(--font-display) font-black text-(--color-foreground)"
            >
                {heading}
            </h2>
            <div className="tablet:grid-cols-2 grid min-w-0 grid-cols-1 gap-5">
                {media.map((item) => (
                    <figure
                        key={`${item.type}-${item.src}`}
                        className="min-w-0 overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-subtle)"
                        data-pdf-block-item
                    >
                        <div className="aspect-video overflow-hidden bg-(--color-border)">
                            {item.type === "image" ? (
                                <img
                                    src={item.src}
                                    alt={item.alt}
                                    width={960}
                                    height={540}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <>
                                    <video
                                        controls
                                        preload="metadata"
                                        poster={item.poster}
                                        aria-label={item.alt}
                                        className="h-full w-full bg-black object-contain print:hidden"
                                    >
                                        <source src={item.src} />
                                    </video>
                                    <img
                                        src={item.poster}
                                        alt={item.alt}
                                        width={960}
                                        height={540}
                                        className="hidden h-full w-full object-cover print:block"
                                    />
                                </>
                            )}
                        </div>
                        <figcaption className="p-4 text-sm leading-relaxed text-(--color-muted)">
                            {item.caption || item.alt}
                            {item.type === "video" && (
                                <a
                                    href={item.src}
                                    className="mt-2 flex w-fit items-center gap-1 font-semibold text-(--color-accent) underline-offset-4 hover:underline"
                                >
                                    영상 원본
                                    <ExternalLink
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                </a>
                            )}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
}
