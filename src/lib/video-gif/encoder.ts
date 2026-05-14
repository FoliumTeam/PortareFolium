import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { buildFfmpegGifArgs } from "@/lib/video-gif/ffmpeg-args";
import type {
    CropRect,
    GifConversionProgress,
    GifConversionResult,
} from "@/lib/video-gif/types";

export type ConvertVideoToGifArgs = {
    file: File;
    crop: CropRect;
    outputWidth: number;
    outputHeight: number;
    trimStart: number;
    trimEnd: number;
    fps: number;
    playbackSpeed: number;
    onProgress?: (progress: GifConversionProgress) => void;
    signal?: AbortSignal;
};

const FFMPEG_CORE_BASE_URL =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

function ensureNotAborted(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("GIF 변환이 취소됐습니다.");
}

function makeSafeExtension(file: File): string {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    return /^[a-z0-9]+$/.test(extension) ? extension : "mp4";
}

function toBlobPart(data: Awaited<ReturnType<FFmpeg["readFile"]>>): BlobPart {
    if (typeof data === "string") return data;
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
}

async function loadFfmpeg(
    onProgress?: (progress: GifConversionProgress) => void
): Promise<FFmpeg> {
    if (ffmpeg?.loaded) return ffmpeg;
    if (loadPromise) return loadPromise;

    const instance = new FFmpeg();
    instance.on("progress", ({ progress }) => {
        onProgress?.({
            percent: Math.max(1, Math.min(99, Math.round(progress * 100))),
            stage: "고품질 팔레트와 디더링으로 GIF를 만드는 중...",
        });
    });

    loadPromise = (async () => {
        onProgress?.({
            percent: 0,
            stage: "FFmpeg GIF 엔진을 불러오는 중...",
        });
        await instance.load({
            coreURL: await toBlobURL(
                `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
                "text/javascript"
            ),
            wasmURL: await toBlobURL(
                `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`,
                "application/wasm"
            ),
        });
        ffmpeg = instance;
        return instance;
    })().catch((error) => {
        loadPromise = null;
        ffmpeg = null;
        throw error;
    });

    return loadPromise;
}

export async function convertVideoToGif({
    file,
    crop,
    outputWidth,
    outputHeight,
    trimStart,
    trimEnd,
    fps,
    playbackSpeed,
    onProgress,
    signal,
}: ConvertVideoToGifArgs): Promise<GifConversionResult> {
    ensureNotAborted(signal);
    const ffmpegInstance = await loadFfmpeg(onProgress);
    ensureNotAborted(signal);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inputName = `input-${runId}.${makeSafeExtension(file)}`;
    const outputName = `output-${runId}.gif`;
    const abortConversion = () => {
        ffmpegInstance.terminate();
        if (ffmpeg === ffmpegInstance) ffmpeg = null;
        loadPromise = null;
    };
    signal?.addEventListener("abort", abortConversion, { once: true });

    try {
        onProgress?.({
            percent: 0,
            stage: "업로드한 비디오를 브라우저 메모리에 준비하는 중...",
        });
        await ffmpegInstance.writeFile(inputName, await fetchFile(file));
        ensureNotAborted(signal);

        const exitCode = await ffmpegInstance.exec(
            buildFfmpegGifArgs({
                inputName,
                outputName,
                crop,
                outputWidth,
                outputHeight,
                trimStart,
                trimEnd,
                fps,
                playbackSpeed,
            })
        );
        ensureNotAborted(signal);
        if (exitCode !== 0) {
            throw new Error(`FFmpeg GIF 변환 실패(exit code ${exitCode})`);
        }

        onProgress?.({
            percent: 100,
            stage: "GIF 파일을 브라우저로 가져오는 중...",
        });
        const data = await ffmpegInstance.readFile(outputName);
        const blob = new Blob([toBlobPart(data)], { type: "image/gif" });
        return {
            blob,
            bytes: blob.size,
            objectUrl: URL.createObjectURL(blob),
        };
    } catch (error) {
        if (signal?.aborted) throw new Error("GIF 변환이 취소됐습니다.");
        throw error instanceof Error
            ? error
            : new Error("FFmpeg GIF 변환 실패");
    } finally {
        signal?.removeEventListener("abort", abortConversion);
        await Promise.allSettled([
            ffmpegInstance.deleteFile(inputName),
            ffmpegInstance.deleteFile(outputName),
        ]);
    }
}
