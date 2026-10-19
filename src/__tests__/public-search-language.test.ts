import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import { searchPublicContent } from "@/app/admin/actions/public-data";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ serverClient: { from: mocks.from } }));
vi.mock("@/lib/action-locale", () => ({
    withActionLocale: (_kind: string, action: () => Promise<unknown>) =>
        withContentLocale("ko", action),
}));
vi.mock("@/lib/server-admin", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/lib/refuge/mode", () => ({ isSqliteRefugeMode: () => false }));
vi.mock("@/lib/refuge/sqlite-migrations", () => ({
    getSqliteRefugeSchemaVersion: vi.fn(),
}));

const filters: [string, unknown][] = [];
const locales: string[] = [];

beforeEach(() => {
    mocks.from.mockReset();
    filters.length = 0;
    locales.length = 0;
    mocks.from.mockImplementation((table: string) => {
        const locale = getContentLocale();
        locales.push(locale);
        const builder = {
            select: () => builder,
            eq: (key: string, value: unknown) => {
                filters.push([key, value]);
                return builder;
            },
            ilike: (_key: string, value: string) => {
                filters.push(["pattern", value]);
                return builder;
            },
            or: (value: string) => {
                filters.push(["scope", value]);
                return builder;
            },
            order: () => builder,
            limit: () => builder,
            then: (
                resolve: (value: {
                    data: { slug: string; title: string }[];
                }) => unknown
            ) =>
                Promise.resolve({
                    data: [{ slug: `${locale}-${table}`, title: locale }],
                }).then(resolve),
        };
        return builder;
    });
});

describe("주소에서 지정한 공개 검색 언어", () => {
    it("저장 언어와 다른 명시 언어로 조회하고 공개·직무 범위 유지", async () => {
        const result = await searchPublicContent("%test_", "web", "ja");
        expect(locales).toEqual(["ja", "ja"]);
        expect(result.map((item) => item.title)).toEqual(["ja", "ja"]);
        expect(filters.filter(([key]) => key === "published")).toEqual([
            ["published", true],
            ["published", true],
        ]);
        expect(filters).toContainEqual([
            "scope",
            "job_field.cs.{web},job_field.is.null",
        ]);
        expect(filters).toContainEqual(["pattern", "%\\%test\\_%"]);
    });

    it("언어를 생략한 기존 호출은 저장 언어 조회 유지", async () => {
        await searchPublicContent("test", "web");
        expect(locales).toEqual(["ko", "ko"]);
    });

    it("지원하지 않는 명시 언어는 자료 조회 전에 차단", async () => {
        // @ts-expect-error 잘못된 직접 RPC 입력 검증
        await expect(searchPublicContent("test", "web", "kr")).rejects.toThrow(
            "Unsupported locale"
        );
        expect(mocks.from).not.toHaveBeenCalled();
    });
});
