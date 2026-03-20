"use client";

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
    if (saving) {
        return (
            <span className="animate-pulse text-sm text-(--color-muted)">
                저장 중...
            </span>
        );
    }

    if (savedAt) {
        const time = savedAt.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        });
        return (
            <span className="text-sm text-(--color-muted)">저장됨 {time}</span>
        );
    }

    if (isDirty) {
        return (
            <span className="text-sm text-amber-500">
                저장하지 않은 변경 사항
            </span>
        );
    }

    return null;
}
