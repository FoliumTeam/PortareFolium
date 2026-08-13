"use client";

import type { ChangeEvent } from "react";
import type { ResumeBasics } from "@/types/resume";
import {
    InputField,
    TextAreaField,
} from "@/components/admin/resume/ResumeEditorFields";

type ResumeBasicsSectionProps = {
    basics: ResumeBasics | undefined;
    uploadingImage: boolean;
    onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onChange: (field: keyof ResumeBasics, value: string) => void;
};

export const ResumeBasicsSection = ({
    basics,
    uploadingImage,
    onImageChange,
    onChange,
}: ResumeBasicsSectionProps) => {
    return (
        <section
            data-resume-section="basics"
            className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6"
        >
            <h3 className="text-xl font-bold text-(--color-foreground)">
                기본 정보
            </h3>
            <div className="tablet:flex-row tablet:gap-6 mb-4 flex flex-col items-start gap-4">
                {basics?.image ? (
                    <img
                        src={basics.image}
                        alt="Profile"
                        className="tablet:h-48 tablet:w-48 h-32 w-32 shrink-0 rounded-full border border-(--color-border) object-cover"
                    />
                ) : null}
                <div className="max-w-full min-w-0 flex-1">
                    <label className="text-sm font-medium text-(--color-muted)">
                        프로필 사진 (자동 업로드)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onImageChange}
                        disabled={uploadingImage}
                        className="mt-4 block max-w-full cursor-pointer rounded-lg border-2 border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-foreground) file:mr-4 file:rounded-lg file:border-0 file:bg-(--color-surface-subtle) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--color-foreground) hover:file:bg-(--color-border) hover:file:text-(--color-foreground) disabled:opacity-50"
                    />
                </div>
            </div>

            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4">
                <InputField
                    label="이름 (Name)"
                    value={basics?.name || ""}
                    onChange={(value) => onChange("name", value)}
                />
                <InputField
                    label="직함 (Label)"
                    value={basics?.label || ""}
                    onChange={(value) => onChange("label", value)}
                    placeholder="예: Frontend Developer"
                />
                <InputField
                    label="이메일"
                    value={basics?.email || ""}
                    onChange={(value) => onChange("email", value)}
                />
                <InputField
                    label="전화번호"
                    value={basics?.phone || ""}
                    onChange={(value) => onChange("phone", value)}
                />
                <InputField
                    label="웹사이트 URL"
                    value={basics?.url || ""}
                    onChange={(value) => onChange("url", value)}
                />
            </div>
            <TextAreaField
                label="자기소개 (Summary)"
                value={basics?.summary || ""}
                onChange={(value) => onChange("summary", value)}
                rows={4}
            />
        </section>
    );
};
