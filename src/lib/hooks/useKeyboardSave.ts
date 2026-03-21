// Cmd+S / Ctrl+S 단축키 저장
import { useEffect } from "react";

export function useKeyboardSave(saveFn: () => void) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                saveFn();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [saveFn]);
}
