import { clampNumber, VIDEO_GIF_LIMITS } from "@/lib/video-gif/defaults";
import type { CropRect } from "@/lib/video-gif/types";

export type FfmpegGifArgsInput = {
    inputName: string;
    outputName: string;
    crop: CropRect;
    outputWidth: number;
    outputHeight: number;
    trimStart: number;
    trimEnd: number;
    fps: number;
    playbackSpeed: number;
    compressionRate: number;
};

export type GifCompressionPreset = {
    compressionRate: number;
    maxColors: number;
    dither: string;
    fpsMultiplier: number;
    removeSimilarFrames: boolean;
    estimateMultiplier: number;
};

function ffmpegNumber(value: number): string {
    return Number(value.toFixed(3)).toString();
}

export function getPlaybackAdjustedDuration(
    trimStart: number,
    trimEnd: number,
    playbackSpeed: number
): number {
    const sourceDuration = Math.max(0, trimEnd - trimStart);
    const safeSpeed = clampNumber(
        playbackSpeed,
        VIDEO_GIF_LIMITS.minPlaybackSpeed,
        VIDEO_GIF_LIMITS.maxPlaybackSpeed
    );
    return sourceDuration / safeSpeed;
}

export function getGifCompressionPreset(
    compressionRate: number
): GifCompressionPreset {
    const rate = clampNumber(
        Math.round(compressionRate),
        VIDEO_GIF_LIMITS.minCompressionRate,
        VIDEO_GIF_LIMITS.maxCompressionRate
    );
    return {
        compressionRate: rate,
        maxColors: Math.max(192, Math.round(256 - rate * 0.64)),
        dither: "sierra2_4a",
        fpsMultiplier: Math.max(0.5, 1 - rate * 0.005),
        removeSimilarFrames: rate >= 55,
        estimateMultiplier: Math.max(0.55, 1 - rate * 0.0045),
    };
}

export function getOptimizedGifFps(
    fps: number,
    compressionRate: number
): number {
    const safeFps = Math.round(
        clampNumber(fps, VIDEO_GIF_LIMITS.minFps, VIDEO_GIF_LIMITS.maxFps)
    );
    const optimization = getGifCompressionPreset(compressionRate);
    return Math.max(
        VIDEO_GIF_LIMITS.minFps,
        Math.round(safeFps * optimization.fpsMultiplier)
    );
}

export function buildFfmpegGifArgs({
    inputName,
    outputName,
    crop,
    outputWidth,
    outputHeight,
    trimStart,
    trimEnd,
    fps,
    playbackSpeed,
    compressionRate,
}: FfmpegGifArgsInput): string[] {
    const safeFps = getOptimizedGifFps(fps, compressionRate);
    const safeSpeed = clampNumber(
        playbackSpeed,
        VIDEO_GIF_LIMITS.minPlaybackSpeed,
        VIDEO_GIF_LIMITS.maxPlaybackSpeed
    );
    const x = Math.max(0, Math.round(crop.x));
    const y = Math.max(0, Math.round(crop.y));
    const cropWidth = Math.max(1, Math.round(crop.width));
    const cropHeight = Math.max(1, Math.round(crop.height));
    const width = Math.max(1, Math.round(outputWidth));
    const height = Math.max(1, Math.round(outputHeight));
    const start = Math.max(0, trimStart);
    const end = Math.max(start + 0.01, trimEnd);
    const optimization = getGifCompressionPreset(compressionRate);

    const frameFilters = [
        `[0:v]trim=start=${ffmpegNumber(start)}:end=${ffmpegNumber(end)}`,
        `setpts=(PTS-STARTPTS)/${ffmpegNumber(safeSpeed)}`,
        `crop=${cropWidth}:${cropHeight}:${x}:${y}`,
        `scale=${width}:${height}:flags=lanczos`,
        `fps=${safeFps}`,
    ];
    if (optimization.removeSimilarFrames) {
        frameFilters.push("mpdecimate=hi=768:lo=320:frac=0.33");
    }

    const filter = [
        ...frameFilters,
        "split[palette_source][gif_source]",
        `[palette_source]palettegen=stats_mode=diff:max_colors=${optimization.maxColors}[palette]`,
        `[gif_source][palette]paletteuse=dither=${optimization.dither}:diff_mode=rectangle`,
    ].join(",");

    return [
        "-i",
        inputName,
        "-an",
        "-filter_complex",
        filter,
        "-gifflags",
        "+offsetting+transdiff",
        "-loop",
        "0",
        outputName,
    ];
}
