"use client";

import { useId, useState } from "react";
import { UploadCloud } from "lucide-react";

type VideoGifDropzoneProps = {
    file: File | null;
    onFileSelect: (file: File) => void;
};

export default function VideoGifDropzone({
    file,
    onFileSelect,
}: VideoGifDropzoneProps) {
    const inputId = useId();
    const [dragging, setDragging] = useState(false);

    const acceptFile = (nextFile?: File | null) => {
        if (!nextFile) return;
        if (!nextFile.type.startsWith("video/")) return;
        onFileSelect(nextFile);
    };

    return (
        <div
            onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                acceptFile(event.dataTransfer.files?.[0]);
            }}
            className={[
                "rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
                dragging
                    ? "border-(--color-accent) bg-(--color-accent)/10"
                    : "border-(--color-border) bg-(--color-surface)",
            ].join(" ")}
        >
            <input
                id={inputId}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
            />
            <label
                htmlFor={inputId}
                className="flex cursor-pointer flex-col items-center gap-3"
            >
                <span className="rounded-full bg-(--color-surface-subtle) p-3 text-(--color-accent)">
                    <UploadCloud className="h-6 w-6" />
                </span>
                <span className="text-base font-semibold text-(--color-foreground)">
                    비디오 파일 선택 또는 드래그
                </span>
                <span className="text-sm text-(--color-muted)">
                    파일은 브라우저 메모리에만 올라가며 새로고침하면 사라집니다.
                </span>
                {file && (
                    <span className="mt-2 rounded-full bg-(--color-accent)/10 px-3 py-1 text-sm text-(--color-accent)">
                        {file.name}
                    </span>
                )}
            </label>
        </div>
    );
}
