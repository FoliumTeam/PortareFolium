type ImageGroupLayout = "stack" | "slider";

type ImageGroupProps = {
    layout?: string;
    images?: string | string[];
};

// ImageGroup images 파싱
function parseImages(images: string | string[] | undefined): string[] {
    if (Array.isArray(images)) {
        return images.filter(
            (image): image is string =>
                typeof image === "string" && image.trim().length > 0
        );
    }

    if (!images) return [];

    try {
        const parsed = JSON.parse(images) as unknown;
        return Array.isArray(parsed)
            ? parsed.filter(
                  (image): image is string =>
                      typeof image === "string" && image.trim().length > 0
              )
            : [];
    } catch {
        return [];
    }
}

// ImageGroup layout 정규화
function normalizeLayout(layout?: string): ImageGroupLayout {
    if (layout === "slider") return layout;
    return "stack";
}

// ImageGroup 공용 렌더
export default function ImageGroup({ layout, images }: ImageGroupProps) {
    const resolvedLayout = normalizeLayout(layout);
    const urls = parseImages(images);

    if (urls.length === 0) return null;

    if (resolvedLayout === "slider") {
        return (
            <div
                className="my-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                data-image-group-layout="slider"
            >
                {urls.map((src, index) => (
                    <img
                        key={`${src}-${index}`}
                        src={src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-[78%] max-w-none snap-center rounded"
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className="my-6 flex flex-col gap-4"
            data-image-group-layout="stack"
        >
            {urls.map((src, index) => (
                <img
                    key={`${src}-${index}`}
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-auto max-w-full rounded"
                />
            ))}
        </div>
    );
}

export type { ImageGroupLayout, ImageGroupProps };
