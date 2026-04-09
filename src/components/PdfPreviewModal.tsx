"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, ChevronDown, Loader2 } from "lucide-react";
import { PDF_COLOR_SCHEMES, type PdfColorScheme } from "@/lib/color-schemes";

interface Props {
    open: boolean;
    onClose: () => void;
    contentRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
}

export default function PdfPreviewModal({
    open,
    onClose,
    contentRef,
    fileName = "document",
}: Props) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [scheme, setScheme] = useState<PdfColorScheme>("neutral");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 콘텐츠 복제
    const cloneContent = useCallback(() => {
        if (!contentRef.current || !previewRef.current) return;
        setLoading(true);
        const clone = contentRef.current.cloneNode(true) as HTMLElement;
        // 링크 비활성화
        clone.querySelectorAll("a").forEach((a) => {
            a.removeAttribute("href");
            a.style.pointerEvents = "none";
        });
        previewRef.current.innerHTML = "";
        previewRef.current.appendChild(clone);
        requestAnimationFrame(() => setLoading(false));
    }, [contentRef]);

    useEffect(() => {
        if (open) {
            cloneContent();
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open, cloneContent]);

    // 스킴 변경 시 로딩 표시
    useEffect(() => {
        if (!open || !previewRef.current) return;
        setLoading(true);
        previewRef.current.setAttribute("data-color-scheme", scheme);
        const timer = setTimeout(() => setLoading(false), 150);
        return () => clearTimeout(timer);
    }, [scheme, open]);

    // 드롭다운 외부 클릭
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [dropdownOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    const handleDownload = async () => {
        if (!previewRef.current) return;
        setGenerating(true);
        try {
            const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                import("html2canvas-pro"),
                import("jspdf"),
            ]);
            const canvas = await html2canvas(previewRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: scheme === "neutral" ? "#ffffff" : undefined,
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`${fileName}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setGenerating(false);
        }
    };

    const currentScheme = PDF_COLOR_SCHEMES.find((s) => s.value === scheme);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex">
            {/* 배경 */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* 사이드바 컨트롤 */}
            <div className="relative z-10 flex w-72 shrink-0 flex-col border-r border-zinc-700 bg-zinc-900 text-white">
                <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
                    <h2 className="text-sm font-semibold">PDF 내보내기</h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 transition-colors hover:bg-zinc-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {/* 컬러 스킴 선택 */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">
                            Color Scheme
                        </label>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen((v) => !v)}
                                className="flex w-full items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-left text-sm transition-colors hover:border-zinc-500"
                            >
                                <span
                                    className="h-3.5 w-3.5 shrink-0 rounded border border-zinc-600"
                                    style={{
                                        backgroundColor:
                                            currentScheme?.swatch ?? "#6b7280",
                                    }}
                                />
                                <span className="flex-1">
                                    {currentScheme?.label ?? scheme}
                                </span>
                                <ChevronDown
                                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-zinc-600 bg-zinc-800 py-1 shadow-lg">
                                    {PDF_COLOR_SCHEMES.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setScheme(opt.value);
                                                setDropdownOpen(false);
                                            }}
                                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${scheme === opt.value ? "bg-zinc-700 font-medium" : "hover:bg-zinc-700/50"}`}
                                        >
                                            <span
                                                className="h-3 w-3 shrink-0 rounded border border-zinc-500"
                                                style={{
                                                    backgroundColor: opt.swatch,
                                                }}
                                            />
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 다운로드 버튼 */}
                <div className="border-t border-zinc-700 p-4">
                    <button
                        onClick={handleDownload}
                        disabled={generating}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {generating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {generating ? "생성 중..." : "PDF 다운로드"}
                    </button>
                </div>
            </div>

            {/* 프리뷰 영역 */}
            <div className="relative z-10 flex-1 overflow-auto bg-zinc-800 p-8">
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-800/80">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                )}
                <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-2xl">
                    <div ref={previewRef} data-color-scheme="neutral" />
                </div>
            </div>
        </div>,
        document.body
    );
}
