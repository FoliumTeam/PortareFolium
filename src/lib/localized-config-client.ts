import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";

const LOCALIZED_KEYS = new Set([
    "header_name",
    "site_name",
    "seo_config",
    "job_fields",
    "navigation_config",
    "footer_config",
    "post_toc_styles",
    "portfolio_ai_section",
]);
type Row = { key: string; value: unknown; lang?: string };
type Operation = { name: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null };

// 내용 설정의 언어별 값과 공통 디자인 설정을 같은 조회 계약으로 제공
export const localizedConfigQuery = (
    client: SupabaseClient,
    locale: Locale
): object => {
    const operations: Operation[] = [];
    const execute = async (): Promise<Result> => {
        const mutation = operations.find((operation) =>
            ["insert", "upsert", "update", "delete"].includes(operation.name)
        );
        const single = operations.some((operation) =>
            ["single", "maybeSingle"].includes(operation.name)
        );
        const run = async (table: string, payload?: Row[]): Promise<Result> => {
            let query: unknown = client.from(table);
            for (const operation of operations) {
                if (["single", "maybeSingle"].includes(operation.name))
                    continue;
                const args = [...operation.args];
                if (operation.name === "select") args[0] = "*";
                if (payload && ["insert", "upsert"].includes(operation.name)) {
                    args[0] = payload;
                    if (operation.name === "upsert")
                        args[1] = {
                            ...((args[1] ?? {}) as object),
                            onConflict: table.endsWith("_i18n")
                                ? "lang,key"
                                : "key",
                        };
                }
                const method: unknown = Reflect.get(
                    query as object,
                    operation.name
                );
                query = Reflect.apply(
                    method as (...values: unknown[]) => unknown,
                    query,
                    args
                );
            }
            if (table.endsWith("_i18n")) {
                const eq: unknown = Reflect.get(query as object, "eq");
                if (typeof eq === "function")
                    query = Reflect.apply(eq, query, ["lang", locale]);
            }
            return await (query as PromiseLike<Result>);
        };
        if (mutation) {
            if (["insert", "upsert"].includes(mutation.name)) {
                const input = mutation.args[0];
                const rows = (Array.isArray(input) ? input : [input]) as Row[];
                const shared = rows.filter(
                    (row) => !LOCALIZED_KEYS.has(row.key)
                );
                const translated = rows
                    .filter((row) => LOCALIZED_KEYS.has(row.key))
                    .map((row) => ({ ...row, lang: locale }));
                const results = await Promise.all([
                    ...(shared.length ? [run("site_config", shared)] : []),
                    ...(translated.length
                        ? [run("site_config_i18n", translated)]
                        : []),
                ]);
                return {
                    data: results.flatMap((result) =>
                        Array.isArray(result.data) ? result.data : []
                    ),
                    error:
                        results.find((result) => result.error)?.error ?? null,
                };
            }
            const key = operations.find(
                (operation) =>
                    operation.name === "eq" && operation.args[0] === "key"
            )?.args[1];
            if (typeof key !== "string")
                return {
                    data: null,
                    error: { message: "설정 변경 대상 key 필요" },
                };
            return run(
                LOCALIZED_KEYS.has(key) ? "site_config_i18n" : "site_config"
            );
        }
        const [original, translated] = await Promise.all([
            run("site_config"),
            run("site_config_i18n"),
        ]);
        if (original.error || translated.error)
            return {
                data: single ? null : [],
                error: original.error ?? translated.error,
            };
        const source = (original.data ?? []) as Row[];
        const overrides = new Map(
            ((translated.data ?? []) as Row[]).map((row) => [row.key, row])
        );
        const rows = source
            .map((row): Row | null => {
                if (overrides.has(row.key)) return overrides.get(row.key)!;
                if (row.key === "job_fields") {
                    let fields = row.value;
                    if (typeof fields === "string") {
                        try {
                            fields = JSON.parse(fields) as unknown;
                        } catch {
                            fields = [];
                        }
                    }
                    return {
                        ...row,
                        value: Array.isArray(fields)
                            ? fields.map((field: Record<string, unknown>) => ({
                                  ...field,
                                  name: String(field.id),
                                  headerTitle: String(field.id),
                              }))
                            : [],
                    };
                }
                return LOCALIZED_KEYS.has(row.key) ? null : row;
            })
            .filter((row): row is Row => row !== null);
        for (const [key, row] of overrides)
            if (!rows.some((entry) => entry.key === key)) rows.push(row);
        return { data: single ? (rows[0] ?? null) : rows, error: null };
    };
    let proxy: object;
    proxy = new Proxy(
        {},
        {
            get: (_target, property) =>
                property === "then"
                    ? (
                          resolve: (value: Result) => unknown,
                          reject: (error: unknown) => unknown
                      ) => execute().then(resolve, reject)
                    : (...args: unknown[]) => {
                          operations.push({ name: String(property), args });
                          return proxy;
                      },
        }
    );
    return proxy;
};
