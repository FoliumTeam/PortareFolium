import type { CropRect, VideoGifDefaults } from "@/lib/video-gif/types";

export const VIDEO_GIF_LOCAL_STORAGE_KEY = "portare-folium.video-gif.defaults";

export const VIDEO_GIF_LIMITS = {
    minFps: 1,
    maxFps: 24,
    defaultFps: 10,
    minPlaybackSpeed: 0.25,
    maxPlaybackSpeed: 4,
    defaultPlaybackSpeed: 1,
    minCompressionRate: 0,
    maxCompressionRate: 100,
    defaultCompressionRate: 30,
    minOutputScale: 25,
    maxOutputScale: 100,
    defaultOutputScale: 100,
    minOutputEdge: 16,
    maxOutputEdge: 1280,
    defaultOutputWidth: 480,
    defaultOutputHeight: 270,
    maxRecommendedFrames: 240,
    maxRecommendedMegapixels: 75,
} as const;

export const DEFAULT_VIDEO_GIF_DEFAULTS: VideoGifDefaults = {
    fps: VIDEO_GIF_LIMITS.defaultFps,
    playbackSpeed: VIDEO_GIF_LIMITS.defaultPlaybackSpeed,
    compressionRate: VIDEO_GIF_LIMITS.defaultCompressionRate,
    outputScale: VIDEO_GIF_LIMITS.defaultOutputScale,
    outputWidth: VIDEO_GIF_LIMITS.defaultOutputWidth,
    outputHeight: VIDEO_GIF_LIMITS.defaultOutputHeight,
    preserveAspectRatio: true,
    sampleEstimate: false,
};

export function clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

export function roundInt(value: number): number {
    return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export function sanitizeCompressionRate(value: unknown): number {
    if (value === "quality") return 0;
    if (value === "balanced") return 30;
    if (value === "size") return 65;
    return Math.round(
        clampNumber(
            Number(value ?? DEFAULT_VIDEO_GIF_DEFAULTS.compressionRate),
            VIDEO_GIF_LIMITS.minCompressionRate,
            VIDEO_GIF_LIMITS.maxCompressionRate
        )
    );
}

export function sanitizeVideoGifDefaults(
    value: Partial<VideoGifDefaults> | unknown
): VideoGifDefaults {
    const input =
        value && typeof value === "object"
            ? (value as Partial<VideoGifDefaults>)
            : {};

    return {
        fps: Math.round(
            clampNumber(
                Number(input.fps ?? DEFAULT_VIDEO_GIF_DEFAULTS.fps),
                VIDEO_GIF_LIMITS.minFps,
                VIDEO_GIF_LIMITS.maxFps
            )
        ),
        playbackSpeed: Number(
            clampNumber(
                Number(
                    input.playbackSpeed ??
                        DEFAULT_VIDEO_GIF_DEFAULTS.playbackSpeed
                ),
                VIDEO_GIF_LIMITS.minPlaybackSpeed,
                VIDEO_GIF_LIMITS.maxPlaybackSpeed
            ).toFixed(2)
        ),
        compressionRate: sanitizeCompressionRate(
            input.compressionRate ??
                (
                    input as Partial<VideoGifDefaults> & {
                        optimizationMode?: unknown;
                    }
                ).optimizationMode
        ),
        outputScale: Math.round(
            clampNumber(
                Number(
                    input.outputScale ?? DEFAULT_VIDEO_GIF_DEFAULTS.outputScale
                ),
                VIDEO_GIF_LIMITS.minOutputScale,
                VIDEO_GIF_LIMITS.maxOutputScale
            )
        ),
        outputWidth: Math.round(
            clampNumber(
                Number(
                    input.outputWidth ?? DEFAULT_VIDEO_GIF_DEFAULTS.outputWidth
                ),
                VIDEO_GIF_LIMITS.minOutputEdge,
                VIDEO_GIF_LIMITS.maxOutputEdge
            )
        ),
        outputHeight: Math.round(
            clampNumber(
                Number(
                    input.outputHeight ??
                        DEFAULT_VIDEO_GIF_DEFAULTS.outputHeight
                ),
                VIDEO_GIF_LIMITS.minOutputEdge,
                VIDEO_GIF_LIMITS.maxOutputEdge
            )
        ),
        preserveAspectRatio:
            typeof input.preserveAspectRatio === "boolean"
                ? input.preserveAspectRatio
                : DEFAULT_VIDEO_GIF_DEFAULTS.preserveAspectRatio,
        sampleEstimate:
            typeof input.sampleEstimate === "boolean"
                ? input.sampleEstimate
                : DEFAULT_VIDEO_GIF_DEFAULTS.sampleEstimate,
    };
}

export function fullFrameCrop(width: number, height: number): CropRect {
    return {
        x: 0,
        y: 0,
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
    };
}
