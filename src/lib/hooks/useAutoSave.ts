import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 1500;

// debounce 후 localStorage 자동 저장
export function useAutoSave<T>(key: string, data: T, enabled: boolean) {
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dataStr = JSON.stringify(data);

    // key 변경 시 savedAt 초기화
    useEffect(() => {
        setSavedAt(null);
    }, [key]);

    useEffect(() => {
        if (!enabled) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            localStorage.setItem(key, dataStr);
            setSavedAt(new Date());
        }, DEBOUNCE_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [key, dataStr, enabled]);

    const clear = () => {
        localStorage.removeItem(key);
        setSavedAt(null);
    };

    return { savedAt, clear };
}

// localStorage에서 임시 저장본 읽기
export function getAutoSaveDraft<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
