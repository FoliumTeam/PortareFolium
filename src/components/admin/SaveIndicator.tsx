"use client";
import { useUILocale } from "@/components/LocaleProvider";
import { LocalizedText, LocalizedRichText } from "@/components/LocalizedText";

// 저장 상태 표시
export default function SaveIndicator({
    saving,
    savedAt,
    isDirty,
}: {
    saving: boolean;
    savedAt: Date | null;
    isDirty: boolean;
}) {
    const { locale } = useUILocale();
    if (saving) {
        return (
            <span className="animate-pulse text-sm text-(--color-muted)">
                <LocalizedText text={"저장 중..."} />
            </span>
        );
    }

    if (savedAt) {
        const time = savedAt.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
        });
        return (
            <span className="text-sm text-(--color-muted)">
                <LocalizedRichText text={"저장됨 {0}"} values={[time]} />
            </span>
        );
    }

    if (isDirty) {
        return (
            <span className="text-sm text-amber-500">
                <LocalizedText text={"저장하지 않은 변경 사항"} />
            </span>
        );
    }

    return null;
}
