import { LOCALES } from "@/lib/i18n";
import { withContentLocale } from "@/lib/content-locale";
import { getPortfolioJobFields } from "@/lib/portfolio";
import { getPublicJobFields } from "@/lib/public-job-field";
import { serverClient } from "@/lib/supabase";
import type { PortfolioRawRow } from "@/types/portfolio";

type PublicRouteParams = {
    jobField: string;
};

type PublicDetailRouteParams = PublicRouteParams & {
    slug: string;
};

function getJobFieldIds(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string");
}

async function getPublicJobFieldIds(): Promise<Set<string>> {
    return new Set((await getPublicJobFields()).map((jobField) => jobField.id));
}

function getDetailRouteParams(
    slug: string,
    jobFields: readonly string[],
    publicJobFieldIds: ReadonlySet<string>
): PublicDetailRouteParams[] {
    return jobFields.flatMap((jobField) =>
        publicJobFieldIds.has(jobField) ? [{ jobField, slug }] : []
    );
}

/** 공개 직무 분야 landing route의 정적 param 목록 반환 */
export async function getPublicJobFieldParams(): Promise<PublicRouteParams[]> {
    return (await getPublicJobFields()).map(({ id }) => ({ jobField: id }));
}

/** 발행된 게시글의 직무 분야별 정적 상세 route 목록 반환 */
export async function getPublicPostRouteParams(): Promise<
    PublicDetailRouteParams[]
> {
    if (!serverClient) return [];
    const [publicJobFieldIds, { data }] = await Promise.all([
        getPublicJobFieldIds(),
        serverClient
            .from("posts")
            .select("slug, job_field")
            .eq("published", true),
    ]);

    return (data ?? []).flatMap((post) =>
        getDetailRouteParams(
            post.slug,
            getJobFieldIds(post.job_field),
            publicJobFieldIds
        )
    );
}

/** 공개 Portfolio의 직무 분야별 정적 상세 route 목록 반환 */
export async function getPublicPortfolioRouteParams(): Promise<
    PublicDetailRouteParams[]
> {
    if (!serverClient) return [];
    const [publicJobFieldIds, { data }] = await Promise.all([
        getPublicJobFieldIds(),
        serverClient
            .from("portfolio_items")
            .select("slug, job_field, data")
            .eq("published", true),
    ]);

    return (data ?? []).flatMap((project) =>
        getDetailRouteParams(
            project.slug,
            getPortfolioJobFields(project as PortfolioRawRow),
            publicJobFieldIds
        )
    );
}

/** 공개 도서의 직무 분야별 정적 상세 route 목록 반환 */
export async function getPublicBookRouteParams(): Promise<
    PublicDetailRouteParams[]
> {
    if (!serverClient) return [];
    const [publicJobFieldIds, { data }] = await Promise.all([
        getPublicJobFieldIds(),
        serverClient
            .from("books")
            .select("slug, job_field")
            .eq("published", true),
    ]);

    return (data ?? []).flatMap((book) =>
        getDetailRouteParams(
            book.slug,
            getJobFieldIds(book.job_field),
            publicJobFieldIds
        )
    );
}

// 번역 없는 분기와 독립적인 전체 상세 경로 조합
export const getLocalizedDetailRouteParams = async (
    kind: "portfolio" | "blog" | "books"
) => {
    const read =
        kind === "portfolio"
            ? getPublicPortfolioRouteParams
            : kind === "blog"
              ? getPublicPostRouteParams
              : getPublicBookRouteParams;
    return (
        await Promise.all(
            LOCALES.map((locale) =>
                withContentLocale(locale, async () =>
                    (await read()).map((row) => ({ ...row, locale }))
                )
            )
        )
    ).flat();
};
