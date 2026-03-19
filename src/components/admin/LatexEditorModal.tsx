"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";

interface Props {
    onInsert: (latex: string) => void;
    onClose: () => void;
    initialValue?: string;
}

// KaTeX 기반 LaTeX 수식 편집 모달
export default function LatexEditorModal({
    onInsert,
    onClose,
    initialValue = "",
}: Props) {
    const [latex, setLatex] = useState(initialValue);
    const [renderError, setRenderError] = useState("");
    const previewRef = useRef<HTMLDivElement>(null);

    // KaTeX 실시간 렌더링
    useEffect(() => {
        if (!previewRef.current) return;
        if (!latex.trim()) {
            previewRef.current.innerHTML = "";
            setRenderError("");
            return;
        }
        try {
            katex.render(latex, previewRef.current, {
                displayMode: true,
                throwOnError: true,
            });
            setRenderError("");
        } catch (e) {
            setRenderError((e as Error).message);
            previewRef.current.innerHTML = "";
        }
    }, [latex]);

    // ESC 키로 닫기
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="mx-4 w-full max-w-xl rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-(--color-border) p-4">
                    <h3 className="text-lg font-semibold text-(--color-foreground)">
                        LaTeX 수식 편집
                    </h3>
                </div>

                {/* LaTeX 입력 */}
                <div className="p-4 pb-0">
                    <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                        LaTeX 입력
                    </label>
                    <textarea
                        value={latex}
                        onChange={(e) => setLatex(e.target.value)}
                        rows={3}
                        placeholder="\beta + \theta = \alpha"
                        className="w-full resize-y rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 font-mono text-sm text-(--color-foreground) focus:ring-1 focus:ring-(--color-accent) focus:outline-none"
                        autoFocus
                    />
                </div>

                {/* KaTeX 미리보기 */}
                <div className="p-4">
                    <p className="mb-2 text-xs text-(--color-muted)">
                        미리보기
                    </p>
                    <div className="flex min-h-14 items-center justify-center rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3">
                        {renderError ? (
                            <span className="text-xs text-red-500">
                                {renderError}
                            </span>
                        ) : !latex.trim() ? (
                            <span className="text-xs text-(--color-muted)">
                                수식을 입력하면 미리보기가 표시됩니다
                            </span>
                        ) : null}
                        <div
                            ref={previewRef}
                            className={
                                !latex.trim() || renderError ? "hidden" : ""
                            }
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-(--color-border) p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-(--color-border) px-4 py-2 text-sm text-(--color-muted) hover:bg-(--color-surface-subtle)"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            latex.trim() && !renderError && onInsert(latex)
                        }
                        disabled={!latex.trim() || !!renderError}
                        className="rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-medium whitespace-nowrap text-(--color-on-accent) disabled:opacity-50"
                    >
                        삽입
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
