"use client";
import { useEffect, useState, useId } from "react";

import { useUILocale } from "@/components/LocaleProvider";
import { LocalizedText } from "@/components/LocalizedText";
import { LanguageDropdown } from "@/components/LanguageDropdown";
import { withoutLanguageQuery } from "@/lib/query-language";

// 공개 전환은 이전 페이지·사전 로딩 자료를 폐기한 전체 요청
export const LanguageSelector = ({ admin = false }: { admin?: boolean }) => {
    const { locale, changing, error, changeLocale } = useUILocale();
    const [ready, setReady] = useState(false);
    const errorId = useId();
    useEffect(() => setReady(true), []);
    const label =
        locale === "ko"
            ? "화면 언어"
            : locale === "ja"
              ? "表示言語"
              : "Display language";
    return (
        <div className="relative shrink-0">
            <LanguageDropdown
                disabled={!ready || changing}
                label={label}
                value={locale}
                compact
                descriptionId={error ? errorId : undefined}
                onValueChange={async (nextLocale) => {
                    const changed = await changeLocale(nextLocale, {
                        apply: admin,
                    });
                    if (changed && !admin) {
                        const next = withoutLanguageQuery(window.location.href);
                        if (next !== window.location.href)
                            window.location.replace(next);
                        else window.location.reload();
                    }
                }}
            />
            {error && (
                <span
                    id={errorId}
                    role="alert"
                    className="absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-red-500/40 bg-(--color-surface) p-3 text-sm text-red-600 dark:text-red-400"
                >
                    <LocalizedText text={error} />
                </span>
            )}
        </div>
    );
};
