import { normalizeUniqueJobFieldList } from "@/lib/job-field";
import { EDITABLE_PORTFOLIO_DATA_KEYS } from "@/types/portfolio";
import type {
    PortfolioCredit,
    PortfolioDevlog,
    PortfolioLink,
    PortfolioMedia,
    PortfolioOutcome,
} from "@/types/portfolio";

export type PortfolioAdminItem = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail: string | null;
    content: string;
    data: Record<string, unknown>;
    featured: boolean;
    order_idx: number;
    published: boolean;
    job_field: string[] | string | null;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

export type PortfolioEditorForm = {
    slug: string;
    title: string;
    description: string;
    tags: string;
    thumbnail: string;
    content: string;
    featured: boolean;
    order_idx: number;
    published: boolean;
    startDate: string;
    endDate: string;
    goal: string;
    role: string;
    teamSize: string;
    github: string;
    liveUrl: string;
    accomplishments: string;
    jobField: string[];
    caseStudyVersion: 1 | 2;
    oneLinePitch: string;
    engine: string;
    platforms: string[];
    ownership: string[];
    outcomes: PortfolioOutcome[];
    gallery: PortfolioMedia[];
    links: PortfolioLink[];
    devlogs: PortfolioDevlog[];
    credits: PortfolioCredit[];
    meta_title: string;
    meta_description: string;
    og_image: string;
};

export type PortfolioSavePayload = {
    slug: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail: string | null;
    content: string;
    featured: boolean;
    order_idx: number;
    published: boolean;
    job_field: string | null;
    data: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

export const PORTFOLIO_DEEP_DIVE_TEMPLATE = `## [핵심 기술 의사결정 1]

### Problem

[해결할 사용자 또는 기술 문제]

### Decision

[선택한 접근과 이유]

### Implementation

[핵심 구현과 필요한 짧은 code]

### Result

[검증 결과와 근거]

### Trade-off

[남은 제한 또는 비용]

## [핵심 기술 의사결정 2]

### Problem

[해결할 사용자 또는 기술 문제]

### Decision

[선택한 접근과 이유]

### Implementation

[핵심 구현과 필요한 짧은 code]

### Result

[검증 결과와 근거]

### Trade-off

[남은 제한 또는 비용]

{/* Optional third Deep Dive
## [핵심 기술 의사결정 3]
### Problem
[문제]
### Decision
[결정]
### Implementation
[구현]
### Result
[결과]
### Trade-off
[trade-off]
*/}`;

export const EMPTY_PORTFOLIO_FORM: PortfolioEditorForm = {
    slug: "",
    title: "",
    description: "",
    tags: "",
    thumbnail: "",
    content: "",
    featured: false,
    order_idx: 0,
    published: false,
    startDate: "",
    endDate: "",
    goal: "",
    role: "",
    teamSize: "",
    github: "",
    liveUrl: "",
    accomplishments: "",
    jobField: [],
    caseStudyVersion: 1,
    oneLinePitch: "",
    engine: "",
    platforms: [],
    ownership: [],
    outcomes: [],
    gallery: [],
    links: [],
    devlogs: [],
    credits: [],
    meta_title: "",
    meta_description: "",
    og_image: "",
};

const objectArray = <T extends Record<string, unknown>>(value: unknown): T[] =>
    Array.isArray(value)
        ? value.filter(
              (entry): entry is T => entry !== null && typeof entry === "object"
          )
        : [];

const stringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];

export const itemToPortfolioForm = (
    item: PortfolioAdminItem
): PortfolioEditorForm => {
    const data = item.data ?? {};
    return {
        slug: item.slug,
        title: item.title,
        description: item.description ?? "",
        tags: item.tags.join(", "),
        thumbnail: item.thumbnail ?? "",
        content: item.content,
        featured: item.featured,
        order_idx: item.order_idx,
        published: item.published,
        startDate: typeof data.startDate === "string" ? data.startDate : "",
        endDate: typeof data.endDate === "string" ? data.endDate : "",
        goal: typeof data.goal === "string" ? data.goal : "",
        role: typeof data.role === "string" ? data.role : "",
        teamSize: String(data.teamSize ?? ""),
        github: typeof data.github === "string" ? data.github : "",
        liveUrl: typeof data.liveUrl === "string" ? data.liveUrl : "",
        accomplishments: stringArray(data.accomplishments).join("\n"),
        jobField: normalizeUniqueJobFieldList(
            item.job_field ??
                (data.jobField as string | string[] | null | undefined)
        ),
        caseStudyVersion: data.caseStudyVersion === 2 ? 2 : 1,
        oneLinePitch:
            typeof data.oneLinePitch === "string" ? data.oneLinePitch : "",
        engine: typeof data.engine === "string" ? data.engine : "",
        platforms: stringArray(data.platforms),
        ownership: stringArray(data.ownership),
        outcomes: objectArray<PortfolioOutcome>(data.outcomes).map(
            (outcome) => ({
                result:
                    typeof outcome.result === "string" ? outcome.result : "",
                ...(typeof outcome.evidence === "string"
                    ? { evidence: outcome.evidence }
                    : {}),
            })
        ),
        gallery: objectArray<PortfolioMedia>(data.gallery).flatMap(
            (media): PortfolioMedia[] => {
                if (
                    (media.type !== "image" && media.type !== "video") ||
                    typeof media.src !== "string" ||
                    typeof media.alt !== "string"
                ) {
                    return [];
                }
                if (media.type === "video") {
                    return typeof media.poster === "string"
                        ? [
                              {
                                  type: "video" as const,
                                  src: media.src,
                                  poster: media.poster,
                                  alt: media.alt,
                                  ...(typeof media.caption === "string"
                                      ? { caption: media.caption }
                                      : {}),
                              },
                          ]
                        : [];
                }
                return [
                    {
                        type: "image" as const,
                        src: media.src,
                        alt: media.alt,
                        ...(typeof media.caption === "string"
                            ? { caption: media.caption }
                            : {}),
                    },
                ];
            }
        ),
        links: objectArray<PortfolioLink>(data.links).flatMap((link) =>
            ["demo", "play", "release", "source"].includes(link.kind) &&
            typeof link.url === "string" &&
            typeof link.label === "string"
                ? [{ kind: link.kind, url: link.url, label: link.label }]
                : []
        ),
        devlogs: objectArray<PortfolioDevlog>(data.devlogs).map((devlog) => ({
            title: typeof devlog.title === "string" ? devlog.title : "",
            url: typeof devlog.url === "string" ? devlog.url : "",
        })),
        credits: objectArray<PortfolioCredit>(data.credits).map((credit) => ({
            name: typeof credit.name === "string" ? credit.name : "",
            role: typeof credit.role === "string" ? credit.role : "",
            ...(typeof credit.url === "string" ? { url: credit.url } : {}),
        })),
        meta_title: item.meta_title ?? "",
        meta_description: item.meta_description ?? "",
        og_image: item.og_image ?? "",
    };
};

export const createPortfolioTemplateForm = (
    orderIdx: number,
    jobField: string[]
): PortfolioEditorForm => ({
    ...EMPTY_PORTFOLIO_FORM,
    order_idx: orderIdx,
    jobField: [...jobField],
    caseStudyVersion: 2,
    content: PORTFOLIO_DEEP_DIVE_TEMPLATE,
    published: false,
    platforms: [],
    ownership: [],
    outcomes: [],
    gallery: [],
    links: [],
    devlogs: [],
    credits: [],
});

const assignString = (
    data: Record<string, unknown>,
    key: string,
    value: string
): void => {
    if (value.trim()) data[key] = value;
};

export const buildPortfolioSavePayload = (
    form: PortfolioEditorForm,
    originalData: Record<string, unknown>
): PortfolioSavePayload => {
    const data = { ...originalData };
    for (const key of EDITABLE_PORTFOLIO_DATA_KEYS) delete data[key];

    assignString(data, "startDate", form.startDate);
    assignString(data, "endDate", form.endDate);
    assignString(data, "goal", form.goal);
    assignString(data, "role", form.role);
    assignString(data, "github", form.github);
    assignString(data, "liveUrl", form.liveUrl);
    if (form.teamSize && Number.isFinite(Number(form.teamSize))) {
        data.teamSize = Number(form.teamSize);
    }
    const accomplishments = form.accomplishments
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (accomplishments.length) data.accomplishments = accomplishments;
    const jobField = normalizeUniqueJobFieldList(form.jobField);
    if (jobField.length) data.jobField = jobField;

    if (form.caseStudyVersion === 2) {
        data.caseStudyVersion = 2;
        assignString(data, "oneLinePitch", form.oneLinePitch);
        assignString(data, "engine", form.engine);
        data.platforms = [...form.platforms];
        data.ownership = [...form.ownership];
        data.outcomes = form.outcomes.map((outcome) => ({
            result: outcome.result,
            ...(outcome.evidence !== undefined
                ? { evidence: outcome.evidence }
                : {}),
        }));
        data.gallery = form.gallery.map((media) => {
            if (media.type === "video") {
                return { ...media };
            }
            return {
                type: "image",
                src: media.src,
                alt: media.alt,
                ...(media.caption !== undefined
                    ? { caption: media.caption }
                    : {}),
            };
        });
        data.links = form.links.map((link) => ({ ...link }));
        data.devlogs = form.devlogs.map((devlog) => ({ ...devlog }));
        data.credits = form.credits.map((credit) => ({
            name: credit.name,
            role: credit.role,
            ...(credit.url !== undefined ? { url: credit.url } : {}),
        }));
    }

    return {
        slug: form.slug,
        title: form.title,
        description: form.description || null,
        tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        thumbnail: form.thumbnail || null,
        content: form.content,
        featured: form.featured,
        order_idx: form.order_idx,
        published: form.published,
        job_field: jobField[0] ?? null,
        data,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    };
};
