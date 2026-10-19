"use client";

import Picker from "@emoji-mart/react";
import en from "@emoji-mart/data/i18n/en.json";
import ja from "@emoji-mart/data/i18n/ja.json";
import ko from "@emoji-mart/data/i18n/ko.json";
import { useUILocale } from "@/components/LocaleProvider";

type LocalizedEmojiPickerProps = {
    data: unknown;
    onEmojiSelect: (emoji: { native: string }) => void;
    theme?: "light" | "dark" | "auto";
    previewPosition?: "top" | "bottom" | "none";
    skinTonePosition?: "preview" | "search" | "none";
};

// 입력값을 유지한 이모지 선택창의 화면 언어
export default function LocalizedEmojiPicker(props: LocalizedEmojiPickerProps) {
    const { locale } = useUILocale();
    const messages = { ko, en, ja };
    const localizedProps = { ...props, locale, i18n: messages[locale] };
    return <Picker {...localizedProps} />;
}
