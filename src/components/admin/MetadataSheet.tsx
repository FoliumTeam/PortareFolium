"use client";

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

// 포트폴리오 전용 폼 필드
interface PortfolioFields {
    slug: string;
    description: string;
    tags: string;
    jobField: string[];
    thumbnail: string;
    published: boolean;
    featured: boolean;
    startDate: string;
    endDate: string;
    goal: string;
    role: string;
    teamSize: string;
    github: string;
    liveUrl: string;
    meta_title: string;
    meta_description: string;
    og_image: string;
}

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

// 입력 필드 공통 스타일
const inputClass =
    "w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none";
const labelClass = "text-sm font-medium text-(--color-muted)";

export default function MetadataSheet(props: MetadataSheetProps) {
    const { open, onOpenChange, type, form, onChange, jobFields } = props;
    const onPublishToggle = (props as PostSheetProps).onPublishToggle;

    const title =
        type === "post"
            ? "포스트 설정"
            : type === "portfolio"
              ? "포트폴리오 설정"
              : "도서 설정";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-x-hidden overflow-y-auto bg-(--color-surface)">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        메타데이터 및 발행 설정
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 px-4 pb-8">
                    {/* 발행 설정 */}
                    <section className="space-y-4">
                        <h4 className="text-sm font-semibold text-(--color-foreground)">
                            발행
                        </h4>

                        <div className="flex items-center justify-between">
                            <Label className={labelClass}>
                                {form.published ? "Published" : "Draft"}
                            </Label>
                            <Switch
                                checked={form.published}
                                onCheckedChange={(v) => {
                                    onChange("published", v);
                                    onPublishToggle?.(v);
                                }}
                            />
                        </div>

                        {(type === "portfolio" || type === "book") && (
                            <div className="flex items-center justify-between">
                                <Label className={labelClass}>Featured</Label>
                                <Switch
                                    checked={
                                        (form as PortfolioFields | BookFields)
                                            .featured
                                    }
                                    onCheckedChange={(v) =>
                                        onChange("featured", v)
                                    }
                                />
                            </div>
                        )}

                        {type === "post" && (
                            <div>
                                <Label className={labelClass}>발행일</Label>
                                <input
                                    type="datetime-local"
                                    value={(form as PostFields).pub_date}
                                    onChange={(e) =>
                                        onChange("pub_date", e.target.value)
                                    }
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </section>

                    <Separator />

                    {/* 메타데이터 */}
                    <section className="space-y-4">
                        <h4 className="text-sm font-semibold text-(--color-foreground)">
                            메타데이터
                        </h4>

                        <div>
                            <Label className={labelClass}>Slug</Label>
                            <input
                                type="text"
                                value={form.slug}
                                onChange={(e) =>
                                    onChange("slug", e.target.value)
                                }
                                className={`${inputClass} font-mono`}
                            />
                        </div>

                        {type !== "book" && (
                            <div>
                                <Label className={labelClass}>요약</Label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) =>
                                        onChange("description", e.target.value)
                                    }
                                    rows={2}
                                    className={`${inputClass} resize-y`}
                                />
                            </div>
                        )}

                        {type === "book" && (
                            <>
                                <div>
                                    <Label className={labelClass}>저자</Label>
                                    <input
                                        type="text"
                                        value={(form as BookFields).author}
                                        onChange={(e) =>
                                            onChange("author", e.target.value)
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <Label className={labelClass}>
                                        한줄 소개
                                    </Label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            onChange(
                                                "description",
                                                e.target.value
                                            )
                                        }
                                        rows={2}
                                        className={`${inputClass} resize-y`}
                                    />
                                </div>
                                <div>
                                    <Label className={labelClass}>평점</Label>
                                    <div className="flex items-center gap-2 pt-1">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() =>
                                                    onChange(
                                                        "rating",
                                                        (form as BookFields)
                                                            .rating === n
                                                            ? null
                                                            : n
                                                    )
                                                }
                                                className={`text-lg ${
                                                    (form as BookFields)
                                                        .rating !== null &&
                                                    n <=
                                                        (form as BookFields)
                                                            .rating!
                                                        ? "text-(--color-accent)"
                                                        : "text-(--color-border)"
                                                }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className={labelClass}>순서</Label>
                                    <input
                                        type="number"
                                        value={(form as BookFields).order_idx}
                                        onChange={(e) =>
                                            onChange(
                                                "order_idx",
                                                Number(e.target.value)
                                            )
                                        }
                                        className={`${inputClass} w-24`}
                                    />
                                </div>
                            </>
                        )}

                        {type === "post" && (
                            <div>
                                <Label className={labelClass}>카테고리</Label>
                                <CategorySelect
                                    value={(form as PostFields).category}
                                    onChange={(v) => onChange("category", v)}
                                    options={
                                        (props as PostSheetProps).categories
                                    }
                                    placeholder="선택 또는 새로 입력"
                                />
                            </div>
                        )}

                        {type === "post" && (
                            <div>
                                <Label className={labelClass}>태그</Label>
                                <TagSelector
                                    value={form.tags}
                                    onChange={(v) => onChange("tags", v)}
                                />
                            </div>
                        )}
                        {type === "book" && (
                            <div>
                                <Label className={labelClass}>태그</Label>
                                <input
                                    type="text"
                                    value={form.tags}
                                    onChange={(e) =>
                                        onChange("tags", e.target.value)
                                    }
                                    placeholder="쉼표로 구분"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <JobFieldSelector
                            value={form.jobField}
                            fields={jobFields}
                            onChange={(v) => onChange("jobField", v)}
                        />

                        {type !== "book" && (
                            <ThumbnailUploadField
                                value={
                                    type === "post"
                                        ? (form as PostFields).thumbnail
                                        : (form as PortfolioFields).thumbnail
                                }
                                onChange={(url) => onChange("thumbnail", url)}
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
                                onChange={(url) => onChange("cover_url", url)}
                                folderPath="books"
                            />
                        )}
                    </section>

                    {/* 포트폴리오 프로젝트 상세 */}
                    {type === "portfolio" && (
                        <>
                            <Separator />
                            <section className="space-y-4">
                                <h4 className="text-sm font-semibold text-(--color-foreground)">
                                    프로젝트 상세
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className={labelClass}>
                                            시작일
                                        </Label>
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
                                    </div>
                                    <div>
                                        <Label className={labelClass}>
                                            종료일
                                        </Label>
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
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className={labelClass}>
                                            역할
                                        </Label>
                                        <input
                                            type="text"
                                            value={
                                                (form as PortfolioFields).role
                                            }
                                            onChange={(e) =>
                                                onChange("role", e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <Label className={labelClass}>
                                            팀 규모
                                        </Label>
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
                                    </div>
                                </div>
                                <div>
                                    <Label className={labelClass}>
                                        목표/기획 의도
                                    </Label>
                                    <textarea
                                        value={(form as PortfolioFields).goal}
                                        onChange={(e) =>
                                            onChange("goal", e.target.value)
                                        }
                                        rows={2}
                                        className={`${inputClass} resize-y`}
                                    />
                                </div>
                                <div>
                                    <Label className={labelClass}>
                                        GitHub URL
                                    </Label>
                                    <input
                                        type="text"
                                        value={(form as PortfolioFields).github}
                                        onChange={(e) =>
                                            onChange("github", e.target.value)
                                        }
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                                <div>
                                    <Label className={labelClass}>
                                        라이브 URL
                                    </Label>
                                    <input
                                        type="text"
                                        value={
                                            (form as PortfolioFields).liveUrl
                                        }
                                        onChange={(e) =>
                                            onChange("liveUrl", e.target.value)
                                        }
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                            </section>
                        </>
                    )}

                    {/* 포스트 목차 설정 */}
                    {type === "post" &&
                        (props as PostSheetProps).onTocStyleChange && (
                            <>
                                <Separator />
                                <section className="space-y-4">
                                    <h4 className="text-sm font-semibold text-(--color-foreground)">
                                        목차 (TOC) 설정
                                    </h4>
                                    <select
                                        value={
                                            (props as PostSheetProps)
                                                .tocStyle ?? "hover"
                                        }
                                        onChange={(e) =>
                                            (
                                                props as PostSheetProps
                                            ).onTocStyleChange?.(e.target.value)
                                        }
                                        disabled={
                                            (props as PostSheetProps)
                                                .tocDisabled
                                        }
                                        className={inputClass}
                                    >
                                        <option value="hover">
                                            호버링 사이드바 목차
                                        </option>
                                        <option value="github">
                                            GitHub 형식 목차 (본문 상단)
                                        </option>
                                        <option value="both">둘 다 표시</option>
                                    </select>
                                </section>
                            </>
                        )}

                    <Separator />

                    {/* SEO 설정 */}
                    <section className="space-y-4">
                        <h4 className="text-sm font-semibold text-(--color-foreground)">
                            SEO
                        </h4>
                        <div>
                            <Label className={labelClass}>
                                SEO 제목 (Meta Title)
                            </Label>
                            <input
                                type="text"
                                value={form.meta_title}
                                onChange={(e) =>
                                    onChange("meta_title", e.target.value)
                                }
                                placeholder="비워두면 제목이 사용됩니다"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <Label className={labelClass}>
                                SEO 설명 (Meta Description)
                            </Label>
                            <textarea
                                value={form.meta_description}
                                onChange={(e) =>
                                    onChange("meta_description", e.target.value)
                                }
                                rows={2}
                                placeholder="비워두면 요약이 사용됩니다"
                                className={`${inputClass} resize-y`}
                            />
                        </div>
                        {type !== "book" && (
                            <ThumbnailUploadField
                                value={form.og_image}
                                onChange={(url) => onChange("og_image", url)}
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
                            <div>
                                <Label className={labelClass}>
                                    OG Image URL
                                </Label>
                                <input
                                    type="text"
                                    value={form.og_image}
                                    onChange={(e) =>
                                        onChange("og_image", e.target.value)
                                    }
                                    className={inputClass}
                                />
                            </div>
                        )}
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}
