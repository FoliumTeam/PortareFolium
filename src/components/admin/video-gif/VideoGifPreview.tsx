"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CropRect, VideoMetadata } from "@/lib/video-gif/types";

type VideoGifPreviewProps = {
    sourceUrl: string | null;
    metadata: VideoMetadata | null;
    crop: CropRect | null;
    trimStart: number;
    trimEnd: number | null;
    playbackSpeed: number;
    onMetadata: (metadata: VideoMetadata) => void;
    onVideoError: (message: string) => void;
};

const VideoGifPreview = forwardRef<HTMLVideoElement, VideoGifPreviewProps>(
    function VideoGifPreview(
        {
            sourceUrl,
            metadata,
            crop,
            trimStart,
            trimEnd,
            playbackSpeed,
            onMetadata,
            onVideoError,
        },
        ref
    ) {
        const videoRef = useRef<HTMLVideoElement | null>(null);
        useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);
        const effectiveTrimEnd = trimEnd ?? metadata?.duration ?? null;

        useEffect(() => {
            const video = videoRef.current;
            if (!video || !sourceUrl) return;
            video.playbackRate = playbackSpeed;
            if (
                effectiveTrimEnd !== null &&
                (video.currentTime < trimStart ||
                    video.currentTime >= effectiveTrimEnd)
            ) {
                video.currentTime = trimStart;
            }
        }, [effectiveTrimEnd, playbackSpeed, sourceUrl, trimStart]);

        const enforceTrimPlayback = (video: HTMLVideoElement) => {
            if (effectiveTrimEnd === null) return;
            if (video.currentTime < trimStart) {
                video.currentTime = trimStart;
                return;
            }
            if (video.currentTime >= effectiveTrimEnd) {
                video.pause();
                video.currentTime = trimStart;
            }
        };

        const frameStyle = metadata
            ? { aspectRatio: `${metadata.width} / ${metadata.height}` }
            : { aspectRatio: "16 / 9" };
        const cropStyle =
            metadata && crop
                ? {
                      left: `${(crop.x / metadata.width) * 100}%`,
                      top: `${(crop.y / metadata.height) * 100}%`,
                      width: `${(crop.width / metadata.width) * 100}%`,
                      height: `${(crop.height / metadata.height) * 100}%`,
                  }
                : undefined;

        return (
            <div className="border border-(--color-border) bg-black p-3">
                <div
                    className="relative mx-auto w-full max-w-full overflow-hidden bg-black"
                    style={frameStyle}
                >
                    {sourceUrl ? (
                        <>
                            <video
                                ref={videoRef}
                                src={sourceUrl}
                                controls
                                preload="metadata"
                                className="h-full w-full"
                                onPlay={(event) => {
                                    const video = event.currentTarget;
                                    video.playbackRate = playbackSpeed;
                                    enforceTrimPlayback(video);
                                }}
                                onTimeUpdate={(event) =>
                                    enforceTrimPlayback(event.currentTarget)
                                }
                                onLoadedMetadata={(event) => {
                                    const video = event.currentTarget;
                                    video.playbackRate = playbackSpeed;
                                    onMetadata({
                                        width: video.videoWidth,
                                        height: video.videoHeight,
                                        duration: video.duration,
                                    });
                                }}
                                onError={() =>
                                    onVideoError(
                                        "브라우저가 이 비디오를 읽을 수 없습니다. mp4/webm 파일로 다시 시도하세요."
                                    )
                                }
                            />
                            {cropStyle && (
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute border-2 border-(--color-accent) bg-(--color-accent)/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                                    style={cropStyle}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                            비디오를 선택하면 여기에 미리보기가 표시됩니다.
                        </div>
                    )}
                </div>
                {metadata && (
                    <div className="tablet:grid-cols-3 mt-3 grid gap-2 text-xs text-zinc-300">
                        <span>
                            원본: {metadata.width} × {metadata.height}px
                        </span>
                        <span>길이: {metadata.duration.toFixed(2)}초</span>
                        {crop && (
                            <span>
                                캡처: {crop.width} × {crop.height}px @ ({crop.x}
                                , {crop.y})
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

export default VideoGifPreview;
