"use client";
import { LocalizedText, LocalizedElement } from "@/components/LocalizedText";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
    getLanguageSources,
    createLanguageVariant,
    getDocumentPublication,
    setDocumentPublication,
} from "@/app/admin/actions/content-variants";
import {
    bindContentAction,
    getEditingLocale,
    hasDirtyContent,
    subscribeContentState,
} from "@/lib/admin-content-state";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import type { VariantKind } from "@/lib/content-variants";

const copy = bindContentAction(createLanguageVariant);
const readPublication = bindContentAction(getDocumentPublication);
const savePublication = bindContentAction(setDocumentPublication);

// 명시적 원본 복사와 검토 뒤 언어별 공개
export const LanguageVariantTools = ({
    kind: initialKind,
    onCopied,
}: {
    kind: VariantKind;
    onCopied: () => void;
}) => {
    const [kind, setKind] = useState(initialKind);
    const [target, setTarget] = useState<Locale>("ko");
    const [source, setSource] = useState<Locale>("en");
    const [items, setItems] = useState<{ slug: string; title: string }[]>([]);
    const [slug, setSlug] = useState("");
    const [published, setPublished] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const dirty = useSyncExternalStore(
        subscribeContentState,
        hasDirtyContent,
        () => false
    );
    const documentKind = kind === "resume" || kind === "about";
    useEffect(() => {
        const current = getEditingLocale();
        setTarget(current);
        setSource(current === "ko" ? "en" : "ko");
        if (kind === "resume" || kind === "about")
            void readPublication(kind)
                .then(setPublished)
                .catch(() => setError("공개 상태 조회 실패"));
    }, [kind]);
    useEffect(() => {
        let active = true;
        setSlug("");
        if (!documentKind)
            void getLanguageSources(kind, source)
                .then((rows) => {
                    if (active) setItems(rows);
                })
                .catch(() => {
                    if (active) setError("원본 목록 조회 실패");
                });
        return () => {
            active = false;
        };
    }, [kind, source, documentKind]);
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-(--color-border) bg-(--color-surface) px-4 py-2 text-sm">
            {documentKind && (
                <button
                    type="button"
                    disabled={busy || dirty}
                    className={`rounded-md px-3 py-2 font-medium text-white disabled:opacity-50 ${published ? "bg-emerald-700" : "bg-amber-700"}`}
                    onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                            await savePublication(kind, !published);
                            setPublished(!published);
                        } catch (failure) {
                            setError(
                                failure instanceof Error
                                    ? failure.message
                                    : "공개 상태 저장 실패"
                            );
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    {published ? (
                        <LocalizedText text={"Published · 비공개로 변경"} />
                    ) : (
                        <LocalizedText text={"Draft · 검토 후 공개"} />
                    )}
                </button>
            )}
            <details>
                <summary className="cursor-pointer font-medium">
                    <LocalizedText text={"다른 언어에서 복사"} />
                </summary>
                <div className="flex flex-wrap items-center gap-2 py-3">
                    {initialKind === "portfolio" && (
                        <label>
                            <LocalizedText text={"콘텐츠 종류"} />{" "}
                            <LocalizedElement
                                as="select"
                                translatedProps={["aria-label"]}
                                aria-label="콘텐츠 종류"
                                value={kind}
                                onChange={(event) =>
                                    setKind(event.target.value as VariantKind)
                                }
                            >
                                <option value="portfolio">
                                    <LocalizedText text={"Portfolio"} />
                                </option>
                                <option value="book">
                                    <LocalizedText text={"Books"} />
                                </option>
                            </LocalizedElement>
                        </label>
                    )}
                    <label>
                        <LocalizedText text={"원본 언어"} />{" "}
                        <LocalizedElement
                            as="select"
                            translatedProps={["aria-label"]}
                            aria-label="원본 언어"
                            className="rounded-md border border-(--color-border) bg-(--color-surface) p-2"
                            value={source}
                            onChange={(event) =>
                                setSource(event.target.value as Locale)
                            }
                        >
                            {LOCALES.filter((locale) => locale !== target).map(
                                (locale) => (
                                    <option key={locale} value={locale}>
                                        {LOCALE_LABELS[locale]}
                                    </option>
                                )
                            )}
                        </LocalizedElement>
                    </label>
                    {!documentKind && (
                        <label>
                            <LocalizedText text={"원본 항목"} />{" "}
                            <LocalizedElement
                                as="select"
                                translatedProps={["aria-label"]}
                                aria-label="원본 항목"
                                value={slug}
                                onChange={(event) =>
                                    setSlug(event.target.value)
                                }
                                className="max-w-72 rounded-md border border-(--color-border) bg-(--color-surface) p-2"
                            >
                                <option value="">
                                    <LocalizedText text={"항목 선택"} />
                                </option>
                                {items.map((item) => (
                                    <option key={item.slug} value={item.slug}>
                                        {item.title}
                                    </option>
                                ))}
                            </LocalizedElement>
                        </label>
                    )}
                    <button
                        type="button"
                        disabled={busy || dirty || (!documentKind && !slug)}
                        className="rounded-md bg-(--color-accent) px-3 py-2 whitespace-nowrap text-white disabled:opacity-50"
                        onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                                await copy(kind, source, slug || undefined);
                                onCopied();
                            } catch (failure) {
                                setError(
                                    failure instanceof Error
                                        ? failure.message
                                        : "언어 사본 저장 실패"
                                );
                            } finally {
                                setBusy(false);
                            }
                        }}
                    >
                        <LocalizedText text={"현재 언어에 Draft 복사"} />
                    </button>
                    <p className="basis-full text-(--color-muted)">
                        <LocalizedText
                            text={
                                "기존 내용 덮어쓰기 없이 복사. 번역 검토·저장 후 공개 필요."
                            }
                        />
                    </p>
                </div>
            </details>
            {error && (
                <p role="alert" className="text-red-600">
                    {<LocalizedText text={error} />}
                </p>
            )}
        </div>
    );
};
