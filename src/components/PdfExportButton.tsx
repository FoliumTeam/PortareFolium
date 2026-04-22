"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useSession } from "next-auth/react";
import PdfPreviewModal, { type PdfSection } from "@/components/PdfPreviewModal";

interface Props {
    children: React.ReactNode;
    fileName?: string;
    sections?: PdfSection[];
}

export default function PdfExportButton({
    children,
    fileName,
    sections,
}: Props) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { data: session, status } = useSession();
    const authed = status === "authenticated" && session?.user?.isAdmin;

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
                    sections={sections}
                />
            )}
        </>
    );
}
