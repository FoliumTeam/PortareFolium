import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { localizedConfigQuery } from "@/lib/localized-config-client";
import type { Locale } from "@/lib/i18n";

type Row = { key: string; value: unknown; lang?: string };
type Table = "site_config" | "site_config_i18n";
type Failure = { message: string };

const fixture = (source: Row[], translations: Row[] = []) => {
    const tables: Record<Table, Row[]> = {
        site_config: structuredClone(source),
        site_config_i18n: structuredClone(translations),
    };
    const failures: Partial<Record<Table, Failure>> = {};
    const writes: {
        table: Table;
        operation: string;
        options?: Record<string, unknown>;
    }[] = [];
    const client = {
        from(table: Table) {
            const filters: [string, unknown][] = [];
            let operation = "select";
            let payload: unknown;
            let options: Record<string, unknown> | undefined;
            const matches = (row: Row) =>
                filters.every(
                    ([key, value]) => row[key as keyof Row] === value
                );
            const execute = () => {
                if (failures[table])
                    return { data: null, error: failures[table] };
                if (operation === "select")
                    return { data: tables[table].filter(matches), error: null };
                writes.push({ table, operation, options });
                if (operation === "upsert" || operation === "insert") {
                    for (const row of (Array.isArray(payload)
                        ? payload
                        : [payload]) as Row[]) {
                        const keys = String(options?.onConflict ?? "key").split(
                            ","
                        );
                        const previous = tables[table].findIndex((entry) =>
                            keys.every(
                                (key) =>
                                    entry[key as keyof Row] ===
                                    row[key as keyof Row]
                            )
                        );
                        if (previous >= 0 && operation === "upsert")
                            tables[table][previous] = structuredClone(row);
                        else tables[table].push(structuredClone(row));
                    }
                }
                if (operation === "update")
                    tables[table] = tables[table].map((row) =>
                        matches(row)
                            ? { ...row, ...(payload as Partial<Row>) }
                            : row
                    );
                if (operation === "delete")
                    tables[table] = tables[table].filter(
                        (row) => !matches(row)
                    );
                return { data: null, error: null };
            };
            const builder = {
                select: (_columns: string) => builder,
                eq: (key: string, value: unknown) => {
                    filters.push([key, value]);
                    return builder;
                },
                upsert: (rows: unknown, config?: Record<string, unknown>) => {
                    operation = "upsert";
                    payload = rows;
                    options = config;
                    return builder;
                },
                update: (value: unknown) => {
                    operation = "update";
                    payload = value;
                    return builder;
                },
                delete: () => {
                    operation = "delete";
                    return builder;
                },
                then: <T>(
                    resolve: (result: ReturnType<typeof execute>) => T,
                    reject?: (error: unknown) => T
                ) => Promise.resolve(execute()).then(resolve, reject),
            };
            return builder;
        },
    };
    const query = (locale: Locale) =>
        localizedConfigQuery(
            client as unknown as SupabaseClient,
            locale
        ) as ReturnType<SupabaseClient["from"]>;
    return { query, tables, writes, failures };
};

describe("언어별 사이트 설정 조회", () => {
    it.each(["en", "ja"] as const)(
        "%s 미작성 문구에서 한국어 이름과 검색 설명 제외",
        async (locale) => {
            const { query } = fixture([
                { key: "header_name", value: "한국어 이름" },
                { key: "site_name", value: "한국어 사이트" },
                {
                    key: "seo_config",
                    value: { title: "한국어 제목", description: "한국어 설명" },
                },
                { key: "navigation_config", value: { resume: "이력서" } },
                { key: "footer_config", value: { text: "한국어 설명" } },
                {
                    key: "portfolio_ai_section",
                    value: { title: "한국어 프로젝트" },
                },
            ]);

            const { data } = await query(locale).select("key, value");

            expect(data).toEqual([]);
        }
    );

    it("영어 미작성 단일 설정 조회에서 한국어 대신 null 반환", async () => {
        const { query } = fixture([
            { key: "header_name", value: "한국어 이름" },
        ]);
        const { data, error } = await query("en")
            .select("value")
            .eq("key", "header_name")
            .maybeSingle();
        expect({ data, error }).toEqual({ data: null, error: null });
    });

    it("내용 번역이 없어도 공통 디자인 설정 공유", async () => {
        const shared = [
            { key: "theme_mode", value: "dark" },
            { key: "resume_layout", value: "modern" },
        ];
        const { query } = fixture(shared);
        const { data } = await query("ja").select("key, value");
        expect(data).toEqual(shared);
    });

    it("같은 key에 여러 번역이 있어도 선택한 언어 값만 조회", async () => {
        const { query } = fixture(
            [{ key: "header_name", value: "한국어 이름" }],
            [
                { key: "header_name", lang: "en", value: "English name" },
                { key: "header_name", lang: "ja", value: "日本語の名前" },
            ]
        );
        const { data } = await query("en")
            .select("value")
            .eq("key", "header_name")
            .single();
        expect(data).toMatchObject({ value: "English name", lang: "en" });
    });

    it("원본에 없는 번역 전용 key도 선택한 언어에서 조회", async () => {
        const row = { key: "site_name", lang: "ja", value: "日本語サイト" };
        const { query } = fixture([], [row]);
        const { data } = await query("ja").select("key, value");
        expect(data).toEqual([row]);
    });

    it("미번역 직무는 식별자와 기능 설정을 보존하고 한국어 표시명 제외", async () => {
        const { query } = fixture([
            {
                key: "job_fields",
                value: JSON.stringify([
                    {
                        id: "web",
                        name: "웹 개발",
                        headerTitle: "웹 포트폴리오",
                        enabled: true,
                    },
                ]),
            },
        ]);
        const { data } = await query("en")
            .select("value")
            .eq("key", "job_fields")
            .single();
        expect(data?.value).toEqual([
            { id: "web", name: "web", headerTitle: "web", enabled: true },
        ]);
    });

    it("번역 조회 실패 시 한국어 원문으로 대체하지 않고 오류 반환", async () => {
        const { query, failures } = fixture([
            { key: "header_name", value: "한국어 이름" },
        ]);
        failures.site_config_i18n = { message: "번역 저장소 조회 실패" };
        const { data, error } = await query("en").select("key, value");
        expect({ data, error }).toEqual({
            data: [],
            error: failures.site_config_i18n,
        });
    });
});

describe("언어별 사이트 설정 저장", () => {
    it("번역 upsert의 lang,key 충돌 범위로 한국어와 다른 번역 보존", async () => {
        const source = [{ key: "header_name", value: "한국어 이름" }];
        const japanese = {
            key: "header_name",
            lang: "ja",
            value: "日本語の名前",
        };
        const { query, tables, writes } = fixture(source, [
            { key: "header_name", lang: "en", value: "Old English name" },
            japanese,
        ]);

        await query("en").upsert(
            { key: "header_name", value: "New English name", lang: "ja" },
            { onConflict: "key" }
        );

        expect(tables.site_config).toEqual(source);
        expect(tables.site_config_i18n).toEqual([
            { key: "header_name", lang: "en", value: "New English name" },
            japanese,
        ]);
        expect(writes).toEqual([
            {
                table: "site_config_i18n",
                operation: "upsert",
                options: { onConflict: "lang,key" },
            },
        ]);
    });

    it("일괄 저장에서 공통 디자인과 번역 문구를 각 저장 공간에 분리", async () => {
        const { query, tables } = fixture([
            { key: "header_name", value: "한국어 이름" },
        ]);
        await query("ja").upsert([
            { key: "header_name", value: "日本語の名前" },
            { key: "theme_mode", value: "dark" },
        ]);
        expect(tables.site_config).toEqual([
            { key: "header_name", value: "한국어 이름" },
            { key: "theme_mode", value: "dark" },
        ]);
        expect(tables.site_config_i18n).toEqual([
            { key: "header_name", value: "日本語の名前", lang: "ja" },
        ]);
    });

    it("단일 번역 삭제에서 한국어 원문과 다른 언어 번역 보존", async () => {
        const source = [{ key: "header_name", value: "한국어 이름" }];
        const japanese = {
            key: "header_name",
            value: "日本語の名前",
            lang: "ja",
        };
        const { query, tables } = fixture(source, [
            { key: "header_name", value: "English name", lang: "en" },
            japanese,
        ]);
        await query("en").delete().eq("key", "header_name");
        expect(tables.site_config).toEqual(source);
        expect(tables.site_config_i18n).toEqual([japanese]);
    });

    it("대상 key 없는 변경을 거부하고 저장소 변경 차단", async () => {
        const { query, writes } = fixture([]);
        const { error } = await query("en").update({ value: "unsafe" });
        expect(error?.message).toBe("설정 변경 대상 key 필요");
        expect(writes).toEqual([]);
    });
});
