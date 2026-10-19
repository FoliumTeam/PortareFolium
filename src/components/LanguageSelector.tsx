"use client";
import { useEffect, useState } from "react";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useUILocale } from "@/components/LocaleProvider";
import { LocalizedText } from "@/components/LocalizedText";

// 공개 전환은 이전 페이지·사전 로딩 자료를 폐기한 전체 요청
export const LanguageSelector = ({ admin = false }: { admin?: boolean }) => {
    const { locale, changing, error, changeLocale } = useUILocale();
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    const label =
        locale === "ko"
            ? "화면 언어"
            : locale === "ja"
              ? "表示言語"
              : "Display language";
    return (
        <label className="flex items-center gap-2 text-sm text-(--color-foreground)">
            {admin && <span>{label}</span>}
            <select
                disabled={!ready || changing}
                aria-label={label}
                value={locale}
                className="rounded-md border border-(--color-border) bg-(--color-surface) px-2 py-2 text-sm"
                onChange={async (event) => {
                    const changed = await changeLocale(
                        event.target.value as Locale
                    );
                    if (changed && !admin) window.location.reload();
                }}
            >
                {LOCALES.map((value) => (
                    <option key={value} value={value}>
                        {LOCALE_LABELS[value]}
                    </option>
                ))}
            </select>
            {error && (
                <span role="alert" className="text-red-600 dark:text-red-400">
                    <LocalizedText text={error} />
                </span>
            )}
        </label>
    );
};
