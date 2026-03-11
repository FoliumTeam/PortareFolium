import { useEffect } from "react";

// dirty 상태에서 브라우저 이탈 방지
export function useUnsavedWarning(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    // 인앱 이탈 confirm
    const confirmLeave = (): boolean => {
        if (!isDirty) return true;
        return window.confirm(
            "저장하지 않은 내용이 있습니다. 페이지를 떠나시겠습니까?"
        );
    };

    return { confirmLeave };
}
