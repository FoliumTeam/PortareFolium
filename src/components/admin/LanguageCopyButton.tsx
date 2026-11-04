"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Copy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { copyContentToLanguage } from "@/app/admin/actions/content-variants";
import { LanguageDropdown, LanguageFlag } from "@/components/LanguageDropdown";
import { useUITranslation } from "@/components/LocaleProvider";
import { LocalizedText } from "@/components/LocalizedText";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    bindContentAction,
    getEditingLocale,
    hasDirtyContent,
    hasPendingContentActions,
    subscribeContentState,
    waitForContentActions,
} from "@/lib/admin-content-state";
import type { VariantKind } from "@/lib/content-variants";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const copy = bindContentAction(copyContentToLanguage);
const KIND_LABELS: Record<VariantKind, string> = {
    resume: "이력서",
    about: "About",
    portfolio: "포트폴리오",
    post: "포스트",
    book: "도서",
    application: "지원 프로필",
};
type CopySource = {
    kind: VariantKind;
    locale: Locale;
    key?: string;
    title: string;
};

export const LanguageCopyButton = ({
    kind,
    sourceKey,
    sourceTitle,
    disabled = false,
    compact = false,
}: {
    kind: VariantKind;
    sourceKey?: string;
    sourceTitle: string;
    disabled?: boolean;
    compact?: boolean;
}) => {
    const t = useUITranslation();
    const [open, setOpen] = useState(false);
    const [source, setSource] = useState<CopySource | null>(null);
    const [target, setTarget] = useState<Locale>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const busyRef = useRef(false);
    const mounted = useRef(true);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
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
    const missingKey = kind !== "resume" && kind !== "about" && !sourceKey;
    const blocked = disabled || missingKey || dirty || pending || busy;
    const disabledReason = dirty
        ? "변경사항 저장 후 복사 가능"
        : pending || busy
          ? "진행 중인 작업 완료 후 복사 가능"
          : disabled || missingKey
            ? "저장된 콘텐츠만 복사 가능"
            : "";

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const openDialog = async () => {
        if (
            blocked ||
            busyRef.current ||
            hasDirtyContent() ||
            hasPendingContentActions()
        )
            return;
        busyRef.current = true;
        setBusy(true);
        const requestedSource = getEditingLocale();
        try {
            await waitForContentActions();
            if (
                !mounted.current ||
                disabledRef.current ||
                hasDirtyContent() ||
                hasPendingContentActions() ||
                getEditingLocale() !== requestedSource
            )
                return;
            setSource({
                kind,
                key: sourceKey,
                title: sourceTitle,
                locale: requestedSource,
            });
            setTarget(undefined);
            setError("");
            setOpen(true);
        } finally {
            busyRef.current = false;
            if (mounted.current) setBusy(false);
        }
    };

    const submit = async () => {
        if (
            !source ||
            !target ||
            source.locale === target ||
            busyRef.current ||
            disabledRef.current ||
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
            if (getEditingLocale() !== source.locale) {
                setError(
                    "원본 언어 변경으로 복사 중단. 창을 닫은 뒤 다시 선택"
                );
                return;
            }
            if (
                disabledRef.current ||
                hasDirtyContent() ||
                hasPendingContentActions()
            ) {
                setError("진행 중인 저장과 저장하지 않은 변경사항 확인 필요");
                return;
            }
            await copy(source.kind, target, source.key);
            if (!mounted.current) return;
            setOpen(false);
            toast.success(
                <LocalizedText
                    text="{0}에 Draft 사본 저장 완료"
                    values={[LOCALE_LABELS[target]]}
                />
            );
        } catch (failure) {
            if (mounted.current)
                setError(
                    failure instanceof Error
                        ? failure.message
                        : "언어 사본 저장 실패"
                );
        } finally {
            busyRef.current = false;
            if (mounted.current) setBusy(false);
        }
    };

    const trigger = (
        <DialogTrigger asChild disabled={blocked}>
            <Button
                type="button"
                disabled={blocked}
                aria-label={t("다른 언어로 복사")}
                className={cn(
                    "min-h-11 bg-(--color-accent) text-(--color-on-accent) hover:bg-(--color-accent)/90",
                    compact && "min-w-11 px-3"
                )}
            >
                <Copy className="size-4" aria-hidden="true" />
                {!compact && <LocalizedText text="다른 언어로 복사" />}
            </Button>
        </DialogTrigger>
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) void openDialog();
                else if (!busyRef.current) setOpen(false);
            }}
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {blocked ? (
                            <span
                                tabIndex={0}
                                aria-label={t(disabledReason)}
                                className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
                            >
                                {trigger}
                            </span>
                        ) : (
                            trigger
                        )}
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="z-[170] max-w-64">
                        {disabledReason ? (
                            <LocalizedText text={disabledReason} />
                        ) : (
                            <LocalizedText
                                text="{0} 다른 언어로 복사"
                                values={[sourceTitle]}
                            />
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DialogContent
                showCloseButton={!busy}
                className="tablet:max-w-md border-(--color-border) bg-(--color-surface) text-(--color-foreground)"
            >
                <DialogHeader className="text-left">
                    <DialogTitle>
                        <LocalizedText text="다른 언어로 복사" />
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-(--color-muted)">
                        <LocalizedText text="Draft로 복사. 기존 내용 덮어쓰기 없음. 번역 검토·저장 후 공개 필요." />
                    </DialogDescription>
                </DialogHeader>
                {source && (
                    <>
                        <dl className="space-y-3 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4 text-sm">
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-(--color-muted)">
                                    <LocalizedText text="콘텐츠 유형" />
                                </dt>
                                <dd>
                                    <LocalizedText
                                        text={KIND_LABELS[source.kind]}
                                    />
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-(--color-muted)">
                                    <LocalizedText text="원본 제목" />
                                </dt>
                                <dd className="min-w-0 text-right break-words">
                                    {source.title}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <dt className="text-(--color-muted)">
                                    <LocalizedText text="원본 언어" />
                                </dt>
                                <dd className="flex items-center gap-2">
                                    <LanguageFlag locale={source.locale} />
                                    {LOCALE_LABELS[source.locale]}
                                </dd>
                            </div>
                        </dl>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">
                                <LocalizedText text="대상 언어" />
                            </span>
                            <LanguageDropdown
                                value={target}
                                onValueChange={setTarget}
                                label={t("대상 언어")}
                                placeholder={t("대상 언어 선택")}
                                locales={LOCALES.filter(
                                    (locale) => locale !== source.locale
                                )}
                                disabled={busy || dirty || pending}
                            />
                        </div>
                    </>
                )}
                {error && (
                    <p
                        role="alert"
                        className="text-sm text-red-600 dark:text-red-400"
                    >
                        <LocalizedText text={error} />
                    </p>
                )}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setOpen(false)}
                        className="min-h-11 bg-(--color-surface-subtle) text-(--color-foreground)"
                    >
                        <LocalizedText text="취소" />
                    </Button>
                    <Button
                        type="button"
                        disabled={
                            !target || busy || dirty || pending || disabled
                        }
                        onClick={() => void submit()}
                        className="min-h-11 bg-(--color-accent) text-(--color-on-accent) hover:bg-(--color-accent)/90"
                    >
                        {busy && (
                            <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        <LocalizedText text={busy ? "복사 중..." : "복사"} />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LanguageCopyButton;
