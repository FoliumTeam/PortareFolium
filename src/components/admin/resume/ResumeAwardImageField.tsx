"use client";
import {
    LocalizedElement,
    LocalizedText,
    LocalizedRichText,
} from "@/components/LocalizedText";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { uploadImage } from "@/lib/image-upload";

type ResumeAwardImageFieldProps = {
    image?: string;
    onChange: (image?: string) => void;
};

// 수상 증서 이미지 업로드 control
export function ResumeAwardImageField({
    image,
    onChange,
}: ResumeAwardImageFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploading(true);
        try {
            onChange(await uploadImage(file, "resume/awards"));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4">
            <div className="flex flex-wrap items-start gap-4">
                <div className="aspect-[210/297] w-20 shrink-0 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface)">
                    {image ? (
                        <LocalizedElement
                            as="img"
                            translatedProps={["alt"]}
                            src={image}
                            alt="업로드한 수상 증서 미리보기"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="flex h-full items-center justify-center text-(--color-muted)">
                            <ImageIcon className="h-6 w-6" aria-hidden="true" />
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-(--color-foreground)">
                        <LocalizedText text={"증서 이미지"} />
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-(--color-muted)">
                        <LocalizedText
                            text={
                                "공개 Resume에서 클릭하면 전체 화면으로 볼 수 있습니다. PNG, JPG, WebP, AVIF 또는 GIF를 업로드하세요."
                            }
                        />
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <LocalizedElement
                            as="input"
                            translatedProps={["aria-label"]}
                            ref={inputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                            onChange={handleUpload}
                            className="sr-only"
                            aria-label="수상 증서 이미지 파일 선택"
                        />
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            {image ? (
                                <LocalizedText text={"이미지 교체"} />
                            ) : (
                                <LocalizedText text={"이미지 업로드"} />
                            )}
                        </button>
                        {image && (
                            <button
                                type="button"
                                onClick={() => onChange(undefined)}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                            >
                                <LocalizedRichText
                                    text={"{0}이미지 제거"}
                                    values={[<Trash2 className="h-4 w-4" />]}
                                />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
