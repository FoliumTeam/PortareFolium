"use client";

import type { PortfolioEditorForm } from "@/lib/portfolio-admin";
import type {
    PortfolioCredit,
    PortfolioDevlog,
    PortfolioLink,
    PortfolioMedia,
    PortfolioOutcome,
} from "@/types/portfolio";

type PortfolioCaseStudyFieldsProps = {
    form: PortfolioEditorForm;
    onChange: (field: string, value: unknown) => void;
};

const inputClass =
    "min-h-10 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) shadow-sm focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none";
const groupClass =
    "space-y-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-3";
const labelClass = "text-sm font-semibold text-(--color-foreground)";
const helperClass = "text-xs leading-relaxed text-(--color-muted)";

const AddButton = ({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="rounded-lg bg-(--color-accent) px-3 py-2 text-xs font-bold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
        + {label}
    </button>
);

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
    >
        제거
    </button>
);

export default function PortfolioCaseStudyFields({
    form,
    onChange,
}: PortfolioCaseStudyFieldsProps) {
    const updateStringList = (
        field: "platforms" | "ownership",
        index: number,
        value: string
    ) => {
        const next = [...form[field]];
        next[index] = value;
        onChange(field, next);
    };

    const removeStringList = (
        field: "platforms" | "ownership",
        index: number
    ) => {
        onChange(
            field,
            form[field].filter((_, itemIndex) => itemIndex !== index)
        );
    };

    const updateOutcome = (index: number, patch: Partial<PortfolioOutcome>) => {
        onChange(
            "outcomes",
            form.outcomes.map((outcome, itemIndex) =>
                itemIndex === index ? { ...outcome, ...patch } : outcome
            )
        );
    };

    const updateMedia = (index: number, patch: Record<string, unknown>) => {
        onChange(
            "gallery",
            form.gallery.map((media, itemIndex) => {
                if (itemIndex !== index) return media;
                if (patch.type === "video") {
                    return {
                        type: "video",
                        src: media.src,
                        poster: "",
                        alt: media.alt,
                        ...(media.caption ? { caption: media.caption } : {}),
                    } satisfies PortfolioMedia;
                }
                if (patch.type === "image") {
                    return {
                        type: "image",
                        src: media.src,
                        alt: media.alt,
                        ...(media.caption ? { caption: media.caption } : {}),
                    } satisfies PortfolioMedia;
                }
                return { ...media, ...patch } as PortfolioMedia;
            })
        );
    };

    const updateLink = (index: number, patch: Partial<PortfolioLink>) => {
        onChange(
            "links",
            form.links.map((link, itemIndex) =>
                itemIndex === index ? { ...link, ...patch } : link
            )
        );
    };

    const updateDevlog = (index: number, patch: Partial<PortfolioDevlog>) => {
        onChange(
            "devlogs",
            form.devlogs.map((devlog, itemIndex) =>
                itemIndex === index ? { ...devlog, ...patch } : devlog
            )
        );
    };

    const updateCredit = (index: number, patch: Partial<PortfolioCredit>) => {
        onChange(
            "credits",
            form.credits.map((credit, itemIndex) =>
                itemIndex === index ? { ...credit, ...patch } : credit
            )
        );
    };

    return (
        <div className="space-y-5 border-t border-(--color-border) pt-5">
            <div className="space-y-1.5">
                <label
                    className={labelClass}
                    htmlFor="portfolio-case-study-version"
                >
                    사례 연구 형식
                </label>
                <select
                    id="portfolio-case-study-version"
                    value={form.caseStudyVersion}
                    onChange={(event) =>
                        onChange(
                            "caseStudyVersion",
                            event.target.value === "2" ? 2 : 1
                        )
                    }
                    className={inputClass}
                >
                    <option value="1">Legacy article</option>
                    <option value="2">Case Study v2</option>
                </select>
                <p className={helperClass}>
                    v2는 개인 기여, 결과, media와 두세 개의 Deep Dive를
                    사용합니다.
                </p>
            </div>

            {form.caseStudyVersion === 2 && (
                <>
                    <div className="space-y-1.5">
                        <label
                            className={labelClass}
                            htmlFor="portfolio-one-line-pitch"
                        >
                            한 줄 소개
                        </label>
                        <textarea
                            id="portfolio-one-line-pitch"
                            value={form.oneLinePitch}
                            maxLength={180}
                            rows={3}
                            onChange={(event) =>
                                onChange("oneLinePitch", event.target.value)
                            }
                            className={`${inputClass} resize-y`}
                        />
                        <p className={helperClass}>
                            {form.oneLinePitch.length}/180
                        </p>
                    </div>

                    <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <label
                                className={labelClass}
                                htmlFor="portfolio-engine"
                            >
                                Engine
                            </label>
                            <input
                                id="portfolio-engine"
                                value={form.engine}
                                maxLength={80}
                                onChange={(event) =>
                                    onChange("engine", event.target.value)
                                }
                                className={inputClass}
                            />
                        </div>
                        <div className={groupClass}>
                            <div className="flex items-center justify-between gap-2">
                                <p className={labelClass}>Platforms</p>
                                <AddButton
                                    label="Platform"
                                    disabled={form.platforms.length >= 5}
                                    onClick={() =>
                                        onChange("platforms", [
                                            ...form.platforms,
                                            "",
                                        ])
                                    }
                                />
                            </div>
                            {form.platforms.map((platform, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        value={platform}
                                        maxLength={80}
                                        aria-label={`Platform ${index + 1}`}
                                        onChange={(event) =>
                                            updateStringList(
                                                "platforms",
                                                index,
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    <RemoveButton
                                        onClick={() =>
                                            removeStringList("platforms", index)
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className={labelClass}>개인 기여</p>
                                <p className={helperClass}>
                                    팀 작업과 구분되는 소유 영역
                                </p>
                            </div>
                            <AddButton
                                label="기여"
                                disabled={form.ownership.length >= 5}
                                onClick={() =>
                                    onChange("ownership", [
                                        ...form.ownership,
                                        "",
                                    ])
                                }
                            />
                        </div>
                        {form.ownership.map((ownership, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <textarea
                                    value={ownership}
                                    maxLength={160}
                                    rows={2}
                                    aria-label={`개인 기여 ${index + 1}`}
                                    onChange={(event) =>
                                        updateStringList(
                                            "ownership",
                                            index,
                                            event.target.value
                                        )
                                    }
                                    className={`${inputClass} resize-y`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        removeStringList("ownership", index)
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className={labelClass}>결과와 근거</p>
                                <p className={helperClass}>
                                    검증 가능한 내용만 입력
                                </p>
                            </div>
                            <AddButton
                                label="결과"
                                disabled={form.outcomes.length >= 3}
                                onClick={() =>
                                    onChange("outcomes", [
                                        ...form.outcomes,
                                        { result: "", evidence: "" },
                                    ])
                                }
                            />
                        </div>
                        {form.outcomes.map((outcome, index) => (
                            <div
                                key={index}
                                className="space-y-2 rounded-xl border border-(--color-border) p-3"
                            >
                                <input
                                    value={outcome.result}
                                    maxLength={180}
                                    placeholder="결과"
                                    aria-label={`결과 ${index + 1}`}
                                    onChange={(event) =>
                                        updateOutcome(index, {
                                            result: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <textarea
                                    value={outcome.evidence ?? ""}
                                    maxLength={240}
                                    rows={2}
                                    placeholder="검증 방법 또는 근거"
                                    aria-label={`결과 근거 ${index + 1}`}
                                    onChange={(event) =>
                                        updateOutcome(index, {
                                            evidence: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} resize-y`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        onChange(
                                            "outcomes",
                                            form.outcomes.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index
                                            )
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className={labelClass}>Evidence Gallery</p>
                                <p className={helperClass}>
                                    image는 alt 필수, video는 poster 필수
                                </p>
                            </div>
                            <AddButton
                                label="Media"
                                disabled={form.gallery.length >= 8}
                                onClick={() =>
                                    onChange("gallery", [
                                        ...form.gallery,
                                        {
                                            type: "image",
                                            src: "",
                                            alt: "",
                                            caption: "",
                                        },
                                    ])
                                }
                            />
                        </div>
                        {form.gallery.map((media, index) => (
                            <div
                                key={index}
                                className="space-y-2 rounded-xl border border-(--color-border) p-3"
                            >
                                <select
                                    value={media.type}
                                    aria-label={`Media 형식 ${index + 1}`}
                                    onChange={(event) =>
                                        updateMedia(index, {
                                            type: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                                <input
                                    value={media.src}
                                    placeholder="relative 또는 R2 media URL"
                                    aria-label={`Media URL ${index + 1}`}
                                    onChange={(event) =>
                                        updateMedia(index, {
                                            src: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} font-mono`}
                                />
                                {media.type === "video" && (
                                    <input
                                        value={media.poster}
                                        placeholder="poster URL"
                                        aria-label={`Video poster ${index + 1}`}
                                        onChange={(event) =>
                                            updateMedia(index, {
                                                poster: event.target.value,
                                            })
                                        }
                                        className={`${inputClass} font-mono`}
                                    />
                                )}
                                <input
                                    value={media.alt}
                                    maxLength={180}
                                    placeholder="대체 텍스트"
                                    aria-label={`Media alt ${index + 1}`}
                                    onChange={(event) =>
                                        updateMedia(index, {
                                            alt: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <textarea
                                    value={media.caption ?? ""}
                                    maxLength={240}
                                    rows={2}
                                    placeholder="확인할 증거 설명"
                                    aria-label={`Media caption ${index + 1}`}
                                    onChange={(event) =>
                                        updateMedia(index, {
                                            caption: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} resize-y`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        onChange(
                                            "gallery",
                                            form.gallery.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index
                                            )
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <p className={labelClass}>Project Links</p>
                            <AddButton
                                label="Link"
                                disabled={form.links.length >= 4}
                                onClick={() =>
                                    onChange("links", [
                                        ...form.links,
                                        {
                                            kind: "demo",
                                            url: "",
                                            label: "Demo",
                                        },
                                    ])
                                }
                            />
                        </div>
                        {form.links.map((link, index) => (
                            <div
                                key={index}
                                className="tablet:grid-cols-[8rem_minmax(0,1fr)] grid grid-cols-1 gap-2 rounded-xl border border-(--color-border) p-3"
                            >
                                <select
                                    value={link.kind}
                                    aria-label={`Link kind ${index + 1}`}
                                    onChange={(event) =>
                                        updateLink(index, {
                                            kind: event.target
                                                .value as PortfolioLink["kind"],
                                        })
                                    }
                                    className={inputClass}
                                >
                                    <option value="demo">Demo</option>
                                    <option value="play">Play</option>
                                    <option value="release">Release</option>
                                    <option value="source">Source</option>
                                </select>
                                <input
                                    value={link.label}
                                    maxLength={80}
                                    placeholder="Label"
                                    aria-label={`Link label ${index + 1}`}
                                    onChange={(event) =>
                                        updateLink(index, {
                                            label: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    value={link.url}
                                    placeholder="relative 또는 HTTPS URL"
                                    aria-label={`Link URL ${index + 1}`}
                                    onChange={(event) =>
                                        updateLink(index, {
                                            url: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} tablet:col-span-2 font-mono`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        onChange(
                                            "links",
                                            form.links.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index
                                            )
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <p className={labelClass}>Devlogs</p>
                            <AddButton
                                label="Devlog"
                                disabled={form.devlogs.length >= 5}
                                onClick={() =>
                                    onChange("devlogs", [
                                        ...form.devlogs,
                                        { title: "", url: "" },
                                    ])
                                }
                            />
                        </div>
                        {form.devlogs.map((devlog, index) => (
                            <div
                                key={index}
                                className="tablet:grid-cols-2 grid grid-cols-1 gap-2 rounded-xl border border-(--color-border) p-3"
                            >
                                <input
                                    value={devlog.title}
                                    maxLength={180}
                                    placeholder="Title"
                                    aria-label={`Devlog title ${index + 1}`}
                                    onChange={(event) =>
                                        updateDevlog(index, {
                                            title: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    value={devlog.url}
                                    placeholder="relative 또는 HTTPS URL"
                                    aria-label={`Devlog URL ${index + 1}`}
                                    onChange={(event) =>
                                        updateDevlog(index, {
                                            url: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} font-mono`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        onChange(
                                            "devlogs",
                                            form.devlogs.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index
                                            )
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className={groupClass}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className={labelClass}>Credits</p>
                                <p className={helperClass}>
                                    팀 규모가 2명 이상이면 한 개 이상 필요
                                </p>
                            </div>
                            <AddButton
                                label="Credit"
                                disabled={form.credits.length >= 20}
                                onClick={() =>
                                    onChange("credits", [
                                        ...form.credits,
                                        { name: "", role: "", url: "" },
                                    ])
                                }
                            />
                        </div>
                        {form.credits.map((credit, index) => (
                            <div
                                key={index}
                                className="tablet:grid-cols-2 grid grid-cols-1 gap-2 rounded-xl border border-(--color-border) p-3"
                            >
                                <input
                                    value={credit.name}
                                    maxLength={120}
                                    placeholder="Name"
                                    aria-label={`Credit name ${index + 1}`}
                                    onChange={(event) =>
                                        updateCredit(index, {
                                            name: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    value={credit.role}
                                    maxLength={160}
                                    placeholder="Role"
                                    aria-label={`Credit role ${index + 1}`}
                                    onChange={(event) =>
                                        updateCredit(index, {
                                            role: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    value={credit.url ?? ""}
                                    placeholder="Optional URL"
                                    aria-label={`Credit URL ${index + 1}`}
                                    onChange={(event) =>
                                        updateCredit(index, {
                                            url: event.target.value,
                                        })
                                    }
                                    className={`${inputClass} tablet:col-span-2 font-mono`}
                                />
                                <RemoveButton
                                    onClick={() =>
                                        onChange(
                                            "credits",
                                            form.credits.filter(
                                                (_, itemIndex) =>
                                                    itemIndex !== index
                                            )
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
