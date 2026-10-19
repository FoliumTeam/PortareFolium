import type { SupabaseClient } from "@supabase/supabase-js";
import { getContentLocale } from "@/lib/content-locale";
import type { Locale } from "@/lib/i18n";

export const LOCALIZED_TABLES = [
    "about_data",
    "posts",
    "portfolio_items",
    "books",
    "editor_states",
    "post_content_revisions",
    "post_content_chunks",
    "tags",
    "post_categories",
    "application_profiles",
] as const;

const translatedTables = new Set<string>(LOCALIZED_TABLES);
const localizedViews = new Set([
    "post_category_counts",
    "post_tag_counts",
    "post_tags",
]);

// 언어별 payload와 충돌 키의 동일 범위 적용
const scopeQuery = (query: object, locale: Locale, table: string): object => {
    let proxy: object;
    proxy = new Proxy(query, {
        get(target, property) {
            const value: unknown = Reflect.get(target, property);
            if (typeof value !== "function") return value;
            if (property === "then") return value.bind(target);
            return (...args: unknown[]) => {
                if (["insert", "upsert"].includes(String(property))) {
                    const scope = (row: unknown) => ({
                        ...(row as object),
                        lang: locale,
                    });
                    args[0] = Array.isArray(args[0])
                        ? args[0].map(scope)
                        : scope(args[0]);
                    if (property === "upsert") {
                        const options = (args[1] ?? {}) as {
                            onConflict?: string;
                        };
                        const conflict =
                            options.onConflict ??
                            (table === "resume_data" ? "lang" : "id");
                        args[1] = {
                            ...options,
                            onConflict: conflict.includes("lang")
                                ? conflict
                                : `lang,${conflict}`,
                        };
                    }
                }
                if (property === "update") {
                    const { lang: _lang, ...fields } = args[0] as Record<
                        string,
                        unknown
                    >;
                    args[0] = fields;
                }
                if (property === "eq" && args[0] === "lang") args[1] = locale;
                let next = Reflect.apply(value, target, args) as unknown;
                if (
                    ["select", "update", "delete"].includes(String(property)) &&
                    next &&
                    typeof next === "object"
                ) {
                    const eq: unknown = Reflect.get(next, "eq");
                    if (typeof eq === "function")
                        next = Reflect.apply(eq, next, ["lang", locale]);
                }
                if (next && typeof next === "object")
                    return scopeQuery(next, locale, table);
                return next;
            };
        },
    });
    return proxy;
};

// 한국어 원본 테이블과 독립 번역 테이블의 명시적 요청 범위
export const createLocalizedClient = (client: SupabaseClient): SupabaseClient =>
    new Proxy(client, {
        get(target, property) {
            if (property !== "from") {
                const value: unknown = Reflect.get(target, property);
                return typeof value === "function" ? value.bind(target) : value;
            }
            return (table: string) => {
                const locale = getContentLocale();
                if (table === "resume_data") {
                    return scopeQuery(target.from(table), locale, table);
                }
                if (
                    locale === "ko" ||
                    (!translatedTables.has(table) && !localizedViews.has(table))
                )
                    return target.from(table);
                return scopeQuery(target.from(`${table}_i18n`), locale, table);
            };
        },
    });
