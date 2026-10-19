"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import {
    getEditingLocale,
    setEditingLocale,
    hasDirtyContent,
    subscribeContentState,
    waitForContentActions,
} from "@/lib/admin-content-state";
import { useUILocale } from "@/components/LocaleProvider";

// 화면 언어와 독립적인 콘텐츠 입력 범위
export const ContentLanguageSelector = ({
    onChange,
}: {
    onChange: (locale: Locale) => void;
}) => {
    const { locale: ui, changing, isChangingLocale } = useUILocale();
    const [locale, setLocale] = useState<Locale>("ko");
    const [switching, setSwitching] = useState(false);
    const dirty = useSyncExternalStore(
        subscribeContentState,
        hasDirtyContent,
        () => false
    );
    useEffect(() => setLocale(getEditingLocale()), []);
    const label =
        ui === "ko"
            ? "콘텐츠 언어"
            : ui === "ja"
              ? "入力するコンテンツの言語"
              : "Content language";
    const hint =
        ui === "ko"
            ? dirty
                ? "변경 내용 저장 후 언어 변경 가능"
                : "선택한 언어의 내용만 수정·공개"
            : ui === "ja"
              ? dirty
                  ? "変更を保存してから言語を切り替え"
                  : "選んだ言語の内容だけを編集・公開"
              : dirty
                ? "Save changes before switching language"
                : "Edit and publish only the selected language";
    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-(--color-border) bg-(--color-surface) px-4 py-2">
            <label className="flex items-center gap-2 text-sm font-medium">
                {label}
                <select
                    aria-label={label}
                    value={locale}
                    disabled={dirty || switching || changing}
                    className="rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-2"
                    onChange={async (event) => {
                        if (
                            changing ||
                            switching ||
                            isChangingLocale() ||
                            hasDirtyContent()
                        )
                            return;
                        const next = event.target.value as Locale;
                        setSwitching(true);
                        try {
                            await waitForContentActions();
                            if (isChangingLocale() || hasDirtyContent()) return;
                            setEditingLocale(next);
                            setLocale(next);
                            onChange(next);
                        } finally {
                            setSwitching(false);
                        }
                    }}
                >
                    {LOCALES.map((value) => (
                        <option key={value} value={value}>
                            {LOCALE_LABELS[value]}
                        </option>
                    ))}
                </select>
            </label>
            <span className="text-sm text-(--color-muted)">{hint}</span>
        </div>
    );
};
