"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ImageDeleteConfirmDialogProps = {
    confirmLabel?: string;
    description: string;
    images: string[];
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    title: string;
};

export default function ImageDeleteConfirmDialog({
    confirmLabel = "삭제",
    description,
    images,
    onConfirm,
    onOpenChange,
    open,
    title,
}: ImageDeleteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="tablet:max-w-2xl overflow-hidden rounded-[24px] p-0"
            >
                <div className="bg-white dark:bg-zinc-950">
                    <DialogHeader className="px-6 pt-6 text-left">
                        <DialogTitle className="text-xl text-zinc-950 dark:text-zinc-50">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-5">
                        {images.length <= 1 ? (
                            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={images[0] ?? ""}
                                    alt="삭제 대상 이미지 미리보기"
                                    className="block h-auto w-full"
                                />
                            </div>
                        ) : (
                            <div className="tablet:grid-cols-3 grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
                                {images.map((src, index) => (
                                    <div
                                        key={`${src}-${index}`}
                                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={src}
                                            alt={`삭제 대상 이미지 ${index + 1}`}
                                            className="block h-auto w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-medium whitespace-nowrap text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onOpenChange(false);
                            }}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-red-500"
                        >
                            {confirmLabel}
                        </button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
