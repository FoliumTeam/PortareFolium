"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    fullFrameCrop,
    sanitizeVideoGifDefaults,
    VIDEO_GIF_LOCAL_STORAGE_KEY,
    VIDEO_GIF_LIMITS,
} from "@/lib/video-gif/defaults";
import {
    estimateGifBytes,
    getFrameCount,
    normalizeVideoGifSettings,
} from "@/lib/video-gif/math";
import { convertVideoToGif } from "@/lib/video-gif/encoder";
import type {
    CropRect,
    GifConversionProgress,
    GifConversionResult,
    VideoGifSettings,
    VideoMetadata,
} from "@/lib/video-gif/types";
import VideoGifDropzone from "@/components/admin/video-gif/VideoGifDropzone";
import VideoGifPreview from "@/components/admin/video-gif/VideoGifPreview";
import VideoGifSettingsForm from "@/components/admin/video-gif/VideoGifSettingsForm";
import VideoGifOutput from "@/components/admin/video-gif/VideoGifOutput";

function finiteNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRememberedCrop(
    value: unknown,
    metadata: VideoMetadata
): CropRect {
    if (!value || typeof value !== "object") {
        return fullFrameCrop(metadata.width, metadata.height);
    }
    const crop = value as Partial<CropRect>;
    return {
        x: finiteNumber(crop.x, 0),
        y: finiteNumber(crop.y, 0),
        width: finiteNumber(crop.width, metadata.width),
        height: finiteNumber(crop.height, metadata.height),
    };
}

function makeInitialSettings(
    rememberedSettings: unknown | null,
    metadata: VideoMetadata
): VideoGifSettings {
    const input =
        rememberedSettings && typeof rememberedSettings === "object"
            ? (rememberedSettings as Partial<VideoGifSettings>)
            : {};
    const defaults = sanitizeVideoGifDefaults(input);
    return normalizeVideoGifSettings(
        {
            ...defaults,
            trimStart: finiteNumber(input.trimStart, 0),
            trimEnd: finiteNumber(input.trimEnd, metadata.duration),
            crop: parseRememberedCrop(input.crop, metadata),
        },
        metadata.width,
        metadata.height,
        metadata.duration
    );
}

function revokeGifResult(result: GifConversionResult | null) {
    if (result) URL.revokeObjectURL(result.objectUrl);
}

export default function VideoGifPanel() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const conversionRunIdRef = useRef(0);
    const settingsTouchedRef = useRef(false);
    const [rememberedSettings, setRememberedSettings] = useState<
        unknown | null
    >(null);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [settings, setSettings] = useState<VideoGifSettings | null>(null);
    const [result, setResult] = useState<GifConversionResult | null>(null);
    const [progress, setProgress] = useState<GifConversionProgress | null>(
        null
    );
    const [converting, setConverting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(
                VIDEO_GIF_LOCAL_STORAGE_KEY
            );
            if (stored) {
                setRememberedSettings(JSON.parse(stored));
            }
        } catch {
            setRememberedSettings(null);
        } finally {
            setPreferencesLoaded(true);
        }
    }, []);

    useEffect(
        () => () => {
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
        },
        [sourceUrl]
    );

    useEffect(
        () => () => {
            revokeGifResult(result);
        },
        [result]
    );

    useEffect(
        () => () => {
            conversionRunIdRef.current += 1;
            abortRef.current?.abort();
        },
        []
    );

    useEffect(() => {
        if (!metadata || !preferencesLoaded || settingsTouchedRef.current)
            return;
        setSettings(makeInitialSettings(rememberedSettings, metadata));
    }, [metadata, preferencesLoaded, rememberedSettings]);

    const handleFileSelect = useCallback((nextFile: File) => {
        conversionRunIdRef.current += 1;
        abortRef.current?.abort();
        settingsTouchedRef.current = false;
        setConverting(false);
        setError(null);
        setStatus(null);
        setMetadata(null);
        setSettings(null);
        setProgress(null);
        setFile(nextFile);
        setResult((prev) => {
            revokeGifResult(prev);
            return null;
        });
        setSourceUrl(URL.createObjectURL(nextFile));
    }, []);

    const handleMetadata = useCallback((nextMetadata: VideoMetadata) => {
        setMetadata(nextMetadata);
    }, []);

    const handleSettingsChange = useCallback(
        (nextSettings: VideoGifSettings) => {
            if (!metadata) return;
            conversionRunIdRef.current += 1;
            abortRef.current?.abort();
            setConverting(false);
            settingsTouchedRef.current = true;
            setSettings(
                normalizeVideoGifSettings(
                    nextSettings,
                    metadata.width,
                    metadata.height,
                    metadata.duration
                )
            );
            setResult((prev) => {
                revokeGifResult(prev);
                return null;
            });
        },
        [metadata]
    );

    const estimate = useMemo(() => {
        if (!settings) {
            return { bytes: 0, frameCount: 0, megapixels: 0 };
        }
        return estimateGifBytes({
            width: settings.outputWidth,
            height: settings.outputHeight,
            frameCount: getFrameCount(
                settings.trimStart,
                settings.trimEnd,
                settings.fps,
                settings.playbackSpeed
            ),
        });
    }, [settings]);

    const warning = useMemo(() => {
        if (!estimate.frameCount) return null;
        if (estimate.frameCount > VIDEO_GIF_LIMITS.maxRecommendedFrames) {
            return `프레임 수가 ${estimate.frameCount}장입니다. FPS나 길이를 줄이면 변환이 빨라집니다.`;
        }
        if (estimate.megapixels > VIDEO_GIF_LIMITS.maxRecommendedMegapixels) {
            return "처리 픽셀 수가 큽니다. crop 또는 출력 해상도를 줄이는 것을 권장합니다.";
        }
        return null;
    }, [estimate]);

    const handleRememberSettings = () => {
        if (!settings) return;
        setError(null);
        setStatus(null);
        try {
            window.localStorage.setItem(
                VIDEO_GIF_LOCAL_STORAGE_KEY,
                JSON.stringify(settings)
            );
            setRememberedSettings(settings);
            setStatus(
                "마지막 설정 전체를 이 브라우저에 기억했습니다. 다음 비디오부터 적용됩니다."
            );
        } catch {
            setError("브라우저에 마지막 설정을 저장할 수 없습니다.");
        }
    };

    const handleReset = () => {
        conversionRunIdRef.current += 1;
        abortRef.current?.abort();
        settingsTouchedRef.current = false;
        setConverting(false);
        setError(null);
        setStatus(null);
        setMetadata(null);
        setSettings(null);
        setProgress(null);
        setFile(null);
        setResult((prev) => {
            revokeGifResult(prev);
            return null;
        });
        setSourceUrl(null);
    };

    const handleConvert = async () => {
        if (!settings || !videoRef.current || !file) return;
        abortRef.current?.abort();
        const runId = conversionRunIdRef.current + 1;
        conversionRunIdRef.current = runId;
        const controller = new AbortController();
        abortRef.current = controller;
        setConverting(true);
        setProgress(null);
        setError(null);
        setStatus(null);
        setResult((prev) => {
            revokeGifResult(prev);
            return null;
        });

        try {
            const converted = await convertVideoToGif({
                file,
                crop: settings.crop,
                outputWidth: settings.outputWidth,
                outputHeight: settings.outputHeight,
                trimStart: settings.trimStart,
                trimEnd: settings.trimEnd,
                fps: settings.fps,
                playbackSpeed: settings.playbackSpeed,
                onProgress: setProgress,
                signal: controller.signal,
            });
            if (
                controller.signal.aborted ||
                runId !== conversionRunIdRef.current
            ) {
                URL.revokeObjectURL(converted.objectUrl);
                return;
            }
            setResult(converted);
            setStatus(
                "GIF 변환이 완료됐습니다. 결과는 새로고침하면 사라집니다."
            );
        } catch (err) {
            if (
                controller.signal.aborted ||
                runId !== conversionRunIdRef.current
            ) {
                return;
            }
            setError(err instanceof Error ? err.message : "GIF 변환 실패");
        } finally {
            if (runId === conversionRunIdRef.current) {
                setConverting(false);
                abortRef.current = null;
            }
        }
    };

    const clearResult = () => {
        setResult((prev) => {
            revokeGifResult(prev);
            return null;
        });
        setProgress(null);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-4 pb-3">
                <div>
                    <h2 className="text-3xl font-bold text-(--color-foreground)">
                        Video → GIF
                    </h2>
                    <p className="text-sm text-(--color-muted)">
                        짧은 작업 영상으로 GIF를 만듭니다. 원본과 결과물은 자동
                        저장되지 않습니다.
                    </p>
                </div>
                {sourceUrl && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-foreground) hover:bg-(--color-surface-subtle)"
                    >
                        새로 만들기
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                {!sourceUrl ? (
                    <VideoGifDropzone
                        file={file}
                        onFileSelect={handleFileSelect}
                    />
                ) : (
                    <div className="laptop:grid-cols-[minmax(0,1fr)_420px] grid h-full min-h-0 items-stretch gap-4">
                        <div className="flex min-h-0 items-center justify-center overflow-hidden">
                            <VideoGifPreview
                                ref={videoRef}
                                sourceUrl={sourceUrl}
                                metadata={metadata}
                                crop={settings?.crop ?? null}
                                trimStart={settings?.trimStart ?? 0}
                                trimEnd={settings?.trimEnd ?? null}
                                playbackSpeed={settings?.playbackSpeed ?? 1}
                                onMetadata={handleMetadata}
                                onVideoError={setError}
                            />
                        </div>

                        <div className="flex min-h-0 flex-col gap-3">
                            {metadata && settings ? (
                                <>
                                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                        <VideoGifSettingsForm
                                            settings={settings}
                                            metadata={metadata}
                                            onSettingsChange={
                                                handleSettingsChange
                                            }
                                        />
                                        <VideoGifOutput
                                            estimate={estimate}
                                            warning={warning}
                                            converting={converting}
                                            progress={progress}
                                            result={result}
                                            onConvert={handleConvert}
                                            onClear={clearResult}
                                            disabled={!sourceUrl || !settings}
                                        />
                                        {(status || error) && (
                                            <div
                                                className={[
                                                    "rounded-xl px-4 py-3 text-sm",
                                                    error
                                                        ? "bg-red-500/10 text-red-600 dark:text-red-300"
                                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                                ].join(" ")}
                                            >
                                                {error ?? status}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRememberSettings}
                                        className="shrink-0 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-foreground) hover:bg-(--color-surface-subtle)"
                                    >
                                        마지막 설정 기억하기
                                    </button>
                                </>
                            ) : (
                                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 text-sm text-(--color-muted)">
                                    {sourceUrl && !preferencesLoaded
                                        ? "기억한 마지막 설정을 불러오는 중입니다."
                                        : "비디오를 선택하면 trim, crop, FPS, 해상도 설정이 활성화됩니다."}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
