"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { browserClient } from "@/lib/supabase";
import PdfPreviewModal from "@/components/PdfPreviewModal";

interface Props {
    children: React.ReactNode;
    fileName?: string;
}

export default function PdfExportButton({ children, fileName }: Props) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [authed, setAuthed] = useState(false);

    // 인증 상태 확인
    useEffect(() => {
        if (!browserClient) return;
        browserClient.auth.getUser().then(({ data }) => {
            if (data.user) setAuthed(true);
        });
        const { data: listener } = browserClient.auth.onAuthStateChange(
            (_event, session) => setAuthed(!!session?.user)
        );
        return () => listener.subscription.unsubscribe();
    }, []);

    return (
        <>
            {authed && (
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={() => setOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                    >
                        <Download className="h-4 w-4" />
                        PDF 내보내기
                    </button>
                </div>
            )}
            <div ref={contentRef}>{children}</div>
            {authed && (
                <PdfPreviewModal
                    open={open}
                    onClose={() => setOpen(false)}
                    contentRef={contentRef}
                    fileName={fileName}
                />
            )}
        </>
    );
}
