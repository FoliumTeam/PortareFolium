import type { PortfolioRawRow } from "@/types/portfolio";

export type PortfolioReviewStatus =
    | "draft"
    | "ready"
    | "approved"
    | "published";

export type PortfolioReviewEvent = {
    status: PortfolioReviewStatus;
    at: string;
    actor: "admin";
};

export type PortfolioPublishedSnapshot = Pick<
    PortfolioRawRow,
    | "slug"
    | "title"
    | "description"
    | "tags"
    | "thumbnail"
    | "content"
    | "featured"
    | "order_idx"
    | "job_field"
    | "meta_title"
    | "meta_description"
    | "og_image"
> & {
    data: Record<string, unknown>;
};

export type PortfolioReview = {
    status: PortfolioReviewStatus;
    history: PortfolioReviewEvent[];
    lastPublishedSnapshot?: PortfolioPublishedSnapshot;
};

export type PortfolioReviewDiff = {
    label: string;
    previous: string;
    current: string;
};

const REVIEW_KEY = "review";
const REVIEW_HISTORY_LIMIT = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isReviewStatus = (value: unknown): value is PortfolioReviewStatus =>
    value === "draft" ||
    value === "ready" ||
    value === "approved" ||
    value === "published";

const asSnapshot = (value: unknown): PortfolioPublishedSnapshot | undefined => {
    if (!isRecord(value) || typeof value.slug !== "string") return undefined;
    return value as PortfolioPublishedSnapshot;
};

const asHistory = (value: unknown): PortfolioReviewEvent[] => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): PortfolioReviewEvent[] => {
        if (
            !isRecord(entry) ||
            !isReviewStatus(entry.status) ||
            typeof entry.at !== "string"
        ) {
            return [];
        }
        return [{ status: entry.status, at: entry.at, actor: "admin" }];
    });
};

/** Portfolio data에 저장된 검토 상태를 하위 호환 가능한 형태로 읽는다. */
export const getPortfolioReview = (
    data: Record<string, unknown> | null | undefined
): PortfolioReview => {
    const raw = isRecord(data?.[REVIEW_KEY]) ? data[REVIEW_KEY] : {};
    return {
        status: isReviewStatus(raw.status) ? raw.status : "draft",
        history: asHistory(raw.history),
        ...(asSnapshot(raw.lastPublishedSnapshot)
            ? { lastPublishedSnapshot: asSnapshot(raw.lastPublishedSnapshot) }
            : {}),
    };
};

/** 검토 메타데이터를 제외한 공개용 스냅샷을 만든다. */
export const createPublishedSnapshot = (
    row: PortfolioRawRow
): PortfolioPublishedSnapshot => {
    const { [REVIEW_KEY]: _review, ...publicData } = row.data ?? {};
    return {
        slug: row.slug,
        title: row.title,
        description: row.description ?? null,
        tags: row.tags,
        thumbnail: row.thumbnail ?? null,
        content: row.content ?? "",
        featured: row.featured ?? false,
        order_idx: row.order_idx ?? 0,
        job_field: row.job_field,
        meta_title: row.meta_title ?? null,
        meta_description: row.meta_description ?? null,
        og_image: row.og_image ?? null,
        data: publicData,
    };
};

const appendHistory = (
    history: PortfolioReviewEvent[],
    status: PortfolioReviewStatus,
    now: string
): PortfolioReviewEvent[] =>
    [...history, { status, at: now, actor: "admin" as const }].slice(
        -REVIEW_HISTORY_LIMIT
    );

const withReview = (
    data: Record<string, unknown>,
    review: PortfolioReview
): Record<string, unknown> => ({
    ...data,
    [REVIEW_KEY]: review,
});

/** 편집 내용을 Draft로 저장하고 기존 공개본은 스냅샷으로 유지한다. */
export const preparePortfolioDraftSave = (
    current: PortfolioRawRow | null,
    next: PortfolioRawRow,
    now: string
): PortfolioRawRow => {
    const existing = getPortfolioReview(current?.data);
    const snapshot =
        existing.lastPublishedSnapshot ??
        (current?.published === true
            ? createPublishedSnapshot(current)
            : undefined);
    const statusChanged = existing.status !== "draft";
    const review: PortfolioReview = {
        status: "draft",
        history: statusChanged
            ? appendHistory(existing.history, "draft", now)
            : existing.history,
        ...(snapshot ? { lastPublishedSnapshot: snapshot } : {}),
    };
    return {
        ...next,
        published: snapshot !== undefined,
        data: withReview(next.data ?? {}, review),
    };
};

/** 상태 전환을 기록한다. Published 전환 때만 새 공개본 스냅샷을 갱신한다. */
export const transitionPortfolioReview = (
    row: PortfolioRawRow,
    nextStatus: PortfolioReviewStatus,
    now: string
): PortfolioRawRow => {
    const current = getPortfolioReview(row.data);
    const snapshot =
        nextStatus === "published"
            ? createPublishedSnapshot(row)
            : current.lastPublishedSnapshot;
    const review: PortfolioReview = {
        status: nextStatus,
        history: appendHistory(current.history, nextStatus, now),
        ...(snapshot ? { lastPublishedSnapshot: snapshot } : {}),
    };
    return {
        ...row,
        published: nextStatus === "published" ? true : row.published,
        data: withReview(row.data ?? {}, review),
    };
};

/** 공개 요청에는 마지막 승인본만 반환해 Draft가 공개 경로에 노출되지 않게 한다. */
export const getPublicPortfolioRow = (
    row: PortfolioRawRow
): PortfolioRawRow | null => {
    if (row.published !== true) return null;
    const review = getPortfolioReview(row.data);
    if (review.status === "published" || !review.lastPublishedSnapshot) {
        return row;
    }
    return {
        ...row,
        ...review.lastPublishedSnapshot,
        published: true,
    };
};

/** 관리자 검토 화면에 표시할 공개본과 현재 Draft의 핵심 차이를 요약한다. */
export const getPortfolioReviewDiff = (
    row: PortfolioRawRow
): PortfolioReviewDiff[] => {
    const snapshot = getPortfolioReview(row.data).lastPublishedSnapshot;
    if (!snapshot) return [];
    const fields: Array<[string, unknown, unknown]> = [
        ["제목", snapshot.title, row.title],
        ["요약", snapshot.description, row.description],
        ["기술 태그", snapshot.tags, row.tags],
        ["대표 이미지", snapshot.thumbnail, row.thumbnail],
        ["본문", snapshot.content, row.content],
    ];
    return fields.flatMap(
        ([label, previous, current]): PortfolioReviewDiff[] => {
            const previousText = JSON.stringify(previous ?? "");
            const currentText = JSON.stringify(current ?? "");
            if (previousText === currentText) return [];
            return [
                {
                    label,
                    previous:
                        label === "본문"
                            ? `${String(previous ?? "").length}자`
                            : String(previous ?? "없음"),
                    current:
                        label === "본문"
                            ? `${String(current ?? "").length}자`
                            : String(current ?? "없음"),
                },
            ];
        }
    );
};

export const getPortfolioReviewStatusLabel = (
    status: PortfolioReviewStatus
): string =>
    ({
        draft: "Draft",
        ready: "Ready for Review",
        approved: "Approved",
        published: "Published",
    })[status];
