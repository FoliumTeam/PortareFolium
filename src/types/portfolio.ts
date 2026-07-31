export type PortfolioOutcome = {
    result: string;
    evidence?: string;
};

export type PortfolioImageMedia = {
    type: "image";
    src: string;
    alt: string;
    caption?: string;
    poster?: never;
};

export type PortfolioVideoMedia = {
    type: "video";
    src: string;
    poster: string;
    alt: string;
    caption?: string;
};

export type PortfolioMedia = PortfolioImageMedia | PortfolioVideoMedia;

export type PortfolioLink = {
    kind: "demo" | "play" | "release" | "source";
    url: string;
    label: string;
};

export type PortfolioDevlog = {
    title: string;
    url: string;
};

export type PortfolioCredit = {
    name: string;
    role: string;
    url?: string;
};

export type PortfolioDataV2 = {
    caseStudyVersion: 2;
    oneLinePitch: string;
    engine: string;
    platforms: string[];
    ownership: string[];
    outcomes: PortfolioOutcome[];
    gallery: PortfolioMedia[];
    links: PortfolioLink[];
    devlogs: PortfolioDevlog[];
    credits: PortfolioCredit[];
};

export const KNOWN_PORTFOLIO_DATA_KEYS = [
    "startDate",
    "endDate",
    "goal",
    "role",
    "teamSize",
    "github",
    "liveUrl",
    "accomplishments",
    "jobField",
    "badges",
    "keywords",
    "caseStudyVersion",
    "oneLinePitch",
    "ownership",
    "outcomes",
    "gallery",
    "links",
    "devlogs",
    "engine",
    "platforms",
    "credits",
] as const;

export const PRESERVED_LEGACY_DATA_KEYS = ["badges", "keywords"] as const;

export const EDITABLE_PORTFOLIO_DATA_KEYS = KNOWN_PORTFOLIO_DATA_KEYS.filter(
    (key) =>
        !PRESERVED_LEGACY_DATA_KEYS.includes(
            key as (typeof PRESERVED_LEGACY_DATA_KEYS)[number]
        )
);

export type PortfolioDataKey = (typeof KNOWN_PORTFOLIO_DATA_KEYS)[number];

export type PortfolioRawRow = {
    id?: string;
    slug: string;
    title: string;
    description?: string | null;
    tags?: unknown;
    thumbnail?: string | null;
    content?: string | null;
    data?: Record<string, unknown> | null;
    featured?: boolean | null;
    order_idx?: number | null;
    published?: boolean | null;
    job_field?: unknown;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image?: string | null;
};

export type PortfolioProject = {
    id?: string;
    slug: string;
    thumbnail?: string;
    title: string;
    description: string;
    content: string;
    startDate: string;
    endDate: string;
    goal: string;
    role: string;
    teamSize: number;
    accomplishments: string[];
    keywords: string[];
    github: string;
    public: boolean;
    published: boolean;
    featured: boolean;
    orderIdx: number | null;
    jobField: string | string[];
    badges: { text: string }[];
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
    primaryMedia?: PortfolioMedia;
};

export type Portfolio = {
    projects: PortfolioProject[];
};
