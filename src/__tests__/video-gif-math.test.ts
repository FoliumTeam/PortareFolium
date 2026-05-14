import { describe, expect, it } from "vitest";
import { VIDEO_GIF_LIMITS } from "@/lib/video-gif/defaults";
import {
    buildFfmpegGifArgs,
    getPlaybackAdjustedDuration,
} from "@/lib/video-gif/ffmpeg-args";
import {
    clampOutputSizeToSource,
    clampTrimRange,
    estimateGifBytes,
    getFrameCount,
    getFrameTimestamps,
    normalizeCropRect,
    normalizeVideoGifSettings,
} from "@/lib/video-gif/math";

describe("video gif math", () => {
    it("keeps crop rectangles inside the source frame", () => {
        expect(
            normalizeCropRect(
                { x: 1900, y: -10, width: 500, height: 2000 },
                1920,
                1080
            )
        ).toEqual({ x: 1420, y: 0, width: 500, height: 1080 });
    });

    it("clamps output size to the crop dimensions", () => {
        expect(
            clampOutputSizeToSource(
                {
                    outputScale: 100,
                    outputWidth: 1000,
                    outputHeight: 1000,
                    preserveAspectRatio: false,
                },
                { x: 0, y: 0, width: 320, height: 180 }
            )
        ).toEqual({ outputWidth: 320, outputHeight: 180 });
    });

    it("derives output size from the selected resolution scale", () => {
        expect(
            clampOutputSizeToSource(
                {
                    outputScale: 50,
                    outputWidth: 500,
                    outputHeight: 500,
                    preserveAspectRatio: true,
                },
                { x: 0, y: 0, width: 640, height: 360 }
            )
        ).toEqual({ outputWidth: 320, outputHeight: 180 });
    });

    it("normalizes trim ranges and frame timestamps", () => {
        expect(clampTrimRange(-1, 12, 5)).toEqual({
            trimStart: 0,
            trimEnd: 5,
        });
        expect(getFrameCount(1, 2, 10)).toBe(10);
        expect(getFrameTimestamps(1, 1.3, 10)).toEqual([1, 1.1, 1.2]);
        expect(getFrameTimestamps(1, 1.01, 24)[0]).toBeLessThanOrEqual(1.009);
    });

    it("accounts for playback speed in ffmpeg gif duration estimates", () => {
        expect(getPlaybackAdjustedDuration(0, 2, 2)).toBe(1);
        expect(getFrameCount(0, 2, 10, 2)).toBe(10);
        expect(getFrameCount(0, 2, 10, 0.5)).toBe(40);
    });

    it("builds a palettegen and dithered paletteuse ffmpeg command", () => {
        const args = buildFfmpegGifArgs({
            inputName: "input.mp4",
            outputName: "output.gif",
            crop: { x: 10, y: 20, width: 320, height: 180 },
            outputWidth: 160,
            outputHeight: 90,
            trimStart: 1,
            trimEnd: 2.5,
            fps: 12,
            playbackSpeed: 1.5,
        });
        const filter = args[args.indexOf("-filter_complex") + 1];

        expect(args).toEqual(
            expect.arrayContaining(["-i", "input.mp4", "-loop", "0"])
        );
        expect(filter).toContain("palettegen=stats_mode=diff");
        expect(filter).toContain(
            "paletteuse=dither=sierra2_4a:diff_mode=rectangle"
        );
        expect(filter).toContain("crop=320:180:10:20");
        expect(filter).toContain("scale=160:90:flags=lanczos");
        expect(filter).toContain("setpts=(PTS-STARTPTS)/1.5");
    });

    it("estimates larger gifs for larger frame workloads", () => {
        const small = estimateGifBytes({
            width: 160,
            height: 90,
            frameCount: 10,
        });
        const large = estimateGifBytes({
            width: 320,
            height: 180,
            frameCount: 20,
        });

        expect(large.bytes).toBeGreaterThan(small.bytes);
        expect(large.megapixels).toBeGreaterThan(small.megapixels);
    });

    it("normalizes a full settings object against metadata limits", () => {
        const normalized = normalizeVideoGifSettings(
            {
                fps: 999,
                playbackSpeed: 99,
                outputScale: 999,
                outputWidth: 999,
                outputHeight: 999,
                preserveAspectRatio: false,
                sampleEstimate: false,
                trimStart: 9,
                trimEnd: 20,
                crop: { x: 100, y: 50, width: 1000, height: 1000 },
            },
            640,
            360,
            10
        );

        expect(normalized.fps).toBe(VIDEO_GIF_LIMITS.maxFps);
        expect(normalized.playbackSpeed).toBe(
            VIDEO_GIF_LIMITS.maxPlaybackSpeed
        );
        expect(normalized.outputScale).toBe(VIDEO_GIF_LIMITS.maxOutputScale);
        expect(normalized.crop).toEqual({
            x: 0,
            y: 0,
            width: 640,
            height: 360,
        });
        expect(normalized.outputWidth).toBe(640);
        expect(normalized.outputHeight).toBe(360);
        expect(normalized.trimEnd).toBe(10);
    });
});
