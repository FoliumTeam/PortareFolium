import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoGifPanel from "@/components/admin/panels/VideoGifPanel";
import { VIDEO_GIF_LOCAL_STORAGE_KEY } from "@/lib/video-gif/defaults";

const mocks = vi.hoisted(() => ({
    convertVideoToGif: vi.fn(),
}));

vi.mock("@/lib/video-gif/encoder", () => ({
    convertVideoToGif: mocks.convertVideoToGif,
}));

function pickVideo(container: HTMLElement, file: File) {
    const input = container.querySelector(
        'input[type="file"]'
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
}

function loadMetadata(width = 640, height = 360, duration = 2) {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    Object.defineProperties(video, {
        videoWidth: { configurable: true, value: width },
        videoHeight: { configurable: true, value: height },
        duration: { configurable: true, value: duration },
    });
    fireEvent.loadedMetadata(video as HTMLVideoElement);
    return video as HTMLVideoElement;
}

describe("VideoGifPanel", () => {
    beforeEach(() => {
        mocks.convertVideoToGif.mockReset();
        window.localStorage.clear();
        vi.spyOn(URL, "createObjectURL").mockImplementation(
            (blob: Blob | MediaSource) => `blob:mock-${(blob as Blob).size}`
        );
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    });

    it("keeps video files browser-local and revokes object URLs on reset", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["one"], "one.mp4", { type: "video/mp4" })
        );
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        expect(fetchSpy).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText("새로 만들기"));
        await waitFor(() =>
            expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-3")
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("initializes every setting from remembered localStorage values", async () => {
        window.localStorage.setItem(
            VIDEO_GIF_LOCAL_STORAGE_KEY,
            JSON.stringify({
                fps: 8,
                playbackSpeed: 1.5,
                outputScale: 75,
                preserveAspectRatio: true,
                sampleEstimate: false,
                optimizationMode: "size",
                trimStart: 0.25,
                trimEnd: 1.5,
                crop: { x: 10, y: 20, width: 320, height: 180 },
            })
        );
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["video"], "video.mp4", { type: "video/mp4" })
        );
        loadMetadata(640, 360, 2);

        await waitFor(() => {
            expect(screen.getByDisplayValue("8")).toBeInTheDocument();
            expect(screen.getByLabelText("종료 시간 (초)")).toHaveValue(1.5);
            expect(screen.getAllByDisplayValue("75")).toHaveLength(2);
        });
        expect(screen.getByLabelText("시작 시간 (초)")).toHaveValue(0.25);
        expect(screen.getByLabelText("종료 시간 (초)")).toHaveValue(1.5);
        expect(screen.getByLabelText("X")).toHaveValue(10);
        expect(screen.getByLabelText("Y")).toHaveValue(20);
        expect(screen.getByLabelText("너비")).toHaveValue(320);
        expect(screen.getByLabelText("높이")).toHaveValue(180);
        expect(screen.getByLabelText("압축률")).toHaveValue("65");
    });

    it("remembers every current option in localStorage without a database action", async () => {
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["video"], "video.mp4", { type: "video/mp4" })
        );
        loadMetadata(640, 360, 2);
        await waitFor(() => screen.getByText("마지막 설정 기억하기"));

        const changeNumberInput = async (label: string, value: string) => {
            fireEvent.change(screen.getByLabelText(label), {
                target: { value },
            });
            await waitFor(() =>
                expect(screen.getByLabelText(label)).toHaveValue(Number(value))
            );
        };

        await changeNumberInput("FPS", "14");
        await changeNumberInput("시작 시간 (초)", "0.5");
        await changeNumberInput("종료 시간 (초)", "1.5");
        await changeNumberInput("너비", "320");
        await changeNumberInput("높이", "180");
        await changeNumberInput("X", "12");
        await changeNumberInput("Y", "24");
        fireEvent.change(screen.getByLabelText("압축률"), {
            target: { value: "40" },
        });
        fireEvent.click(screen.getByText("마지막 설정 기억하기"));

        expect(
            JSON.parse(
                window.localStorage.getItem(VIDEO_GIF_LOCAL_STORAGE_KEY) ?? "{}"
            )
        ).toMatchObject({
            fps: 14,
            playbackSpeed: 1,
            outputScale: 100,
            preserveAspectRatio: true,
            sampleEstimate: false,
            compressionRate: 40,
            trimStart: 0.5,
            trimEnd: 1.5,
            crop: { x: 12, y: 24, width: 320, height: 180 },
        });
        expect(
            screen.getByText(
                "마지막 설정 전체를 이 브라우저에 기억했습니다. 다음 비디오부터 적용됩니다."
            )
        ).toBeInTheDocument();
    });

    it("clamps remembered crop and trim values to the next video", async () => {
        window.localStorage.setItem(
            VIDEO_GIF_LOCAL_STORAGE_KEY,
            JSON.stringify({
                fps: 12,
                playbackSpeed: 1,
                outputScale: 100,
                outputWidth: 640,
                outputHeight: 360,
                preserveAspectRatio: true,
                sampleEstimate: false,
                compressionRate: 0,
                trimStart: 5,
                trimEnd: 20,
                crop: { x: 500, y: 500, width: 1000, height: 800 },
            })
        );
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["video"], "video.mp4", { type: "video/mp4" })
        );
        loadMetadata(320, 180, 2);

        await waitFor(() => {
            expect(screen.getByLabelText("X")).toHaveValue(0);
            expect(screen.getByLabelText("Y")).toHaveValue(0);
            expect(screen.getByLabelText("너비")).toHaveValue(320);
            expect(screen.getByLabelText("높이")).toHaveValue(180);
            expect(screen.getByLabelText("시작 시간 (초)")).toHaveValue(1.99);
            expect(screen.getByLabelText("종료 시간 (초)")).toHaveValue(2);
        });
    });

    it("shows a new button instead of a drop area after loading and resets to drop-only state", async () => {
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["video"], "video.mp4", { type: "video/mp4" })
        );
        loadMetadata(640, 360, 2);

        expect(screen.getByText("새로 만들기")).toBeInTheDocument();
        expect(
            screen.queryByText("비디오 파일 선택 또는 드래그")
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("새로 만들기"));

        expect(
            screen.getByText("비디오 파일 선택 또는 드래그")
        ).toBeInTheDocument();
        expect(screen.queryByText("새로 만들기")).not.toBeInTheDocument();
    });

    it("aborts and revokes stale conversion output when the source is replaced", async () => {
        let resolveConversion: (value: unknown) => void = () => undefined;
        mocks.convertVideoToGif.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveConversion = resolve;
            }) as never
        );
        const { container } = render(<VideoGifPanel />);

        pickVideo(
            container,
            new File(["video"], "video.mp4", { type: "video/mp4" })
        );
        loadMetadata(640, 360, 2);
        await waitFor(() => screen.getByText("GIF 만들기"));
        fireEvent.click(screen.getByText("GIF 만들기"));
        expect(mocks.convertVideoToGif.mock.calls[0]?.[0]).toMatchObject({
            playbackSpeed: 1,
            compressionRate: 30,
        });

        const firstSignal = mocks.convertVideoToGif.mock.calls[0]?.[0]
            .signal as AbortSignal;
        fireEvent.click(screen.getByText("새로 만들기"));
        expect(firstSignal.aborted).toBe(true);

        resolveConversion({
            blob: new Blob(["gif"], { type: "image/gif" }),
            bytes: 3,
            objectUrl: "blob:stale-gif",
        });

        await waitFor(() => {
            expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:stale-gif");
        });
        expect(
            screen.queryByAltText("생성된 GIF 미리보기")
        ).not.toBeInTheDocument();
        expect(screen.queryByText("GIF 변환 중...")).not.toBeInTheDocument();
    });
});
