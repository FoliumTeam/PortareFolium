import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideoGifPreview from "@/components/admin/video-gif/VideoGifPreview";

describe("VideoGifPreview", () => {
    it("sizes the overlay frame to the source aspect ratio", () => {
        const { container } = render(
            <VideoGifPreview
                sourceUrl="blob:video"
                metadata={{ width: 1080, height: 1920, duration: 1 }}
                crop={{ x: 270, y: 480, width: 540, height: 960 }}
                trimStart={0}
                trimEnd={1}
                playbackSpeed={1}
                onMetadata={vi.fn()}
                onVideoError={vi.fn()}
            />
        );

        const frame = container.querySelector(
            ".relative.mx-auto"
        ) as HTMLElement | null;
        const overlay = container.querySelector(
            ".pointer-events-none"
        ) as HTMLElement | null;

        expect(frame?.style.aspectRatio).toBe("1080 / 1920");
        expect(frame?.className).not.toContain("max-h");
        expect(container.querySelector("video")?.className).not.toContain(
            "object-contain"
        );
        expect(overlay?.style.left).toBe("25%");
        expect(overlay?.style.top).toBe("25%");
        expect(overlay?.style.width).toBe("50%");
        expect(overlay?.style.height).toBe("50%");
    });

    it("loops preview playback within the trimmed range", () => {
        const { container } = render(
            <VideoGifPreview
                sourceUrl="blob:video"
                metadata={{ width: 640, height: 360, duration: 10 }}
                crop={{ x: 0, y: 0, width: 640, height: 360 }}
                trimStart={2}
                trimEnd={4}
                playbackSpeed={1.5}
                onMetadata={vi.fn()}
                onVideoError={vi.fn()}
            />
        );
        const video = container.querySelector("video") as HTMLVideoElement;
        const pause = vi.spyOn(video, "pause").mockImplementation(() => {});

        Object.defineProperty(video, "currentTime", {
            configurable: true,
            writable: true,
            value: 4.1,
        });
        video.dispatchEvent(new Event("timeupdate", { bubbles: true }));

        expect(pause).toHaveBeenCalled();
        expect(video.currentTime).toBe(2);
        expect(video.playbackRate).toBe(1.5);
    });
});
