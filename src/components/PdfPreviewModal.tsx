"use client";
import { LocalizedText } from "@/components/LocalizedText";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, ChevronDown, Loader2 } from "lucide-react";
import { PDF_COLOR_SCHEMES, type PdfColorScheme } from "@/lib/color-schemes";
import { getPdfImageSource } from "@/lib/pdf-image-source";

// A4 비율 (297mm / 210mm)
const A4_RATIO = 297 / 210;

export interface PdfSection {
    key: string;
    label: string;
    defaultIncluded?: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    contentRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
    sections?: PdfSection[];
}

// spacer 생성 헬퍼
function createSpacer(height: number, isGridItem: boolean): HTMLElement {
    const spacer = document.createElement("div");
    spacer.setAttribute("data-pdf-spacer", "true");
    spacer.style.height = `${height}px`;
    spacer.style.background = "transparent";
    spacer.style.pointerEvents = "none";
    // grid item spacer는 전체 열 span
    if (isGridItem) spacer.style.gridColumn = "1 / -1";
    return spacer;
}

// 블록 높이 측정 후 페이지 경계에서 잘리는 블록 앞에 spacer 삽입
function paginateBlocks(container: HTMLElement): number[] {
    const pageWidth = container.offsetWidth;
    if (pageWidth === 0) return [];
    const pageHeight = pageWidth * A4_RATIO;

    // 기존 spacer 제거
    container
        .querySelectorAll("[data-pdf-spacer]")
        .forEach((el) => el.remove());

    const allBlocks = container.querySelectorAll<HTMLElement>(
        "[data-pdf-block], [data-pdf-block-item]"
    );
    // container block이 block-type 자식을 가진 경우 container 제외 (자식이 개별 처리)
    const blocks = Array.from(allBlocks).filter((block) => {
        if (block.hasAttribute("data-pdf-block-item")) return true;
        return !block.querySelector("[data-pdf-block], [data-pdf-block-item]");
    });
    if (blocks.length === 0) return [];

    const containerRect = container.getBoundingClientRect();
    const pageBreaks: number[] = [];
    let currentPageBottom = pageHeight;
    // grid row 중복 처리 방지용
    let lastGridRowTop = -Infinity;

    for (const block of blocks) {
        const isGridItem = block.hasAttribute("data-pdf-block-item");
        const blockRect = block.getBoundingClientRect();
        let blockTop = blockRect.top - containerRect.top;

        // grid item: 같은 행 아이템은 skip (첫 번째 아이템만 처리)
        if (isGridItem) {
            if (Math.abs(blockTop - lastGridRowTop) < 2) continue;
            lastGridRowTop = blockTop;
        }

        // grid item: 같은 행의 가장 높은 아이템 기준으로 row bottom 계산
        let blockBottom = blockTop + blockRect.height;
        if (isGridItem && block.parentElement) {
            const siblings = block.parentElement.querySelectorAll<HTMLElement>(
                "[data-pdf-block-item]"
            );
            for (const sib of siblings) {
                const sibRect = sib.getBoundingClientRect();
                const sibTop = sibRect.top - containerRect.top;
                if (Math.abs(sibTop - blockTop) < 2) {
                    blockBottom = Math.max(
                        blockBottom,
                        sibTop + sibRect.height
                    );
                }
            }
        }

        const blockHeight = blockBottom - blockTop;

        // 블록이 현재 페이지에 맞으면 skip
        if (blockBottom <= currentPageBottom + 1) continue;

        // 블록이 A4 한 페이지보다 큰 경우 → graceful degradation
        if (blockHeight > pageHeight) {
            while (currentPageBottom < blockBottom) {
                pageBreaks.push(currentPageBottom);
                currentPageBottom += pageHeight;
            }
            continue;
        }

        // 블록이 페이지 경계를 넘지만 한 페이지에 들어가는 크기 → spacer 삽입
        const spacerHeight = currentPageBottom - blockTop;
        if (spacerHeight > 0 && spacerHeight < pageHeight) {
            block.parentElement?.insertBefore(
                createSpacer(spacerHeight, isGridItem),
                block
            );
            pageBreaks.push(currentPageBottom);
            currentPageBottom += pageHeight;
        } else {
            while (currentPageBottom < blockTop) {
                pageBreaks.push(currentPageBottom);
                currentPageBottom += pageHeight;
            }
            if (
                blockBottom > currentPageBottom + 1 &&
                blockHeight <= pageHeight
            ) {
                const gap = currentPageBottom - blockTop;
                if (gap > 0 && gap < pageHeight) {
                    block.parentElement?.insertBefore(
                        createSpacer(gap, isGridItem),
                        block
                    );
                }
                pageBreaks.push(currentPageBottom);
                currentPageBottom += pageHeight;
            }
        }

        // 보정: 블록이 삽입 후에도 다중 페이지를 넘을 수 있음
        while (currentPageBottom < blockBottom) {
            pageBreaks.push(currentPageBottom);
            currentPageBottom += pageHeight;
        }
    }

    return pageBreaks;
}

export default function PdfPreviewModal({
    open,
    onClose,
    contentRef,
    fileName = "document",
    sections,
}: Props) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [scheme, setScheme] = useState<PdfColorScheme>("neutral");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [pageBreaks, setPageBreaks] = useState<number[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 섹션 포함 여부 (defaultIncluded 기본값 false)
    const [included, setIncluded] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        (sections ?? []).forEach((s) => {
            init[s.key] = s.defaultIncluded ?? false;
        });
        return init;
    });

    // 총 페이지 수
    const totalPages = pageBreaks.length + 1;

    // 모달 열림 / 스킴 변경 시: 원본에서 새로 클론 + 페이지네이션
    // 기존 클론 재사용 시 grid-column: 1/-1 spacer의 grid reflow 영향으로 측정값이 달라지므로
    // 항상 깨끗한 DOM에서 pagination 실행
    useEffect(() => {
        if (!open || !contentRef.current || !previewRef.current) return;
        setLoading(true);
        document.body.style.overflow = "hidden";

        const clone = contentRef.current.cloneNode(true) as HTMLElement;
        // 링크 비활성화
        clone.querySelectorAll("a").forEach((a) => {
            a.removeAttribute("href");
            a.style.pointerEvents = "none";
        });
        // interactive 요소 숨김
        clone.querySelectorAll("select").forEach((el) => {
            (el as HTMLElement).style.display = "none";
        });
        // 제외된 섹션 제거
        (sections ?? []).forEach((s) => {
            if (!included[s.key]) {
                clone
                    .querySelectorAll(`[data-pdf-section="${s.key}"]`)
                    .forEach((el) => el.remove());
            }
        });
        previewRef.current.innerHTML = "";
        previewRef.current.appendChild(clone);
        previewRef.current.setAttribute("data-color-scheme", scheme);

        // 레이아웃 안정화 후 페이지네이션
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!previewRef.current) return;
                const breaks = paginateBlocks(previewRef.current);
                setPageBreaks(breaks);
                setLoading(false);
            });
        });

        return () => {
            document.body.style.overflow = "";
        };
    }, [open, scheme, contentRef, included, sections]);

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
                onclone: (_document, element) => {
                    element.querySelectorAll("img").forEach((image) => {
                        const source = getPdfImageSource(
                            image.currentSrc || image.src,
                            window.location.href
                        );
                        image.removeAttribute("srcset");
                        image.removeAttribute("crossorigin");
                        image.src = source;
                        image.loading = "eager";
                    });
                },
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
            console.error(
                "[PdfPreviewModal::handleDownload] PDF generation failed:",
                err
            );
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
                    <h2 className="text-sm font-semibold">
                        <LocalizedText text={"PDF 내보내기"} />
                    </h2>
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
                            <LocalizedText text={"Color Scheme"} />
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
                                    {
                                        <LocalizedText
                                            text={
                                                currentScheme?.label ?? scheme
                                            }
                                        />
                                    }
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
                                            <span>
                                                {
                                                    <LocalizedText
                                                        text={opt.label}
                                                    />
                                                }
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 섹션 포함 토글 */}
                    {sections && sections.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">
                                <LocalizedText text={"Sections"} />
                            </label>
                            <div className="space-y-1.5">
                                {sections.map((s) => (
                                    <label
                                        key={s.key}
                                        className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300 hover:text-white"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={included[s.key] ?? false}
                                            onChange={(e) =>
                                                setIncluded((prev) => ({
                                                    ...prev,
                                                    [s.key]: e.target.checked,
                                                }))
                                            }
                                            className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-white"
                                        />
                                        <span>
                                            {<LocalizedText text={s.label} />}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 페이지 정보 */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">
                            <LocalizedText text={"Pages"} />
                        </label>
                        <p className="text-sm text-zinc-300">
                            {totalPages}{" "}
                            {totalPages === 1 ? (
                                <LocalizedText text={"page"} />
                            ) : (
                                <LocalizedText text={"pages"} />
                            )}
                        </p>
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
                        {generating ? (
                            <LocalizedText text={"생성 중..."} />
                        ) : (
                            <LocalizedText text={"PDF 다운로드"} />
                        )}
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
                <div className="relative mx-auto max-w-4xl">
                    {/* 콘텐츠 영역 (html2canvas 캡처 대상) */}
                    <div className="rounded-lg bg-white p-8 shadow-2xl">
                        <div ref={previewRef} data-color-scheme="neutral" />
                    </div>

                    {/* 페이지 구분선 overlay (캡처 대상 밖) */}
                    {pageBreaks.map((pos, i) => (
                        <div
                            key={i}
                            className="pointer-events-none absolute right-0 left-0"
                            // p-8 (32px) 오프셋 보정, 간격(16px)은 경계선 위쪽(이전 페이지 spacer 영역)
                            style={{ top: `${pos + 32 - 16}px` }}
                        >
                            <div className="h-4 bg-zinc-800" />
                            <div className="relative border-t-2 border-dashed border-red-400/60">
                                <span className="absolute -top-5 right-3 rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                                    {i + 1} / {i + 2}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
