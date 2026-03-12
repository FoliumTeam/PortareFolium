import { useEffect, useRef } from "react";

const SAVE_INTERVAL_MS = 5_000;

// isDirty 감지 후 saveFn을 주기적으로 호출하는 자동 저장
export function useAutoSave(
    isDirty: boolean,
    enabled: boolean,
    saveFn: () => Promise<void>
): void {
    const isDirtyRef = useRef(isDirty);
    const saveFnRef = useRef(saveFn);

    // 최신값 동기화
    useEffect(() => {
        isDirtyRef.current = isDirty;
    });
    useEffect(() => {
        saveFnRef.current = saveFn;
    });

    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(async () => {
            if (!isDirtyRef.current) return;
            // 중복 저장 방지를 위한 optimistic reset
            isDirtyRef.current = false;
            await saveFnRef.current();
        }, SAVE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [enabled]);
}
