import { useEffect, useRef } from "react";
import { setContentDirty } from "@/lib/admin-content-state";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

// dirty 상태에서 브라우저 이탈 방지
export function useUnsavedWarning(isDirty: boolean) {
    const owner = useRef({});
    useEffect(() => {
        const key = owner.current;
        setContentDirty(key, isDirty);
        return () => setContentDirty(key, false);
    }, [isDirty]);
    const { confirm } = useConfirmDialog();

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
    const confirmLeave = async (): Promise<boolean> => {
        if (!isDirty) return true;
        return confirm({
            title: "페이지 이동",
            description:
                "저장하지 않은 내용이 있습니다. 페이지를 떠나시겠습니까?",
            confirmText: "이동",
            cancelText: "계속 편집",
        });
    };

    return { confirmLeave };
}
