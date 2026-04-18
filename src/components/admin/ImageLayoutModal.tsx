"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImageGroupLayout } from "@/components/ImageGroup";

type MultiImageLayout = "individual" | ImageGroupLayout;

type ImageLayoutModalProps = {
    files: File[];
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (layout: MultiImageLayout) => Promise<void>;
};

type LayoutOption = {
    description: string;
    label: string;
    value: MultiImageLayout;
};

const LAYOUT_OPTIONS: LayoutOption[] = [
    {
        value: "individual",
        label: "개별사진",
        description: "기존처럼 각 이미지를 개별 image로 삽입",
    },
    {
        value: "slider",
        label: "슬라이드",
        description: "가로 scroll slider로 배치",
    },
];

// ImageLayoutModal 미리보기 URL 생성
function usePreviewUrls(files: File[], isOpen: boolean) {
    return useMemo(() => {
        if (!isOpen) return [];
        return files.map((file) => URL.createObjectURL(file));
    }, [files, isOpen]);
}

// ImageLayoutCard 프리뷰 렌더
function LayoutPreview({
    layout,
    previews,
}: {
    layout: MultiImageLayout;
    previews: string[];
}) {
    if (layout === "slider") {
        return (
            <div className="flex h-28 items-center gap-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-900">
                {previews.slice(0, 3).map((src, index) => (
                    <span
                        key={`${src}-${index}`}
                        className={`block h-16 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-zinc-800 ${
                            index === 0 ? "w-24" : "w-14"
                        }`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="flex h-28 flex-col gap-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
            {previews.slice(0, 2).map((src, index) => (
                <span
                    key={`${src}-${index}`}
                    className="block min-h-0 flex-1 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-zinc-800"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                </span>
            ))}
        </div>
    );
}

export default function ImageLayoutModal({
    files,
    isOpen,
    onClose,
    onSubmit,
}: ImageLayoutModalProps) {
    const [selected, setSelected] = useState<MultiImageLayout>("individual");
    const [submitting, setSubmitting] = useState(false);
    const previews = usePreviewUrls(files, isOpen);

    useEffect(() => {
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview));
        };
    }, [previews]);

    useEffect(() => {
        if (!isOpen) {
            setSelected("individual");
            setSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[115] flex items-center justify-center bg-black/55 px-4"
            onClick={() => {
                if (!submitting) onClose();
            }}
        >
            <div
                className="w-full max-w-4xl rounded-[28px] bg-white p-8 shadow-2xl dark:bg-zinc-950"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-center text-4xl font-semibold text-zinc-950 dark:text-zinc-50">
                            사진 첨부 방식
                        </h3>
                        <p className="mt-3 text-center text-lg text-zinc-500 dark:text-zinc-400">
                            첨부되는 사진들의 레이아웃을 선택할 수 있습니다
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="레이아웃 선택 모달 닫기"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="28"
                            height="28"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="tablet:grid-cols-2 grid gap-4">
                    {LAYOUT_OPTIONS.map((option) => {
                        const active = selected === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelected(option.value)}
                                className={`rounded-[24px] border p-4 text-left transition-all ${
                                    active
                                        ? "border-zinc-950 bg-zinc-50 shadow-lg dark:border-zinc-100 dark:bg-zinc-900"
                                        : "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                                }`}
                            >
                                <LayoutPreview
                                    layout={option.value}
                                    previews={previews}
                                />
                                <p className="mt-4 text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                                    {option.label}
                                </p>
                                <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    {option.description}
                                </p>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-xl border border-zinc-300 px-5 py-3 text-base font-medium whitespace-nowrap text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                await onSubmit(selected);
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        disabled={submitting}
                        className="rounded-xl bg-zinc-950 px-5 py-3 text-base font-medium whitespace-nowrap text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
                    >
                        {submitting ? "삽입 중..." : "선택한 레이아웃으로 삽입"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export type { MultiImageLayout };
