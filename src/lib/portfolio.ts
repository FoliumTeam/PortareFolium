import { createProcessor } from "@mdx-js/mdx";
import {
    EDITABLE_PORTFOLIO_DATA_KEYS,
    KNOWN_PORTFOLIO_DATA_KEYS,
    PRESERVED_LEGACY_DATA_KEYS,
    type PortfolioCaseStudyStyle,
    type PortfolioCredit,
    type PortfolioDataV2,
    type PortfolioDevlog,
    type PortfolioLink,
    type PortfolioMedia,
    type PortfolioOutcome,
    type PortfolioProject,
    type PortfolioRawRow,
} from "@/types/portfolio";

export {
    EDITABLE_PORTFOLIO_DATA_KEYS,
    KNOWN_PORTFOLIO_DATA_KEYS,
    PRESERVED_LEGACY_DATA_KEYS,
};

export const PORTFOLIO_LIMITS = {
    gallery: 8,
    ownership: 5,
    outcomes: 3,
    links: 4,
    devlogs: 5,
    platforms: 5,
    credits: 20,
    pitch: 180,
    ownershipText: 160,
    outcomeResult: 180,
    outcomeEvidence: 240,
    url: 2048,
    mediaAlt: 180,
    caption: 240,
    engine: 80,
    platform: 80,
    creditName: 120,
    creditRole: 160,
    teamComposition: 180,
    linkLabel: 80,
    devlogTitle: 180,
} as const;

type PortfolioNormalizeOptions = {
    r2PublicUrl?: string | null;
};

type MarkdownNode = {
    type: string;
    depth?: number;
    value?: string;
    children?: MarkdownNode[];
};

type MarkdownRoot = MarkdownNode & {
    children: MarkdownNode[];
};

export type PortfolioGroups = {
    selected: PortfolioProject[];
    other: PortfolioProject[];
};

export type PortfolioValidationResult =
    | { valid: true; errors: [] }
    | { valid: false; errors: string[] };

const LINK_KINDS = new Set<PortfolioLink["kind"]>([
    "demo",
    "play",
    "release",
    "source",
]);

const REQUIRED_DEEP_DIVE_HEADINGS: Record<
    PortfolioCaseStudyStyle,
    readonly string[]
> = {
    game: ["목표와 제약", "내 역할", "핵심 구현", "게임 효과"],
    web: ["배경과 목표", "담당 범위", "실행", "결과와 근거"],
};

const LEGACY_DEEP_DIVE_HEADING_MAP: Record<
    PortfolioCaseStudyStyle,
    Record<string, string>
> = {
    game: {
        Problem: "목표와 제약",
        Decision: "내 역할",
        Implementation: "핵심 구현",
        Result: "게임 효과",
        "Trade-off": "제약과 다음 단계",
    },
    web: {
        Problem: "배경과 목표",
        Decision: "담당 범위",
        Implementation: "실행",
        Result: "결과와 근거",
        "Trade-off": "다음 단계",
    },
};

const cleanString = (value: unknown, maxLength: number): string =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const cleanStringArray = (
    value: unknown,
    count: number,
    maxLength: number
): string[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const entry of value) {
        const cleaned = cleanString(entry, maxLength);
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        result.push(cleaned);
        if (result.length === count) break;
    }
    return result;
};

const isRelativeUrl = (value: string): boolean =>
    value.startsWith("/") && !value.startsWith("//");

export const isValidPortfolioLinkUrl = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > PORTFOLIO_LIMITS.url) return false;
    if (isRelativeUrl(trimmed)) return true;
    try {
        return new URL(trimmed).protocol === "https:";
    } catch {
        return false;
    }
};

const getR2Hostname = (r2PublicUrl?: string | null): string | null => {
    const candidate = r2PublicUrl ?? process.env.R2_PUBLIC_URL;
    if (!candidate) return null;
    try {
        return new URL(candidate).hostname;
    } catch {
        return null;
    }
};

export const isValidPortfolioMediaUrl = (
    value: unknown,
    options: PortfolioNormalizeOptions = {}
): value is string => {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > PORTFOLIO_LIMITS.url) return false;
    if (isRelativeUrl(trimmed)) return true;
    try {
        const url = new URL(trimmed);
        const r2Hostname = getR2Hostname(options.r2PublicUrl);
        return (
            url.protocol === "https:" &&
            r2Hostname !== null &&
            url.hostname === r2Hostname
        );
    } catch {
        return false;
    }
};

const normalizeOutcomes = (value: unknown): PortfolioOutcome[] => {
    if (!Array.isArray(value)) return [];
    const outcomes: PortfolioOutcome[] = [];
    const seen = new Set<string>();
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const result = cleanString(
            record.result,
            PORTFOLIO_LIMITS.outcomeResult
        );
        if (!result || seen.has(result)) continue;
        const evidence = cleanString(
            record.evidence,
            PORTFOLIO_LIMITS.outcomeEvidence
        );
        seen.add(result);
        outcomes.push({ result, ...(evidence ? { evidence } : {}) });
        if (outcomes.length === PORTFOLIO_LIMITS.outcomes) break;
    }
    return outcomes;
};

const normalizeGallery = (
    value: unknown,
    options: PortfolioNormalizeOptions
): PortfolioMedia[] => {
    if (!Array.isArray(value)) return [];
    const gallery: PortfolioMedia[] = [];
    const seen = new Set<string>();
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const type = record.type;
        const src = cleanString(record.src, PORTFOLIO_LIMITS.url);
        const alt = cleanString(record.alt, PORTFOLIO_LIMITS.mediaAlt);
        const caption = cleanString(record.caption, PORTFOLIO_LIMITS.caption);
        if (
            (type !== "image" && type !== "video") ||
            !alt ||
            !isValidPortfolioMediaUrl(src, options) ||
            seen.has(src)
        ) {
            continue;
        }
        if (type === "image") {
            if (record.poster != null) continue;
            gallery.push({
                type,
                src,
                alt,
                ...(caption ? { caption } : {}),
            });
        } else {
            const poster = cleanString(record.poster, PORTFOLIO_LIMITS.url);
            if (!isValidPortfolioMediaUrl(poster, options)) continue;
            gallery.push({
                type,
                src,
                poster,
                alt,
                ...(caption ? { caption } : {}),
            });
        }
        seen.add(src);
        if (gallery.length === PORTFOLIO_LIMITS.gallery) break;
    }
    return gallery;
};

const normalizeLinks = (value: unknown): PortfolioLink[] => {
    if (!Array.isArray(value)) return [];
    const links: PortfolioLink[] = [];
    const seen = new Set<string>();
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const kind = record.kind;
        const url = cleanString(record.url, PORTFOLIO_LIMITS.url);
        const label = cleanString(record.label, PORTFOLIO_LIMITS.linkLabel);
        if (
            typeof kind !== "string" ||
            !LINK_KINDS.has(kind as PortfolioLink["kind"]) ||
            !label ||
            !isValidPortfolioLinkUrl(url) ||
            seen.has(url)
        ) {
            continue;
        }
        seen.add(url);
        links.push({ kind: kind as PortfolioLink["kind"], url, label });
        if (links.length === PORTFOLIO_LIMITS.links) break;
    }
    return links;
};

const normalizeDevlogs = (value: unknown): PortfolioDevlog[] => {
    if (!Array.isArray(value)) return [];
    const devlogs: PortfolioDevlog[] = [];
    const seen = new Set<string>();
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const title = cleanString(record.title, PORTFOLIO_LIMITS.devlogTitle);
        const url = cleanString(record.url, PORTFOLIO_LIMITS.url);
        if (!title || !isValidPortfolioLinkUrl(url) || seen.has(url)) continue;
        seen.add(url);
        devlogs.push({ title, url });
        if (devlogs.length === PORTFOLIO_LIMITS.devlogs) break;
    }
    return devlogs;
};

const normalizeCredits = (value: unknown): PortfolioCredit[] => {
    if (!Array.isArray(value)) return [];
    const credits: PortfolioCredit[] = [];
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const name = cleanString(record.name, PORTFOLIO_LIMITS.creditName);
        const role = cleanString(record.role, PORTFOLIO_LIMITS.creditRole);
        const url = cleanString(record.url, PORTFOLIO_LIMITS.url);
        if (!name || !role || (url && !isValidPortfolioLinkUrl(url))) continue;
        credits.push({ name, role, ...(url ? { url } : {}) });
        if (credits.length === PORTFOLIO_LIMITS.credits) break;
    }
    return credits;
};

const normalizeBadges = (value: unknown): { text: string }[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const text = cleanString(
            (entry as Record<string, unknown>).text,
            PORTFOLIO_LIMITS.outcomeResult
        );
        return text ? [{ text }] : [];
    });
};

const normalizeJobField = (value: unknown): string | string[] | null => {
    if (typeof value === "string" && value.trim()) return value.trim();
    const values = cleanStringArray(value, 5, 80);
    return values.length ? values : null;
};

const normalizeProjectType = (value: unknown): "work" | "personal" =>
    value === "work" ? "work" : "personal";

export const getPortfolioJobFields = (row: PortfolioRawRow): string[] => {
    const rowJobField = normalizeJobField(row.job_field);
    const dataJobField = normalizeJobField(row.data?.jobField);
    return Array.from(
        new Set(
            [rowJobField, dataJobField].flatMap((value) =>
                Array.isArray(value) ? value : value ? [value] : []
            )
        )
    );
};

const normalizeFeaturedByJobField = (
    value: unknown,
    jobFields: string[],
    fallbackFeatured: boolean
): Record<string, boolean> => {
    if (!isRecord(value)) {
        return Object.fromEntries(
            jobFields.map((jobField) => [jobField, fallbackFeatured])
        );
    }
    return Object.fromEntries(
        jobFields.map((jobField) => [jobField, value[jobField] === true])
    );
};

const normalizeFeaturedOrderByJobField = (
    value: unknown,
    jobFields: string[],
    fallbackOrder: number | null
): Record<string, number> => {
    const source = isRecord(value) ? value : {};
    return Object.fromEntries(
        jobFields.flatMap((jobField) => {
            const valueForJobField = source[jobField];
            if (
                typeof valueForJobField === "number" &&
                Number.isFinite(valueForJobField)
            ) {
                return [[jobField, valueForJobField]];
            }
            return fallbackOrder === null ? [] : [[jobField, fallbackOrder]];
        })
    );
};

export const getPortfolioCaseStudyStyle = (
    row: PortfolioRawRow
): PortfolioCaseStudyStyle => {
    if (row.data?.caseStudyStyle === "web") return "web";
    if (row.data?.caseStudyStyle === "game") return "game";
    const jobFields = getPortfolioJobFields(row);
    return jobFields.includes("web") && !jobFields.includes("game")
        ? "web"
        : "game";
};

export const normalizePortfolioProject = (
    row: PortfolioRawRow,
    options: PortfolioNormalizeOptions = {}
): PortfolioProject => {
    const data = row.data ?? {};
    const isV2 = data.caseStudyVersion === 2;
    const legacyRole = cleanString(data.role, PORTFOLIO_LIMITS.ownershipText);
    const legacyAccomplishments = cleanStringArray(
        data.accomplishments,
        PORTFOLIO_LIMITS.outcomes,
        PORTFOLIO_LIMITS.outcomeResult
    );
    const ownership = isV2
        ? cleanStringArray(
              data.ownership,
              PORTFOLIO_LIMITS.ownership,
              PORTFOLIO_LIMITS.ownershipText
          )
        : legacyRole
          ? [legacyRole]
          : [];
    const outcomes = isV2
        ? normalizeOutcomes(data.outcomes)
        : legacyAccomplishments.map((result) => ({ result }));
    const gallery = isV2 ? normalizeGallery(data.gallery, options) : [];
    const github = cleanString(data.github, PORTFOLIO_LIMITS.url);
    const links = isV2 ? normalizeLinks(data.links) : [];
    if (
        github &&
        isValidPortfolioLinkUrl(github) &&
        !links.some((link) => link.kind === "source")
    ) {
        links.push({ kind: "source", url: github, label: "Source" });
    }
    const thumbnail = cleanString(row.thumbnail, PORTFOLIO_LIMITS.url);
    const primaryMedia =
        gallery[0] ??
        (thumbnail
            ? {
                  type: "image" as const,
                  src: thumbnail,
                  alt: `${row.title} 대표 이미지`,
              }
            : undefined);
    const jobFields = getPortfolioJobFields(row);
    const tags = cleanStringArray(row.tags, 20, PORTFOLIO_LIMITS.platform);
    const legacyKeywords = cleanStringArray(
        data.keywords,
        20,
        PORTFOLIO_LIMITS.platform
    );
    const orderIdx =
        typeof row.order_idx === "number" && Number.isFinite(row.order_idx)
            ? row.order_idx
            : null;
    const featuredByJobField = normalizeFeaturedByJobField(
        data.featuredByJobField,
        jobFields,
        row.featured === true
    );
    const featuredOrderByJobField = normalizeFeaturedOrderByJobField(
        data.featuredOrderByJobField,
        jobFields,
        orderIdx
    );
    const caseStudyStyle = getPortfolioCaseStudyStyle(row);

    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: cleanString(row.description, 1000),
        content: typeof row.content === "string" ? row.content : "",
        ...(thumbnail ? { thumbnail } : {}),
        startDate: cleanString(data.startDate, 80),
        endDate: cleanString(data.endDate, 80),
        goal: cleanString(data.goal, 1000),
        role: legacyRole,
        teamSize:
            typeof data.teamSize === "number" && Number.isFinite(data.teamSize)
                ? data.teamSize
                : Number(data.teamSize) || 0,
        accomplishments: legacyAccomplishments,
        keywords: tags.length ? tags : legacyKeywords,
        github,
        public: row.published === true,
        published: row.published === true,
        featured: Object.values(featuredByJobField).some(Boolean),
        featuredByJobField,
        featuredOrderByJobField,
        orderIdx,
        jobField:
            jobFields.length === 0
                ? "game"
                : jobFields.length === 1
                  ? jobFields[0]
                  : jobFields,
        badges: normalizeBadges(data.badges),
        caseStudyVersion: isV2 ? 2 : 1,
        caseStudyStyle,
        oneLinePitch: isV2
            ? cleanString(data.oneLinePitch, PORTFOLIO_LIMITS.pitch)
            : cleanString(row.description, PORTFOLIO_LIMITS.pitch),
        engine: isV2 ? cleanString(data.engine, PORTFOLIO_LIMITS.engine) : "",
        platforms: isV2
            ? cleanStringArray(
                  data.platforms,
                  PORTFOLIO_LIMITS.platforms,
                  PORTFOLIO_LIMITS.platform
              )
            : [],
        ownership,
        outcomes,
        gallery,
        links: links.slice(0, PORTFOLIO_LIMITS.links),
        devlogs: isV2 ? normalizeDevlogs(data.devlogs) : [],
        credits: isV2 ? normalizeCredits(data.credits) : [],
        projectType: normalizeProjectType(data.projectType),
        teamComposition: cleanString(
            data.teamComposition,
            PORTFOLIO_LIMITS.teamComposition
        ),
        primaryMedia,
    };
};

const compareOrderThenSlug = (
    left: PortfolioProject,
    right: PortfolioProject,
    jobField?: string
): number => {
    const leftOrder =
        (jobField ? left.featuredOrderByJobField[jobField] : left.orderIdx) ??
        Number.POSITIVE_INFINITY;
    const rightOrder =
        (jobField ? right.featuredOrderByJobField[jobField] : right.orderIdx) ??
        Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.slug.localeCompare(right.slug);
};

export const sortPortfolioProjects = (
    projects: PortfolioProject[]
): PortfolioProject[] =>
    [...projects].sort((left, right) => {
        if (left.featured !== right.featured) return left.featured ? -1 : 1;
        return compareOrderThenSlug(left, right);
    });

export const groupPortfolioProjects = (
    projects: PortfolioProject[],
    jobField?: string
): PortfolioGroups => {
    const published = projects.filter((project) => project.published);
    return {
        selected: published
            .filter((project) =>
                jobField
                    ? project.featuredByJobField[jobField] === true
                    : project.featured
            )
            .sort((left, right) => compareOrderThenSlug(left, right, jobField)),
        other: published
            .filter((project) =>
                jobField
                    ? project.featuredByJobField[jobField] !== true
                    : !project.featured
            )
            .sort((left, right) => compareOrderThenSlug(left, right, jobField)),
    };
};

export const matchesPortfolioJobField = (
    project: PortfolioProject,
    jobField: string
): boolean => {
    if (!jobField) return true;
    return Array.isArray(project.jobField)
        ? project.jobField.includes(jobField)
        : project.jobField === jobField;
};

export const normalizePortfolioCaseStudyContent = (
    content: string,
    style: PortfolioCaseStudyStyle
): string =>
    content.replace(
        /^(###)\s+(Problem|Decision|Implementation|Result|Trade-off)\s*$/gm,
        (_, heading: string, title: string) =>
            `${heading} ${LEGACY_DEEP_DIVE_HEADING_MAP[style][title]}`
    );

const getHeadingText = (node: MarkdownNode): string => {
    if (!("children" in node) || !Array.isArray(node.children)) return "";
    return node.children
        .map((child) => {
            if ("value" in child && typeof child.value === "string") {
                return child.value;
            }
            return getHeadingText(child);
        })
        .join("")
        .trim();
};

const validateDeepDives = (
    content: string,
    style: PortfolioCaseStudyStyle
): string[] => {
    const errors: string[] = [];
    let tree: MarkdownRoot;
    try {
        tree = createProcessor({ format: "mdx" }).parse(
            content
        ) as MarkdownRoot;
    } catch {
        return ["content MDX를 파싱할 수 없습니다."];
    }
    const deepDives: Array<{ title: string; headings: string[] }> = [];
    let current: { title: string; headings: string[] } | null = null;
    for (const node of tree.children) {
        if (node.type !== "heading") continue;
        if (node.depth === 2) {
            current = { title: getHeadingText(node), headings: [] };
            deepDives.push(current);
            continue;
        }
        if (node.depth === 3 && current) {
            current.headings.push(getHeadingText(node));
        }
    }
    if (deepDives.length < 2 || deepDives.length > 3) {
        errors.push(
            "content에는 두 개 또는 세 개의 ## Deep Dive가 필요합니다."
        );
    }
    for (const deepDive of deepDives) {
        const requiredHeadings = REQUIRED_DEEP_DIVE_HEADINGS[style];
        const requiredPositions = requiredHeadings.map((heading) =>
            deepDive.headings.indexOf(heading)
        );
        const complete = requiredPositions.every(
            (position, index) =>
                position >= 0 &&
                (index === 0 || position > requiredPositions[index - 1])
        );
        if (!complete) {
            errors.push(
                `${deepDive.title || "제목 없는 사례"}에 ${requiredHeadings.join(" → ")} 순서가 필요합니다.`
            );
        }
    }
    return errors;
};

const collectionLengthError = (
    value: unknown,
    key: keyof typeof PORTFOLIO_LIMITS,
    label: string
): string | null => {
    if (!Array.isArray(value)) return null;
    return value.length > PORTFOLIO_LIMITS[key]
        ? `${label}은 최대 ${PORTFOLIO_LIMITS[key]}개까지 허용됩니다.`
        : null;
};

export const validatePortfolioForPublish = (
    row: PortfolioRawRow,
    options: PortfolioNormalizeOptions = {}
): PortfolioValidationResult => {
    const data = row.data ?? {};
    if (data.caseStudyVersion !== 2) return { valid: true, errors: [] };
    const normalized = normalizePortfolioProject(row, options);
    const errors: string[] = [];
    if (!normalized.oneLinePitch) errors.push("한 줄 소개가 필요합니다.");
    if (!normalized.engine) errors.push("Engine 정보가 필요합니다.");
    if (normalized.platforms.length < 1)
        errors.push("Platform을 한 개 이상 입력해야 합니다.");
    if (normalized.ownership.length < 1)
        errors.push("개인 기여를 한 개 이상 입력해야 합니다.");
    if (normalized.outcomes.length < 1)
        errors.push("검증 가능한 결과를 한 개 이상 입력해야 합니다.");
    if (!normalized.primaryMedia)
        errors.push("Gallery 대표 media 또는 thumbnail이 필요합니다.");
    if (normalized.teamSize > 1 && !normalized.teamComposition) {
        errors.push("두 명 이상인 프로젝트에는 팀 구성이 필요합니다.");
    }
    const rawGallery = Array.isArray(data.gallery) ? data.gallery : [];
    if (rawGallery.length !== normalized.gallery.length) {
        errors.push("Gallery에 유효하지 않은 image 또는 video가 있습니다.");
    }
    for (const [value, key, label] of [
        [data.gallery, "gallery", "Gallery"],
        [data.ownership, "ownership", "개인 기여"],
        [data.outcomes, "outcomes", "결과"],
        [data.links, "links", "Link"],
        [data.devlogs, "devlogs", "Devlog"],
        [data.platforms, "platforms", "Platform"],
        [data.credits, "credits", "협업자 정보"],
    ] as const) {
        const error = collectionLengthError(value, key, label);
        if (error) errors.push(error);
    }
    errors.push(
        ...validateDeepDives(normalized.content, normalized.caseStudyStyle)
    );
    return errors.length
        ? { valid: false, errors }
        : { valid: true, errors: [] };
};

export const getPortfolioValidationMessage = (
    result: PortfolioValidationResult
): string => (result.valid ? "" : result.errors.join(" "));

export const normalizePortfolioDataV2 = (
    data: Record<string, unknown>,
    options: PortfolioNormalizeOptions = {}
): Partial<PortfolioDataV2> => {
    if (data.caseStudyVersion !== 2) return {};
    return {
        caseStudyVersion: 2,
        oneLinePitch: cleanString(data.oneLinePitch, PORTFOLIO_LIMITS.pitch),
        engine: cleanString(data.engine, PORTFOLIO_LIMITS.engine),
        platforms: cleanStringArray(
            data.platforms,
            PORTFOLIO_LIMITS.platforms,
            PORTFOLIO_LIMITS.platform
        ),
        ownership: cleanStringArray(
            data.ownership,
            PORTFOLIO_LIMITS.ownership,
            PORTFOLIO_LIMITS.ownershipText
        ),
        outcomes: normalizeOutcomes(data.outcomes),
        gallery: normalizeGallery(data.gallery, options),
        links: normalizeLinks(data.links),
        devlogs: normalizeDevlogs(data.devlogs),
        credits: normalizeCredits(data.credits),
    };
};

const decodeHtml = (value: string): string =>
    value
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

export const extractLegacyPortfolioGallery = (
    html: string,
    options: PortfolioNormalizeOptions = {}
): PortfolioMedia[] => {
    const media: PortfolioMedia[] = [];
    const seen = new Set<string>();
    const imagePattern = /<img\b[^>]*>/gi;
    for (const match of html.matchAll(imagePattern)) {
        const tag = match[0];
        const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
        const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
        const src = decodeHtml(srcMatch?.[1]?.trim() ?? "");
        const alt = decodeHtml(altMatch?.[1]?.trim() ?? "");
        if (
            !src ||
            !alt ||
            seen.has(src) ||
            !isValidPortfolioMediaUrl(src, options)
        ) {
            continue;
        }
        seen.add(src);
        media.push({ type: "image", src, alt });
        if (media.length === PORTFOLIO_LIMITS.gallery) break;
    }
    return media;
};

export const mergePortfolioDataPatch = (
    current: Record<string, unknown>,
    patch: Record<string, unknown>
): Record<string, unknown> => {
    const known = new Set<string>(KNOWN_PORTFOLIO_DATA_KEYS);
    const rowKeys = new Set([
        "id",
        "slug",
        "title",
        "description",
        "tags",
        "thumbnail",
        "content",
        "published",
        "featured",
        "order_idx",
        "job_field",
        "meta_title",
        "meta_description",
        "og_image",
    ]);
    const merged = { ...current };
    for (const [key, value] of Object.entries(patch)) {
        if (rowKeys.has(key)) continue;
        if (value === null) {
            if (known.has(key)) delete merged[key];
            continue;
        }
        merged[key] = value;
    }
    return merged;
};
