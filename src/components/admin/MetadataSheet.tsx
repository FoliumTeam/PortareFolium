"use client";

import type { ReactNode } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TagSelector from "@/components/admin/TagSelector";
import CategorySelect from "@/components/admin/CategorySelect";
import ThumbnailUploadField from "@/components/admin/ThumbnailUploadField";
import PortfolioCaseStudyFields from "@/components/admin/PortfolioCaseStudyFields";
import type { PortfolioEditorForm } from "@/lib/portfolio-admin";
import {
    JobFieldSelector,
    type JobFieldItem,
} from "@/components/admin/JobFieldSelector";

// 포스트 전용 폼 필드
interface PostFields {
    slug: string;
    description: string;
    pub_date: string;
    category: string;
    tags: string;
    jobField: string[];
    thumbnail: string;
    published: boolean;
    meta_title: string;
    meta_description: string;
    og_image: string;
}

type PortfolioFields = PortfolioEditorForm;

// 도서 전용 폼 필드
interface BookFields {
    slug: string;
    author: string;
    cover_url: string;
    description: string;
    tags: string;
    jobField: string[];
    published: boolean;
    featured: boolean;
    rating: number | null;
    order_idx: number;
    meta_title: string;
    meta_description: string;
    og_image: string;
}

// 포스트 Sheet Props
interface PostSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "post";
    form: PostFields;
    onChange: (field: string, value: unknown) => void;
    onPublishToggle?: (published: boolean) => void;
    jobFields: JobFieldItem[];
    categories: string[];
    onCreateCategory?: (value: string) => boolean | Promise<boolean>;
    tocStyle?: string;
    onTocStyleChange?: (style: string) => void;
    tocDisabled?: boolean;
    folderPath?: string;
}

// 포트폴리오 Sheet Props
interface PortfolioSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "portfolio";
    form: PortfolioFields;
    onChange: (field: string, value: unknown) => void;
    onPublishToggle?: (published: boolean) => void;
    showPublishControl?: boolean;
    jobFields: JobFieldItem[];
    folderPath?: string;
}

// 도서 Sheet Props
interface BookSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "book";
    form: BookFields;
    onChange: (field: string, value: unknown) => void;
    onPublishToggle?: (published: boolean) => void;
    jobFields: JobFieldItem[];
}

type MetadataSheetProps = PostSheetProps | PortfolioSheetProps | BookSheetProps;

type SettingsSectionProps = {
    eyebrow: string;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
};

type FieldBlockProps = {
    label: string;
    helper?: string;
    children: ReactNode;
    className?: string;
};

// 입력 필드 공통 스타일
const inputClass =
    "min-h-10 w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) shadow-sm focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "text-sm font-semibold text-(--color-foreground)";
const helperClass = "mt-1 text-xs leading-relaxed text-(--color-muted)";
const cardClass =
    "rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-4 shadow-sm";

function SettingsSection({
    eyebrow,
    title,
    description,
    children,
    className = "",
}: SettingsSectionProps) {
    return (
        <section className={`${cardClass} ${className}`}>
            <div className="mb-4 space-y-1">
                <p className="text-xs font-bold tracking-[0.16em] text-(--color-muted) uppercase">
                    {eyebrow}
                </p>
                <h4 className="text-base font-bold text-(--color-foreground)">
                    {title}
                </h4>
                {description && <p className={helperClass}>{description}</p>}
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function FieldBlock({
    label,
    helper,
    children,
    className = "",
}: FieldBlockProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className={labelClass}>{label}</Label>
            {children}
            {helper && <p className={helperClass}>{helper}</p>}
        </div>
    );
}

export default function MetadataSheet(props: MetadataSheetProps) {
    const { open, onOpenChange, type, form, onChange, jobFields } = props;
    const onPublishToggle = (props as PostSheetProps).onPublishToggle;
    const showPublishControl =
        type === "portfolio" ? props.showPublishControl !== false : true;

    const title =
        type === "post"
            ? "포스트 설정"
            : type === "portfolio"
              ? "포트폴리오 설정"
              : "도서 설정";
    const typeLabel =
        type === "post"
            ? "Blog post"
            : type === "portfolio"
              ? "Portfolio"
              : "Book";

    const statusBadgeClass = form.published
        ? "border-green-700 bg-green-600 text-white dark:border-green-500 dark:bg-green-600 dark:text-white"
        : "border-amber-700 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-600 dark:text-white";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="laptop:max-w-5xl desktop:max-w-7xl max-h-[88vh] w-full overflow-hidden border-(--color-border) bg-(--color-surface) p-0 shadow-2xl">
                <DialogHeader className="laptop:px-6 border-b border-(--color-border) bg-(--color-surface) px-5 py-5 text-left">
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                        <div className="min-w-0 space-y-2">
                            <p className="text-xs font-bold tracking-[0.18em] text-(--color-muted) uppercase">
                                {typeLabel} settings
                            </p>
                            <DialogTitle className="text-2xl font-black tracking-tight text-(--color-foreground)">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-(--color-muted)">
                                발행 상태, 분류, 미디어, SEO 정보를 한 곳에서
                                정리합니다.
                            </DialogDescription>
                        </div>
                        <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold tracking-[0.08em] uppercase ${statusBadgeClass}`}
                        >
                            {form.published ? "Published" : "Draft"}
                        </span>
                    </div>
                </DialogHeader>

                <div className="laptop:px-6 max-h-[calc(88vh-8rem)] overflow-x-hidden overflow-y-auto px-4 py-5">
                    <div className="grid min-w-0 grid-cols-1 gap-4">
                        <div className="contents">
                            <SettingsSection
                                eyebrow="Publish"
                                title="발행 상태"
                                description="공개 여부와 표시 우선순위를 빠르게 제어합니다."
                                className="order-1"
                            >
                                <div className="tablet:grid-cols-2 grid gap-3">
                                    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className={labelClass}>
                                                    {form.published
                                                        ? "Published"
                                                        : "Draft"}
                                                </p>
                                                <p className={helperClass}>
                                                    {form.published
                                                        ? "프론트엔드에 공개됩니다."
                                                        : "관리자에서만 보입니다."}
                                                </p>
                                            </div>
                                            {showPublishControl ? (
                                                <Switch
                                                    checked={form.published}
                                                    onCheckedChange={(v) => {
                                                        if (onPublishToggle) {
                                                            onPublishToggle(v);
                                                            return;
                                                        }
                                                        onChange(
                                                            "published",
                                                            v
                                                        );
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-xs font-semibold text-(--color-muted)">
                                                    저장 시 자동 공개
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {(type === "portfolio" ||
                                        type === "book") && (
                                        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className={labelClass}>
                                                        Featured
                                                    </p>
                                                    <p className={helperClass}>
                                                        주요 콘텐츠 영역에
                                                        노출합니다.
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={
                                                        (
                                                            form as
                                                                | PortfolioFields
                                                                | BookFields
                                                        ).featured
                                                    }
                                                    onCheckedChange={(v) =>
                                                        onChange("featured", v)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {type === "post" && (
                                    <FieldBlock
                                        label="발행일"
                                        helper="KST 기준으로 저장되며 목록 정렬에 사용됩니다."
                                    >
                                        <input
                                            type="datetime-local"
                                            value={
                                                (form as PostFields).pub_date
                                            }
                                            onChange={(e) =>
                                                onChange(
                                                    "pub_date",
                                                    e.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </FieldBlock>
                                )}
                            </SettingsSection>

                            <SettingsSection
                                eyebrow="Metadata"
                                title="기본 정보"
                                description="URL, 요약, 도서/프로젝트 전용 필드를 관리합니다."
                                className="order-2"
                            >
                                <FieldBlock
                                    label="Slug"
                                    helper="URL과 이미지 폴더 식별자로 쓰입니다."
                                >
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={(e) =>
                                            onChange("slug", e.target.value)
                                        }
                                        className={`${inputClass} font-mono`}
                                    />
                                </FieldBlock>

                                {type !== "book" && (
                                    <FieldBlock label="요약">
                                        <textarea
                                            value={form.description}
                                            onChange={(e) =>
                                                onChange(
                                                    "description",
                                                    e.target.value
                                                )
                                            }
                                            rows={3}
                                            className={`${inputClass} resize-y`}
                                        />
                                    </FieldBlock>
                                )}

                                {type === "portfolio" && (
                                    <FieldBlock
                                        label="기술 태그"
                                        helper="쉼표로 구분해 입력하며 공개 카드와 기술 스택에 반영됩니다."
                                    >
                                        <input
                                            type="text"
                                            value={form.tags}
                                            onChange={(e) =>
                                                onChange("tags", e.target.value)
                                            }
                                            placeholder="예: Rust, CLI, SQLite"
                                            className={inputClass}
                                        />
                                    </FieldBlock>
                                )}

                                {type === "portfolio" && (
                                    <FieldBlock
                                        label="표시 순서"
                                        helper="Selected와 Other 그룹 안에서 낮은 숫자가 먼저 표시됩니다."
                                    >
                                        <input
                                            type="number"
                                            value={
                                                (form as PortfolioFields)
                                                    .order_idx
                                            }
                                            onChange={(event) =>
                                                onChange(
                                                    "order_idx",
                                                    Number(event.target.value)
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </FieldBlock>
                                )}

                                {type === "book" && (
                                    <>
                                        <div className="tablet:grid-cols-[minmax(0,1fr)_8rem] grid gap-3">
                                            <FieldBlock label="저자">
                                                <input
                                                    type="text"
                                                    value={
                                                        (form as BookFields)
                                                            .author
                                                    }
                                                    onChange={(e) =>
                                                        onChange(
                                                            "author",
                                                            e.target.value
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            </FieldBlock>
                                            <FieldBlock label="순서">
                                                <input
                                                    type="number"
                                                    value={
                                                        (form as BookFields)
                                                            .order_idx
                                                    }
                                                    onChange={(e) =>
                                                        onChange(
                                                            "order_idx",
                                                            Number(
                                                                e.target.value
                                                            )
                                                        )
                                                    }
                                                    className={inputClass}
                                                />
                                            </FieldBlock>
                                        </div>
                                        <FieldBlock label="한줄 소개">
                                            <textarea
                                                value={form.description}
                                                onChange={(e) =>
                                                    onChange(
                                                        "description",
                                                        e.target.value
                                                    )
                                                }
                                                rows={3}
                                                className={`${inputClass} resize-y`}
                                            />
                                        </FieldBlock>
                                        <FieldBlock label="평점">
                                            <div className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2">
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() =>
                                                            onChange(
                                                                "rating",
                                                                (
                                                                    form as BookFields
                                                                ).rating === n
                                                                    ? null
                                                                    : n
                                                            )
                                                        }
                                                        className={`text-2xl leading-none transition-opacity hover:opacity-80 ${
                                                            (form as BookFields)
                                                                .rating !==
                                                                null &&
                                                            n <=
                                                                (
                                                                    form as BookFields
                                                                ).rating!
                                                                ? "text-(--color-accent)"
                                                                : "text-(--color-border)"
                                                        }`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </FieldBlock>
                                    </>
                                )}
                            </SettingsSection>

                            {type === "portfolio" && (
                                <SettingsSection
                                    eyebrow="Project"
                                    title="프로젝트 상세"
                                    description="기간, 역할, 목표와 성과를 포트폴리오 카드에 반영합니다."
                                    className="order-2"
                                >
                                    <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3">
                                        <FieldBlock label="시작일">
                                            <input
                                                type="text"
                                                value={
                                                    (form as PortfolioFields)
                                                        .startDate
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "startDate",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="2024-01-01"
                                                className={inputClass}
                                            />
                                        </FieldBlock>
                                        <FieldBlock label="종료일">
                                            <input
                                                type="text"
                                                value={
                                                    (form as PortfolioFields)
                                                        .endDate
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "endDate",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="진행 중이면 비워두세요"
                                                className={inputClass}
                                            />
                                        </FieldBlock>
                                    </div>
                                    <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3">
                                        <FieldBlock label="역할">
                                            <input
                                                type="text"
                                                value={
                                                    (form as PortfolioFields)
                                                        .role
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "role",
                                                        e.target.value
                                                    )
                                                }
                                                className={inputClass}
                                            />
                                        </FieldBlock>
                                        <FieldBlock label="팀 규모">
                                            <input
                                                type="number"
                                                value={
                                                    (form as PortfolioFields)
                                                        .teamSize
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "teamSize",
                                                        e.target.value
                                                    )
                                                }
                                                className={inputClass}
                                            />
                                        </FieldBlock>
                                    </div>
                                    <FieldBlock label="목표/기획 의도">
                                        <textarea
                                            value={
                                                (form as PortfolioFields).goal
                                            }
                                            onChange={(e) =>
                                                onChange("goal", e.target.value)
                                            }
                                            rows={3}
                                            className={`${inputClass} resize-y`}
                                        />
                                    </FieldBlock>
                                    <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3">
                                        <FieldBlock label="GitHub URL">
                                            <input
                                                type="text"
                                                value={
                                                    (form as PortfolioFields)
                                                        .github
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "github",
                                                        e.target.value
                                                    )
                                                }
                                                className={`${inputClass} font-mono`}
                                            />
                                        </FieldBlock>
                                        <FieldBlock label="라이브 URL">
                                            <input
                                                type="text"
                                                value={
                                                    (form as PortfolioFields)
                                                        .liveUrl
                                                }
                                                onChange={(e) =>
                                                    onChange(
                                                        "liveUrl",
                                                        e.target.value
                                                    )
                                                }
                                                className={`${inputClass} font-mono`}
                                            />
                                        </FieldBlock>
                                    </div>
                                    <FieldBlock label="성과 (한 줄에 하나씩)">
                                        <textarea
                                            value={
                                                (form as PortfolioFields)
                                                    .accomplishments
                                            }
                                            onChange={(e) =>
                                                onChange(
                                                    "accomplishments",
                                                    e.target.value
                                                )
                                            }
                                            rows={5}
                                            placeholder="성과 항목을 한 줄에 하나씩 입력하세요"
                                            className={`${inputClass} resize-y`}
                                        />
                                    </FieldBlock>
                                    <PortfolioCaseStudyFields
                                        form={form as PortfolioFields}
                                        onChange={onChange}
                                    />
                                </SettingsSection>
                            )}

                            <SettingsSection
                                eyebrow="SEO"
                                title="검색 및 공유 메타데이터"
                                description="검색 결과와 SNS 공유 카드에 표시되는 정보를 조정합니다."
                                className="order-6"
                            >
                                <FieldBlock
                                    label="SEO 제목 (Meta Title)"
                                    helper="비워두면 콘텐츠 제목이 사용됩니다."
                                >
                                    <input
                                        type="text"
                                        value={form.meta_title}
                                        onChange={(e) =>
                                            onChange(
                                                "meta_title",
                                                e.target.value
                                            )
                                        }
                                        placeholder="비워두면 제목이 사용됩니다"
                                        className={inputClass}
                                    />
                                </FieldBlock>
                                <FieldBlock
                                    label="SEO 설명 (Meta Description)"
                                    helper="비워두면 요약이 사용됩니다."
                                >
                                    <textarea
                                        value={form.meta_description}
                                        onChange={(e) =>
                                            onChange(
                                                "meta_description",
                                                e.target.value
                                            )
                                        }
                                        rows={3}
                                        placeholder="비워두면 요약이 사용됩니다"
                                        className={`${inputClass} resize-y`}
                                    />
                                </FieldBlock>
                                {type !== "book" && (
                                    <ThumbnailUploadField
                                        value={form.og_image}
                                        onChange={(url) =>
                                            onChange("og_image", url)
                                        }
                                        placeholder="OG Image URL"
                                        folderPath={
                                            (
                                                props as
                                                    | PostSheetProps
                                                    | PortfolioSheetProps
                                            ).folderPath
                                        }
                                    />
                                )}
                                {type === "book" && (
                                    <FieldBlock label="OG Image URL">
                                        <input
                                            type="text"
                                            value={form.og_image}
                                            onChange={(e) =>
                                                onChange(
                                                    "og_image",
                                                    e.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </FieldBlock>
                                )}
                            </SettingsSection>
                        </div>

                        <aside className="contents">
                            <SettingsSection
                                eyebrow="Taxonomy"
                                title="분류"
                                description="콘텐츠 탐색과 필터링에 쓰이는 분류 정보를 설정합니다."
                                className="order-4"
                            >
                                {type === "post" && (
                                    <FieldBlock
                                        label="카테고리"
                                        helper="기존 카테고리를 선택하거나 새 카테고리를 즉시 생성합니다."
                                    >
                                        <CategorySelect
                                            value={
                                                (form as PostFields).category
                                            }
                                            onChange={(v) =>
                                                onChange("category", v)
                                            }
                                            options={
                                                (props as PostSheetProps)
                                                    .categories
                                            }
                                            onCreate={
                                                (props as PostSheetProps)
                                                    .onCreateCategory
                                            }
                                            placeholder="선택 또는 생성"
                                        />
                                    </FieldBlock>
                                )}

                                {type === "post" && (
                                    <FieldBlock label="태그">
                                        <TagSelector
                                            value={form.tags}
                                            onChange={(v) =>
                                                onChange("tags", v)
                                            }
                                        />
                                    </FieldBlock>
                                )}
                                {type === "book" && (
                                    <FieldBlock label="태그">
                                        <input
                                            type="text"
                                            value={form.tags}
                                            onChange={(e) =>
                                                onChange("tags", e.target.value)
                                            }
                                            placeholder="쉼표로 구분"
                                            className={inputClass}
                                        />
                                    </FieldBlock>
                                )}

                                <JobFieldSelector
                                    value={form.jobField}
                                    fields={jobFields}
                                    onChange={(v) => onChange("jobField", v)}
                                />
                            </SettingsSection>

                            <SettingsSection
                                eyebrow="Media"
                                title="대표 이미지"
                                description="목록 카드, 상세 페이지, 공유 썸네일의 기본 이미지를 설정합니다."
                                className="order-3"
                            >
                                {type !== "book" && (
                                    <ThumbnailUploadField
                                        value={
                                            type === "post"
                                                ? (form as PostFields).thumbnail
                                                : (form as PortfolioFields)
                                                      .thumbnail
                                        }
                                        onChange={(url) =>
                                            onChange("thumbnail", url)
                                        }
                                        folderPath={
                                            (
                                                props as
                                                    | PostSheetProps
                                                    | PortfolioSheetProps
                                            ).folderPath
                                        }
                                    />
                                )}

                                {type === "book" && (
                                    <ThumbnailUploadField
                                        value={(form as BookFields).cover_url}
                                        onChange={(url) =>
                                            onChange("cover_url", url)
                                        }
                                        folderPath="books"
                                    />
                                )}
                            </SettingsSection>

                            {type === "post" &&
                                (props as PostSheetProps).onTocStyleChange && (
                                    <SettingsSection
                                        eyebrow="TOC"
                                        title="목차 표시"
                                        description="본문 목차의 위치를 선택합니다. 선택 즉시 저장되며 공개 포스트에 반영됩니다."
                                        className="order-5"
                                    >
                                        <div className="grid gap-2">
                                            {[
                                                {
                                                    value: "hover",
                                                    title: "사이드바 목차",
                                                    description:
                                                        "본문 옆에서 hover로 열기",
                                                },
                                                {
                                                    value: "github",
                                                    title: "본문 상단 목차",
                                                    description:
                                                        "GitHub처럼 본문 시작에 표시",
                                                },
                                                {
                                                    value: "both",
                                                    title: "두 위치 모두",
                                                    description:
                                                        "사이드바와 본문 상단 함께 표시",
                                                },
                                            ].map((option) => {
                                                const selected =
                                                    ((props as PostSheetProps)
                                                        .tocStyle ??
                                                        "hover") ===
                                                    option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        aria-pressed={selected}
                                                        disabled={
                                                            (
                                                                props as PostSheetProps
                                                            ).tocDisabled
                                                        }
                                                        onClick={() =>
                                                            (
                                                                props as PostSheetProps
                                                            ).onTocStyleChange?.(
                                                                option.value
                                                            )
                                                        }
                                                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                                                            selected
                                                                ? "border-(--color-accent) bg-(--color-accent)/8 ring-1 ring-(--color-accent)/30"
                                                                : "border-(--color-border) bg-(--color-surface-subtle)/55 hover:border-(--color-accent)/50"
                                                        }`}
                                                    >
                                                        <span className="flex h-12 w-16 shrink-0 rounded-lg border border-(--color-border) bg-(--color-surface) p-2">
                                                            {option.value !==
                                                            "github" ? (
                                                                <i className="mr-1 w-2 rounded bg-(--color-accent)/40" />
                                                            ) : null}
                                                            <span className="flex-1 space-y-1 pt-1">
                                                                {option.value !==
                                                                "hover" ? (
                                                                    <i className="block h-1 w-3/4 rounded bg-(--color-accent)/45" />
                                                                ) : null}
                                                                <i className="block h-1 w-full rounded bg-(--color-muted)/35" />
                                                                <i className="block h-1 w-4/5 rounded bg-(--color-muted)/35" />
                                                            </span>
                                                        </span>
                                                        <span>
                                                            <span className="block text-sm font-semibold text-(--color-foreground)">
                                                                {option.title}
                                                            </span>
                                                            <span className="mt-1 block text-xs leading-5 text-(--color-muted)">
                                                                {
                                                                    option.description
                                                                }
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </SettingsSection>
                                )}
                        </aside>
                    </div>

                    <Separator className="mt-5" />
                    <p className="px-1 pt-4 text-xs text-(--color-muted)">
                        변경 사항은 에디터 화면의 저장 버튼을 눌러 최종
                        반영됩니다.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
