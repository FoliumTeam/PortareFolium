"use client";

import { Download, RotateCcw } from "lucide-react";
import type {
    GifConversionProgress,
    GifConversionResult,
    GifEstimate,
} from "@/lib/video-gif/types";

type VideoGifOutputProps = {
    estimate: GifEstimate;
    warning: string | null;
    converting: boolean;
    progress: GifConversionProgress | null;
    result: GifConversionResult | null;
    onConvert: () => void;
    onClear: () => void;
    disabled: boolean;
};

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function VideoGifOutput({
    estimate,
    warning,
    converting,
    progress,
    result,
    onConvert,
    onClear,
    disabled,
}: VideoGifOutputProps) {
    return (
        <div className="space-y-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
            <div>
                <h3 className="text-lg font-bold text-(--color-foreground)">
                    결과
                </h3>
                <p className="text-sm text-(--color-muted)">
                    예상 크기: 약 {formatBytes(estimate.bytes)} ·{" "}
                    {estimate.frameCount} frames ·{" "}
                    {estimate.megapixels.toFixed(1)} MP 처리
                </p>
                {warning && (
                    <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
                        {warning}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={onConvert}
                disabled={disabled || converting}
                className="w-full rounded-lg bg-(--color-accent) px-4 py-3 text-sm font-bold text-(--color-on-accent) disabled:cursor-not-allowed disabled:opacity-50"
            >
                {converting ? "GIF 변환 중..." : "GIF 만들기"}
            </button>

            {converting && (
                <div>
                    <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-subtle)">
                        <div
                            className="h-full bg-(--color-accent) transition-all"
                            style={{ width: `${progress?.percent ?? 0}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs text-(--color-muted)">
                        {progress?.currentFrame && progress.totalFrames
                            ? `${progress.currentFrame}/${progress.totalFrames} frames (${progress.percent}%)`
                            : (progress?.stage ??
                              `고품질 GIF 변환 준비 중... ${progress?.percent ?? 0}%`)}
                    </p>
                </div>
            )}

            {result && (
                <div className="space-y-3">
                    <img
                        src={result.objectUrl}
                        alt="생성된 GIF 미리보기"
                        className="max-h-80 w-full rounded-xl border border-(--color-border) object-contain"
                    />
                    <p className="text-sm font-medium text-(--color-foreground)">
                        실제 크기: {formatBytes(result.bytes)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={result.objectUrl}
                            download="portare-folium-export.gif"
                            className="inline-flex items-center gap-2 rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-on-accent)"
                        >
                            <Download className="h-4 w-4" />
                            다운로드
                        </a>
                        <button
                            type="button"
                            onClick={onClear}
                            className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-muted) hover:bg-(--color-surface-subtle)"
                        >
                            <RotateCcw className="h-4 w-4" />
                            결과 지우기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
