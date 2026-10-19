"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    getDocumentPublication,
    setDocumentPublication,
} from "@/app/admin/actions/content-variants";
import { LocalizedText } from "@/components/LocalizedText";
import { useUITranslation } from "@/components/LocaleProvider";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    bindContentAction,
    getEditingLocale,
    hasDirtyContent,
    hasPendingContentActions,
    subscribeContentState,
    waitForContentActions,
} from "@/lib/admin-content-state";
import type { Locale } from "@/lib/i18n";

const readPublication = bindContentAction(getDocumentPublication);
const savePublication = bindContentAction(setDocumentPublication);

export const DocumentPublicationControl = ({
    kind,
    saved,
}: {
    kind: "resume" | "about";
    saved: boolean;
}) => {
    const t = useUITranslation();
    const [published, setPublished] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const source = useRef<Locale | null>(null);
    const busyRef = useRef(false);
    const savedRef = useRef(saved);
    savedRef.current = saved;
    const mounted = useRef(true);
    const dirty = useSyncExternalStore(
        subscribeContentState,
        hasDirtyContent,
        () => false
    );
    const pending = useSyncExternalStore(
        subscribeContentState,
        hasPendingContentActions,
        () => false
    );

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setPublished(null);
        setError("");
        source.current = getEditingLocale();
        if (saved) {
            const locale = source.current;
            void readPublication(kind)
                .then((value) => {
                    if (active && getEditingLocale() === locale)
                        setPublished(value);
                })
                .catch(() => {
                    if (active) setError("공개 상태 조회 실패");
                });
        }
        return () => {
            active = false;
        };
    }, [kind, saved]);

    const toggle = async () => {
        if (
            !savedRef.current ||
            published === null ||
            busyRef.current ||
            hasDirtyContent() ||
            hasPendingContentActions()
        )
            return;
        busyRef.current = true;
        setBusy(true);
        setError("");
        try {
            await waitForContentActions();
            if (!mounted.current) return;
            if (getEditingLocale() !== source.current) {
                setError("콘텐츠 언어 변경으로 작업 중단. 다시 선택");
                return;
            }
            if (
                !savedRef.current ||
                hasDirtyContent() ||
                hasPendingContentActions()
            )
                return;
            const next = !published;
            await savePublication(kind, next);
            if (mounted.current) setPublished(next);
        } catch (failure) {
            if (mounted.current)
                setError(
                    failure instanceof Error
                        ? failure.message
                        : "공개 상태 저장 실패"
                );
        } finally {
            busyRef.current = false;
            if (mounted.current) setBusy(false);
        }
    };

    const disabledReason = !saved
        ? "콘텐츠 저장 후 공개 가능"
        : dirty
          ? "변경사항 저장 후 공개 상태 변경 가능"
          : busy || pending
            ? "진행 중인 작업 완료 후 공개 상태 변경 가능"
            : published === null
              ? "공개 상태 확인 후 변경 가능"
              : "";
    const button = (
        <button
            type="button"
            disabled={!saved || published === null || busy || dirty || pending}
            onClick={() => void toggle()}
            className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${published ? "bg-emerald-700" : "bg-amber-700"}`}
        >
            <LocalizedText
                text={
                    !saved
                        ? "콘텐츠 저장 후 공개 가능"
                        : busy
                          ? "공개 상태 저장 중..."
                          : published === null
                            ? "공개 상태 불러오는 중..."
                            : published
                              ? "Published · 비공개로 변경"
                              : "Draft · 검토 후 공개"
                }
            />
        </button>
    );

    return (
        <div className="flex flex-col items-start gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {disabledReason ? (
                            <span
                                tabIndex={0}
                                aria-label={t(disabledReason)}
                                className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
                            >
                                {button}
                            </span>
                        ) : (
                            button
                        )}
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="z-[170] max-w-64">
                        <LocalizedText
                            text={
                                disabledReason ||
                                (published ? "비공개로 변경" : "검토 후 공개")
                            }
                        />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {error && (
                <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-400"
                >
                    <LocalizedText text={error} />
                </p>
            )}
        </div>
    );
};

export default DocumentPublicationControl;
