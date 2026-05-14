import { clampNumber, VIDEO_GIF_LIMITS } from "@/lib/video-gif/defaults";
import type { CropRect, VideoGifOptimizationMode } from "@/lib/video-gif/types";

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
    optimizationMode: VideoGifOptimizationMode;
};

export const GIF_OPTIMIZATION_PRESETS: Record<
    VideoGifOptimizationMode,
    {
        maxColors: number;
        dither: string;
        description: string;
        estimateMultiplier: number;
    }
> = {
    quality: {
        maxColors: 256,
        dither: "sierra2_4a",
        description: "Best color preservation, largest file",
        estimateMultiplier: 1,
    },
    balanced: {
        maxColors: 128,
        dither: "sierra2_4a",
        description: "Fewer palette colors for a smaller file",
        estimateMultiplier: 0.72,
    },
    size: {
        maxColors: 64,
        dither: "none",
        description: "Smallest file, most visible color banding",
        estimateMultiplier: 0.48,
    },
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
    optimizationMode,
}: FfmpegGifArgsInput): string[] {
    const safeFps = Math.round(
        clampNumber(fps, VIDEO_GIF_LIMITS.minFps, VIDEO_GIF_LIMITS.maxFps)
    );
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
    const optimization =
        GIF_OPTIMIZATION_PRESETS[optimizationMode] ??
        GIF_OPTIMIZATION_PRESETS.quality;

    const filter = [
        `[0:v]trim=start=${ffmpegNumber(start)}:end=${ffmpegNumber(end)}`,
        `setpts=(PTS-STARTPTS)/${ffmpegNumber(safeSpeed)}`,
        `crop=${cropWidth}:${cropHeight}:${x}:${y}`,
        `scale=${width}:${height}:flags=lanczos`,
        `fps=${safeFps}`,
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
        "-loop",
        "0",
        outputName,
    ];
}
