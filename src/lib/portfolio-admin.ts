import { normalizeUniqueJobFieldList } from "@/lib/job-field";
import type { Locale } from "@/lib/i18n";
import { EDITABLE_PORTFOLIO_DATA_KEYS } from "@/types/portfolio";
import type {
    PortfolioCredit,
    PortfolioDevlog,
    PortfolioLink,
    PortfolioMedia,
    PortfolioOutcome,
    PortfolioProjectType,
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
    projectType: PortfolioProjectType;
    teamComposition: string;
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
    job_field: string[];
    data: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

export const PORTFOLIO_GAME_CASE_STUDY_TEMPLATE = `## [게임플레이 목표 1]

### 목표와 제약

[플레이어에게 만들고 싶은 경험과 해결할 제약]

### 내 역할

[내가 책임진 범위와 협업 경계]

### 핵심 구현

[중요한 기술 판단과 구현 과정]

### 게임 효과

[플레이·가독성·제작 과정에서 확인한 변화]

## [게임플레이 목표 2]

### 목표와 제약
[플레이 목표]
### 내 역할
[기여 범위]
### 핵심 구현
[구현]
### 게임 효과
[검증한 변화]`;

export const PORTFOLIO_WEB_CASE_STUDY_TEMPLATE = `## [업무 성과 1]

### 배경과 목표

[업무 또는 사용자 문제와 성공 기준]

### 담당 범위

[내가 책임진 범위와 협업 경계]

### 실행

[사실로 확인한 구현·협업·운영 행동]

### 결과와 근거

[측정값, 배포물, 운영 기록 또는 확인 방법]

## [업무 성과 2]

### 배경과 목표
[문제]
### 담당 범위
[기여 범위]
### 실행
[실행 내용]
### 결과와 근거
[결과]`;

const CASE_STUDY_COPY = {
    en: {
        game: {
            title: "Gameplay goal",
            headings: [
                "Goals and constraints",
                "My role",
                "Implementation",
                "Game impact",
            ],
            prompts: [
                "The player experience to create and constraints to address",
                "My responsibilities and collaboration boundaries",
                "Key technical decisions and implementation",
                "Changes verified through gameplay, readability, or production",
            ],
        },
        web: {
            title: "Project result",
            headings: [
                "Context and goals",
                "Scope of responsibility",
                "Implementation",
                "Results and evidence",
            ],
            prompts: [
                "The business or user problem and success criteria",
                "My responsibilities and collaboration boundaries",
                "Verified implementation, collaboration, or operational work",
                "Measurements, releases, operational records, or verification methods",
            ],
        },
    },
    ja: {
        game: {
            title: "ゲームプレイの目標",
            headings: ["目標と制約", "担当範囲", "主な実装", "ゲームへの効果"],
            prompts: [
                "実現したいプレイヤー体験と解決すべき制約",
                "自分の責任範囲と共同作業の境界",
                "重要な技術判断と実装の過程",
                "プレイ・視認性・制作の過程で確認できた変化",
            ],
        },
        web: {
            title: "業務の成果",
            headings: ["背景と目標", "担当範囲", "実装", "結果と根拠"],
            prompts: [
                "業務または利用者の課題と成功の基準",
                "自分の責任範囲と共同作業の境界",
                "事実で確認できる実装・協業・運用の行動",
                "測定値・公開物・運用記録・確認方法",
            ],
        },
    },
} as const;

export const getPortfolioCaseStudyTemplate = (
    jobField: string[],
    locale: Locale = "ko"
): string => {
    const style =
        jobField.includes("game") && !jobField.includes("web") ? "game" : "web";
    if (locale === "ko")
        return style === "game"
            ? PORTFOLIO_GAME_CASE_STUDY_TEMPLATE
            : PORTFOLIO_WEB_CASE_STUDY_TEMPLATE;
    const copy = CASE_STUDY_COPY[locale][style];
    return [1, 2]
        .map((number) =>
            [
                `## [${copy.title} ${number}]`,
                ...copy.headings.flatMap((heading, index) => [
                    `### ${heading}`,
                    `[${copy.prompts[index]}]`,
                ]),
            ].join("\n\n")
        )
        .join("\n\n");
};

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
    projectType: "personal",
    teamComposition: "",
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
        projectType: data.projectType === "work" ? "work" : "personal",
        teamComposition:
            typeof data.teamComposition === "string"
                ? data.teamComposition
                : "",
        meta_title: item.meta_title ?? "",
        meta_description: item.meta_description ?? "",
        og_image: item.og_image ?? "",
    };
};

export const createPortfolioTemplateForm = (
    orderIdx: number,
    jobField: string[],
    locale: Locale = "ko"
): PortfolioEditorForm => ({
    ...EMPTY_PORTFOLIO_FORM,
    order_idx: orderIdx,
    jobField: [...jobField],
    caseStudyVersion: 2,
    content: getPortfolioCaseStudyTemplate(jobField, locale),
    published: false,
    platforms: [],
    ownership: [],
    outcomes: [],
    gallery: [],
    links: [],
    devlogs: [],
    credits: [],
    projectType: "personal",
    teamComposition: "",
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
    data.projectType = form.projectType;

    if (form.caseStudyVersion === 2) {
        data.caseStudyVersion = 2;
        if (data.caseStudyStyle !== "game" && data.caseStudyStyle !== "web") {
            data.caseStudyStyle =
                jobField.includes("game") && !jobField.includes("web")
                    ? "game"
                    : "web";
        }
        assignString(data, "oneLinePitch", form.oneLinePitch);
        data.teamComposition = form.teamComposition.trim();
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
        job_field: jobField,
        data,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        og_image: form.og_image || null,
    };
};
