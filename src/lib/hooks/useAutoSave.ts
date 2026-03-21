import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 3_000;

// isDirty 감지 후 3초 debounce 자동 저장
export function useAutoSave(
    isDirty: boolean,
    enabled: boolean,
    saveFn: () => Promise<void>
): { savedAt: Date | null; saving: boolean } {
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);
    const saveFnRef = useRef(saveFn);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 최신값 동기화
    useEffect(() => {
        saveFnRef.current = saveFn;
    });

    useEffect(() => {
        if (!enabled || !isDirty) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // dirty 변경 시 타이머 리셋
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
            setSaving(true);
            await saveFnRef.current();
            setSaving(false);
            setSavedAt(new Date());
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [enabled, isDirty]);

    return { savedAt, saving };
}
