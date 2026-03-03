/**
 * ThumbnailUploadField
 *
 * 썸네일 입력: 파일 업로드 또는 URL 입력.
 * 파일 업로드 시 image-upload.ts 로직으로 WebP 변환 후 Supabase Storage에 저장,
 * 최종적으로 DB에 저장되는 값은 Storage URL.
 */
import { useState, useRef } from "react";
import { uploadImageToSupabase } from "@/lib/image-upload";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ThumbnailUploadFieldProps {
    value: string;
    onChange: (url: string) => void;
    placeholder?: string;
    folderPath?: string;
}

export default function ThumbnailUploadField({
    value,
    onChange,
    placeholder = "파일 업로드 또는 URL 입력",
    folderPath,
}: ThumbnailUploadFieldProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setUploadError("이미지 파일만 업로드 가능합니다.");
            return;
        }
        if (file.size > MAX_SIZE) {
            setUploadError("파일 크기는 5MB 이하여야 합니다.");
            return;
        }

        setUploadError(null);
        setUploading(true);
        try {
            const url = await uploadImageToSupabase(file, folderPath);
            onChange(url);
        } catch (err) {
            setUploadError(
                err instanceof Error ? err.message : "업로드에 실패했습니다."
            );
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-base font-medium text-(--color-muted)">
                썸네일
            </label>

            {/* 미리보기 */}
            {value && (
                <div className="flex items-start gap-3">
                    <img
                        src={value}
                        alt="썸네일 미리보기"
                        className="h-20 w-20 rounded-lg border border-(--color-border) object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                                "none";
                        }}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-(--color-muted)">
                            {value}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                    id="thumbnail-file-input"
                />
                <label
                    htmlFor="thumbnail-file-input"
                    className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--color-border) px-4 py-2 text-base font-medium transition-colors ${
                        uploading
                            ? "cursor-not-allowed opacity-50"
                            : "hover:border-(--color-accent) hover:bg-(--color-surface-subtle)"
                    } text-(--color-foreground)`}
                >
                    {uploading ? "업로드 중..." : "파일 선택"}
                </label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-mono text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                />
            </div>

            {uploadError && (
                <p className="text-sm text-red-500">{uploadError}</p>
            )}
        </div>
    );
}
