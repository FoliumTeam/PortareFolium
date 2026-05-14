import {
    clampNumber,
    roundInt,
    VIDEO_GIF_LIMITS,
} from "@/lib/video-gif/defaults";
import type {
    CropRect,
    GifEstimate,
    VideoGifDefaults,
    VideoGifSettings,
} from "@/lib/video-gif/types";

export function normalizeCropRect(
    crop: CropRect,
    sourceWidth: number,
    sourceHeight: number
): CropRect {
    const maxWidth = Math.max(1, roundInt(sourceWidth));
    const maxHeight = Math.max(1, roundInt(sourceHeight));
    const width = Math.max(1, Math.min(roundInt(crop.width), maxWidth));
    const height = Math.max(1, Math.min(roundInt(crop.height), maxHeight));
    const x = Math.round(clampNumber(crop.x, 0, maxWidth - width));
    const y = Math.round(clampNumber(crop.y, 0, maxHeight - height));

    return { x, y, width, height };
}

export function clampTrimRange(
    start: number,
    end: number,
    duration: number
): { trimStart: number; trimEnd: number } {
    const safeDuration = Math.max(
        0.01,
        Number.isFinite(duration) ? duration : 0
    );
    const trimStart = clampNumber(start, 0, Math.max(0, safeDuration - 0.01));
    const trimEnd = clampNumber(
        end,
        Math.min(safeDuration, trimStart + 0.01),
        safeDuration
    );
    return {
        trimStart: Number(trimStart.toFixed(3)),
        trimEnd: Number(trimEnd.toFixed(3)),
    };
}

export function clampOutputSizeToSource(
    settings: Pick<
        VideoGifDefaults,
        "outputScale" | "outputWidth" | "outputHeight" | "preserveAspectRatio"
    >,
    crop: CropRect
): { outputWidth: number; outputHeight: number } {
    const maxWidth = Math.max(1, Math.round(crop.width));
    const maxHeight = Math.max(1, Math.round(crop.height));
    const outputScale =
        clampNumber(
            settings.outputScale,
            VIDEO_GIF_LIMITS.minOutputScale,
            VIDEO_GIF_LIMITS.maxOutputScale
        ) / 100;
    if (Number.isFinite(outputScale)) {
        return {
            outputWidth: Math.max(1, Math.round(maxWidth * outputScale)),
            outputHeight: Math.max(1, Math.round(maxHeight * outputScale)),
        };
    }

    let outputWidth = Math.round(
        clampNumber(
            settings.outputWidth,
            VIDEO_GIF_LIMITS.minOutputEdge,
            Math.min(VIDEO_GIF_LIMITS.maxOutputEdge, maxWidth)
        )
    );
    let outputHeight = Math.round(
        clampNumber(
            settings.outputHeight,
            VIDEO_GIF_LIMITS.minOutputEdge,
            Math.min(VIDEO_GIF_LIMITS.maxOutputEdge, maxHeight)
        )
    );

    if (settings.preserveAspectRatio) {
        const cropRatio = maxWidth / maxHeight;
        outputHeight = Math.round(outputWidth / cropRatio);
        if (outputHeight > maxHeight) {
            outputHeight = maxHeight;
            outputWidth = Math.round(outputHeight * cropRatio);
        }
        if (outputHeight < VIDEO_GIF_LIMITS.minOutputEdge) {
            outputHeight = Math.min(maxHeight, VIDEO_GIF_LIMITS.minOutputEdge);
            outputWidth = Math.round(outputHeight * cropRatio);
        }
        outputWidth = Math.round(clampNumber(outputWidth, 1, maxWidth));
        outputHeight = Math.round(clampNumber(outputHeight, 1, maxHeight));
    }

    return { outputWidth, outputHeight };
}

export function getFrameCount(
    trimStart: number,
    trimEnd: number,
    fps: number,
    playbackSpeed = 1
): number {
    const safeSpeed = clampNumber(
        playbackSpeed,
        VIDEO_GIF_LIMITS.minPlaybackSpeed,
        VIDEO_GIF_LIMITS.maxPlaybackSpeed
    );
    const duration = Math.max(0, trimEnd - trimStart) / safeSpeed;
    const safeFps = clampNumber(
        Math.round(fps),
        VIDEO_GIF_LIMITS.minFps,
        VIDEO_GIF_LIMITS.maxFps
    );
    return Math.max(1, Math.ceil(duration * safeFps - 1e-9));
}

export function getFrameTimestamps(
    trimStart: number,
    trimEnd: number,
    fps: number
): number[] {
    const count = getFrameCount(trimStart, trimEnd, fps);
    const safeFps = clampNumber(
        Math.round(fps),
        VIDEO_GIF_LIMITS.minFps,
        VIDEO_GIF_LIMITS.maxFps
    );
    const lastSafeTimestamp = Math.max(trimStart, trimEnd - 0.001);

    return Array.from({ length: count }, (_unused, index) =>
        Number(
            Math.min(trimStart + index / safeFps, lastSafeTimestamp).toFixed(3)
        )
    );
}

export function estimateGifBytes(args: {
    width: number;
    height: number;
    frameCount: number;
    sampleBytes?: number | null;
    sampleFrameCount?: number | null;
}): GifEstimate {
    const width = Math.max(1, Math.round(args.width));
    const height = Math.max(1, Math.round(args.height));
    const frameCount = Math.max(1, Math.round(args.frameCount));
    const megapixels = (width * height * frameCount) / 1_000_000;

    if (
        args.sampleBytes &&
        args.sampleFrameCount &&
        args.sampleBytes > 0 &&
        args.sampleFrameCount > 0
    ) {
        return {
            bytes: Math.round(
                (args.sampleBytes / args.sampleFrameCount) * frameCount
            ),
            frameCount,
            megapixels,
        };
    }

    const indexedPixels = width * height * frameCount;
    const paletteOverhead = 1024 * Math.min(frameCount, 64);
    const headerOverhead = 2048;
    const compressionFactor = 0.42;

    return {
        bytes: Math.round(
            indexedPixels * compressionFactor + paletteOverhead + headerOverhead
        ),
        frameCount,
        megapixels,
    };
}

export function normalizeVideoGifSettings(
    value: VideoGifSettings,
    sourceWidth: number,
    sourceHeight: number,
    duration: number
): VideoGifSettings {
    const crop = normalizeCropRect(value.crop, sourceWidth, sourceHeight);
    const size = clampOutputSizeToSource(value, crop);
    const trim = clampTrimRange(value.trimStart, value.trimEnd, duration);

    return {
        ...value,
        fps: Math.round(
            clampNumber(
                value.fps,
                VIDEO_GIF_LIMITS.minFps,
                VIDEO_GIF_LIMITS.maxFps
            )
        ),
        playbackSpeed: Number(
            clampNumber(
                value.playbackSpeed,
                VIDEO_GIF_LIMITS.minPlaybackSpeed,
                VIDEO_GIF_LIMITS.maxPlaybackSpeed
            ).toFixed(2)
        ),
        outputScale: Math.round(
            clampNumber(
                value.outputScale,
                VIDEO_GIF_LIMITS.minOutputScale,
                VIDEO_GIF_LIMITS.maxOutputScale
            )
        ),
        ...size,
        ...trim,
        crop,
    };
}
