import { createApplicationSourceSnapshot } from "@/lib/application-profile";
import { readPostContentById } from "@/lib/post-content-chunks";
import { serverClient } from "@/lib/supabase";
import { withContentLocale } from "@/lib/content-locale";
import { isLocale, type Locale } from "@/lib/i18n";
import { insertAboutDocument } from "@/lib/about-document";

export type VariantKind =
    | "resume"
    | "about"
    | "portfolio"
    | "post"
    | "book"
    | "application";
const TABLES = {
    resume: "resume_data",
    about: "about_data",
    portfolio: "portfolio_items",
    post: "posts",
    book: "books",
    application: "application_profiles",
} as const;
export const isVariantKind = (kind: unknown): kind is VariantKind =>
    typeof kind === "string" && Object.hasOwn(TABLES, kind);

// 원본 ID 대신 같은 공개 slug로 연결되는 독립 번역 사본
export const copyContentVariant = async (
    kind: VariantKind,
    source: Locale,
    target: Locale,
    slug?: string
) => {
    if (!serverClient || source === target)
        throw new Error("복사할 다른 언어 선택 필요");
    const table = TABLES[kind];
    const hasSlug = !["resume", "about"].includes(kind);
    if (hasSlug && !slug) throw new Error("원본 항목 선택 필요");
    const read = (locale: Locale) =>
        withContentLocale(locale, async () => {
            let query = serverClient!.from(table).select("*");
            if (hasSlug)
                query = query.eq(
                    kind === "application" ? "public_token" : "slug",
                    slug!
                );
            return query.limit(kind === "about" ? 2 : 1).maybeSingle();
        });
    const [original, existing] = await Promise.all([
        read(source),
        read(target),
    ]);
    if (original.error || !original.data)
        throw new Error("원본 콘텐츠 조회 실패");
    if (existing.error) throw new Error("대상 언어 조회 실패");
    const targetData = existing.data?.data;
    const emptyResume =
        targetData !== null &&
        typeof targetData === "object" &&
        !Array.isArray(targetData) &&
        Object.keys(targetData).length === 0;
    if (existing.data && (kind !== "resume" || !emptyResume))
        throw new Error("대상 언어의 기존 내용 보존을 위해 복사 중단");
    const {
        id: _id,
        lang: _lang,
        created_at: _created,
        updated_at: _updated,
        ...fields
    } = original.data;
    if (kind === "post")
        fields.content = (
            await withContentLocale(source, () =>
                readPostContentById(
                    String(original.data.id),
                    String(fields.content ?? ""),
                    { strict: true }
                )
            )
        ).content;
    const payload: Record<string, unknown> =
        kind === "application"
            ? {
                  ...fields,
                  status: "draft",
                  public_snapshot: null,
                  published_at: null,
                  version: 1,
                  base_snapshot: await withContentLocale(target, () =>
                      createApplicationSourceSnapshot(
                          String(fields.parent_job_field),
                          { strict: true }
                      )
                  ),
                  overrides: {
                      ...((fields.overrides ?? {}) as object),
                      headline: undefined,
                      summary: undefined,
                  },
              }
            : { ...fields, published: false };
    const result = await withContentLocale(target, async () => {
        if (kind === "about") return insertAboutDocument(payload);
        if (kind === "resume" && existing.data) {
            const changed = await serverClient!
                .from(table)
                .update(payload)
                .eq("id", existing.data.id)
                .eq("data", "{}")
                .select("id");
            if (
                !changed.error &&
                (!Array.isArray(changed.data) || changed.data.length !== 1)
            )
                throw new Error("대상 언어 내용 변경으로 복사 중단");
            return changed;
        }
        return serverClient!
            .from(table)
            .insert(kind === "resume" ? { ...payload, lang: target } : payload);
    });
    if (result.error) throw new Error("언어 사본 저장 실패");
    return { success: true as const, lang: target, published: false };
};

export const validateVariantLocales = (
    source: unknown,
    target: unknown
): [Locale, Locale] => {
    if (!isLocale(source) || !isLocale(target))
        throw new Error("Unsupported locale");
    return [source, target];
};
