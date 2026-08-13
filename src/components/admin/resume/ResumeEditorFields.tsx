"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useState } from "react";

type InputFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
};

export const InputField = ({
    label,
    value,
    onChange,
    placeholder = "",
    type = "text",
}: InputFieldProps) => {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-(--color-muted)">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
            />
        </div>
    );
};

type TextAreaFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
};

export const TextAreaField = ({
    label,
    value,
    onChange,
    placeholder = "",
    rows = 3,
}: TextAreaFieldProps) => {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-(--color-muted)">
                {label}
            </label>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full resize-y rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-sm text-(--color-foreground) placeholder-(--color-muted) focus:border-(--color-accent) focus:outline-none"
            />
        </div>
    );
};

export const SectionEmojiSelector = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const [showPicker, setShowPicker] = useState(false);

    return (
        <div className="relative mr-3 inline-block">
            <button
                type="button"
                onClick={() => setShowPicker((current) => !current)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-subtle) text-base transition-colors hover:bg-(--color-border)"
                title="이모지 선택"
            >
                {value || "➕"}
            </button>
            {showPicker ? (
                <>
                    <button
                        type="button"
                        aria-label="이모지 선택 닫기"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute top-10 left-0 z-50 shadow-xl">
                        <Picker
                            data={data}
                            onEmojiSelect={(emoji: { native: string }) => {
                                onChange(emoji.native);
                                setShowPicker(false);
                            }}
                            theme={
                                document.documentElement.classList.contains(
                                    "dark"
                                )
                                    ? "dark"
                                    : "light"
                            }
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
};
