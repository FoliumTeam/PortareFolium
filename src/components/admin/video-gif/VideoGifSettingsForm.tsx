"use client";

import type {
    CropRect,
    VideoGifSettings,
    VideoMetadata,
} from "@/lib/video-gif/types";
import { VIDEO_GIF_LIMITS } from "@/lib/video-gif/defaults";

type VideoGifSettingsFormProps = {
    settings: VideoGifSettings;
    metadata: VideoMetadata;
    onSettingsChange: (settings: VideoGifSettings) => void;
};

function numberValue(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default function VideoGifSettingsForm({
    settings,
    metadata,
    onSettingsChange,
}: VideoGifSettingsFormProps) {
    const update = (patch: Partial<VideoGifSettings>) =>
        onSettingsChange({ ...settings, ...patch });
    const updateCrop = (patch: Partial<CropRect>) =>
        update({ crop: { ...settings.crop, ...patch } });

    return (
        <div className="space-y-5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
            <div>
                <h3 className="text-lg font-bold text-(--color-foreground)">
                    GIF 설정
                </h3>
                <p className="text-sm text-(--color-muted)">
                    해상도는 현재 crop 영역보다 커질 수 없습니다.
                </p>
            </div>

            <div className="tablet:grid-cols-2 grid gap-3">
                <label className="space-y-1 text-sm">
                    <span className="font-medium text-(--color-muted)">
                        시작 시간 (초)
                    </span>
                    <input
                        type="number"
                        min={0}
                        max={settings.trimEnd - 0.01}
                        step={0.05}
                        value={settings.trimStart}
                        onChange={(event) =>
                            update({
                                trimStart: numberValue(
                                    event.target.value,
                                    settings.trimStart
                                ),
                            })
                        }
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2"
                    />
                </label>
                <label className="space-y-1 text-sm">
                    <span className="font-medium text-(--color-muted)">
                        종료 시간 (초)
                    </span>
                    <input
                        type="number"
                        min={settings.trimStart + 0.01}
                        max={metadata.duration}
                        step={0.05}
                        value={settings.trimEnd}
                        onChange={(event) =>
                            update({
                                trimEnd: numberValue(
                                    event.target.value,
                                    settings.trimEnd
                                ),
                            })
                        }
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2"
                    />
                </label>
            </div>

            <div className="space-y-2 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-3">
                <div className="flex items-center justify-between gap-3">
                    <label
                        htmlFor="video-gif-playback-speed"
                        className="text-sm font-medium text-(--color-muted)"
                    >
                        재생 속도
                    </label>
                    <input
                        type="number"
                        min={VIDEO_GIF_LIMITS.minPlaybackSpeed}
                        max={VIDEO_GIF_LIMITS.maxPlaybackSpeed}
                        step={0.05}
                        value={settings.playbackSpeed}
                        onChange={(event) =>
                            update({
                                playbackSpeed: numberValue(
                                    event.target.value,
                                    settings.playbackSpeed
                                ),
                            })
                        }
                        className="w-24 rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1 text-right"
                    />
                </div>
                <input
                    id="video-gif-playback-speed"
                    type="range"
                    min={VIDEO_GIF_LIMITS.minPlaybackSpeed}
                    max={VIDEO_GIF_LIMITS.maxPlaybackSpeed}
                    step={0.05}
                    value={settings.playbackSpeed}
                    onChange={(event) =>
                        update({
                            playbackSpeed: numberValue(
                                event.target.value,
                                settings.playbackSpeed
                            ),
                        })
                    }
                    className="w-full"
                />
                <p className="text-xs text-(--color-muted)">
                    1.0×는 원본 속도입니다. 값이 커질수록 결과 GIF가 더 빠르게
                    재생됩니다.
                </p>
            </div>

            <div className="grid gap-3">
                <label className="space-y-1 text-sm">
                    <span className="font-medium text-(--color-muted)">
                        FPS
                    </span>
                    <input
                        type="number"
                        min={VIDEO_GIF_LIMITS.minFps}
                        max={VIDEO_GIF_LIMITS.maxFps}
                        step={1}
                        value={settings.fps}
                        onChange={(event) =>
                            update({
                                fps: numberValue(
                                    event.target.value,
                                    settings.fps
                                ),
                            })
                        }
                        className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2"
                    />
                </label>
            </div>

            <div className="space-y-2 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-3">
                <div className="flex items-center justify-between gap-3">
                    <label
                        htmlFor="video-gif-output-scale"
                        className="text-sm font-medium text-(--color-muted)"
                    >
                        출력 해상도
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={VIDEO_GIF_LIMITS.minOutputScale}
                            max={VIDEO_GIF_LIMITS.maxOutputScale}
                            step={1}
                            value={settings.outputScale}
                            onChange={(event) =>
                                update({
                                    outputScale: numberValue(
                                        event.target.value,
                                        settings.outputScale
                                    ),
                                })
                            }
                            className="w-20 rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1 text-right"
                        />
                        <span className="text-sm text-(--color-muted)">%</span>
                    </div>
                </div>
                <input
                    id="video-gif-output-scale"
                    type="range"
                    min={VIDEO_GIF_LIMITS.minOutputScale}
                    max={VIDEO_GIF_LIMITS.maxOutputScale}
                    step={1}
                    value={settings.outputScale}
                    onChange={(event) =>
                        update({
                            outputScale: numberValue(
                                event.target.value,
                                settings.outputScale
                            ),
                        })
                    }
                    className="w-full"
                />
                <p className="text-xs text-(--color-muted)">
                    현재 출력: {settings.outputWidth} × {settings.outputHeight}
                    px. 100%는 crop 영역의 원본 해상도입니다.
                </p>
            </div>

            <div>
                <h4 className="mb-2 text-sm font-bold text-(--color-foreground)">
                    Crop 영역
                </h4>
                <div className="tablet:grid-cols-4 grid gap-3">
                    {(
                        [
                            ["x", "X", metadata.width],
                            ["y", "Y", metadata.height],
                            ["width", "너비", metadata.width],
                            ["height", "높이", metadata.height],
                        ] as const
                    ).map(([key, label, max]) => (
                        <label key={key} className="space-y-1 text-sm">
                            <span className="font-medium text-(--color-muted)">
                                {label}
                            </span>
                            <input
                                type="number"
                                min={
                                    key === "width" || key === "height" ? 1 : 0
                                }
                                max={max}
                                step={1}
                                value={settings.crop[key]}
                                onChange={(event) =>
                                    updateCrop({
                                        [key]: numberValue(
                                            event.target.value,
                                            settings.crop[key]
                                        ),
                                    })
                                }
                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2"
                            />
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
