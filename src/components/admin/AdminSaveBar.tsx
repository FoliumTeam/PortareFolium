"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// 어드민 패널 공통 sticky 저장 바 — portal로 #admin-save-bar-slot에 렌더링
export default function AdminSaveBar({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const slot = mounted
        ? document.getElementById("admin-save-bar-slot")
        : null;
    if (!slot) return null;

    return createPortal(
        <div className="border-t border-(--color-border) bg-(--color-surface)/90 px-6 py-3 backdrop-blur-sm">
            <div className="tablet:flex-row flex flex-col items-center justify-between gap-3">
                {children}
            </div>
        </div>,
        slot
    );
}
