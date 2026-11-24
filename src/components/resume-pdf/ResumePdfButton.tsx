"use client";

import dynamic from "next/dynamic";
import { useContext, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { SessionContext } from "next-auth/react";
import { LocalizedText } from "@/components/LocalizedText";
import type { ResumePdfSourceProps } from "@/components/resume-pdf/ResumePdfDialog";

const ResumePdfDialog = dynamic(
    () => import("@/components/resume-pdf/ResumePdfDialog"),
    { ssr: false }
);

// 관리자에게만 보이는 이력서 PDF 버튼 (방문자에게는 아무것도 그리지 않음)
export default function ResumePdfButton({
    sourceKind,
    jobField,
    applicationProfileId,
}: ResumePdfSourceProps) {
    const session = useContext(SessionContext);
    const [open, setOpen] = useState(false);
    const source = useMemo(
        () => ({ sourceKind, jobField, applicationProfileId }),
        [sourceKind, jobField, applicationProfileId]
    );
    const isAdmin =
        session?.status === "authenticated" && session.data?.user?.isAdmin;
    if (!isAdmin) return null;
    return (
        <>
            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-foreground) transition-colors hover:border-(--color-accent) hover:text-(--color-accent)"
                >
                    <FileText className="h-4 w-4" />
                    <LocalizedText text="이력서 PDF 만들기" />
                </button>
            </div>
            {open && (
                <ResumePdfDialog
                    open={open}
                    onOpenChange={setOpen}
                    source={source}
                />
            )}
        </>
    );
}
