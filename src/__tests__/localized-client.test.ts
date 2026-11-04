import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLocalizedClient } from "@/lib/localized-client";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";

const fixture = () => {
    const calls: unknown[][] = [];
    const builder = {
        select(...args: unknown[]) {
            calls.push(["select", ...args]);
            return this;
        },
        eq(...args: unknown[]) {
            calls.push(["eq", ...args]);
            return this;
        },
        insert(...args: unknown[]) {
            calls.push(["insert", ...args]);
            return this;
        },
        update(...args: unknown[]) {
            calls.push(["update", ...args]);
            return this;
        },
        upsert(...args: unknown[]) {
            calls.push(["upsert", ...args]);
            return this;
        },
        delete() {
            calls.push(["delete"]);
            return this;
        },
    };
    const raw = {
        from(table: string) {
            calls.push(["from", table]);
            return builder;
        },
    };
    return {
        calls,
        client: createLocalizedClient(raw as unknown as SupabaseClient),
    };
};

describe("언어별 저장 경계", () => {
    it("한국어 원본 테이블 보존", () => {
        const { client, calls } = fixture();
        withContentLocale("ko", () => client.from("posts").select("title"));
        expect(calls).toEqual([
            ["from", "posts"],
            ["select", "title"],
        ]);
    });

    it("번역 조회와 삭제의 언어 필터 강제", () => {
        const { client, calls } = fixture();
        withContentLocale("ja", () =>
            client.from("posts").delete().eq("id", "same")
        );
        expect(calls).toContainEqual(["from", "posts_i18n"]);
        expect(calls).toContainEqual(["eq", "lang", "ja"]);
        expect(calls).toContainEqual(["eq", "id", "same"]);
    });

    it("다른 언어 payload의 덮어쓰기 차단", () => {
        const { client, calls } = fixture();
        withContentLocale("en", () =>
            client.from("portfolio_items").insert({ lang: "ja", title: "Test" })
        );
        expect(calls).toContainEqual(["insert", { lang: "en", title: "Test" }]);
    });

    it("이력서 조회의 고정 한국어 조건도 선택 언어로 제한", () => {
        const { client, calls } = fixture();
        withContentLocale("en", () =>
            client.from("resume_data").select("data").eq("lang", "ko")
        );
        expect(calls).toContainEqual(["eq", "lang", "en"]);
        expect(calls).not.toContainEqual(["eq", "lang", "ko"]);
    });

    it("동시에 실행하는 비동기 작업의 언어 혼입 차단", async () => {
        const values = await Promise.all(
            ["ko", "en", "ja"].map((locale) =>
                withContentLocale(locale as "ko" | "en" | "ja", async () => {
                    await Promise.resolve();
                    return getContentLocale();
                })
            )
        );
        expect(values).toEqual(["ko", "en", "ja"]);
    });
});
