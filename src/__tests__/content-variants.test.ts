import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentLocale } from "@/lib/content-locale";
import { copyContentVariant, type VariantKind } from "@/lib/content-variants";
import type { Locale } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    readPostContentById: vi.fn(),
    createApplicationSourceSnapshot: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ serverClient: { from: mocks.from } }));
vi.mock("@/lib/post-content-chunks", () => ({
    readPostContentById: mocks.readPostContentById,
}));
vi.mock("@/lib/application-profile", () => ({
    createApplicationSourceSnapshot: mocks.createApplicationSourceSnapshot,
}));

type Row = Record<string, unknown>;
type Write = {
    table: string;
    locale: Locale;
    operation: "insert" | "upsert" | "update";
    payload: Row;
    options?: unknown;
};

let rows: Record<Locale, Row | null>;
let writes: Write[];
let readErrors: Partial<Record<Locale, { message: string }>>;
let beforeUpdate: (() => void) | undefined;

beforeEach(() => {
    vi.clearAllMocks();
    rows = {
        ko: {
            id: "source-id",
            lang: "ko",
            slug: "example",
            title: "원본",
            content: "원본 본문",
            published: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-02",
        },
        en: null,
        ja: null,
    };
    writes = [];
    readErrors = {};
    beforeUpdate = undefined;
    mocks.readPostContentById.mockResolvedValue({
        content: "완전한 분할 본문",
        storageMode: "chunked",
    });
    mocks.createApplicationSourceSnapshot.mockImplementation(
        async (jobField: string) => ({
            jobField,
            resume: { basics: { name: "Target name" } },
            sourceHash: "target-hash",
            locale: getContentLocale(),
        })
    );
    mocks.from.mockImplementation((table: string) => {
        const locale = getContentLocale();
        const filters: [string, unknown][] = [];
        let update: Row | undefined;
        const matches = () =>
            rows[locale] &&
            filters.every(([key, value]) =>
                key === "data" && value === "{}"
                    ? JSON.stringify(rows[locale]?.data) === "{}"
                    : rows[locale]?.[key] === value
            );
        const builder = {
            select: (_columns: string) => builder,
            eq: (key: string, value: unknown) => {
                filters.push([key, value]);
                return builder;
            },
            limit: (_value: number) => builder,
            maybeSingle: async () => ({
                data:
                    rows[locale] &&
                    filters.every(
                        ([key, value]) => rows[locale]?.[key] === value
                    )
                        ? rows[locale]
                        : null,
                error: readErrors[locale] ?? null,
            }),
            insert: async (payload: Row) => {
                writes.push({ table, locale, operation: "insert", payload });
                return { error: null };
            },
            upsert: async (payload: Row, options: unknown) => {
                writes.push({
                    table,
                    locale,
                    operation: "upsert",
                    payload,
                    options,
                });
                return { error: null };
            },
            update: (payload: Row) => {
                beforeUpdate?.();
                update = payload;
                return builder;
            },
            then: (
                resolve: (value: { data: Row[]; error: null }) => unknown
            ) => {
                const selected: Row[] = [];
                if (update && matches()) {
                    writes.push({
                        table,
                        locale,
                        operation: "update",
                        payload: update,
                    });
                    rows[locale] = { ...rows[locale], ...update };
                    selected.push({ id: rows[locale]?.id });
                }
                return Promise.resolve({ data: selected, error: null }).then(
                    resolve
                );
            },
        };
        return builder;
    });
});

describe("언어 사본의 원본과 기존 번역 보호", () => {
    it.each([
        "portfolio",
        "post",
        "book",
        "about",
        "resume",
        "application",
    ] as VariantKind[])(
        "%s 대상 언어의 기존 내용 덮어쓰기 차단",
        async (kind) => {
            rows.ko = {
                ...rows.ko,
                public_token: "example",
                data: { basics: { name: "원본" } },
            };
            rows.en = {
                ...rows.ko,
                lang: "en",
                data: { basics: { name: "Already translated" } },
            };
            const before = structuredClone(rows);

            await expect(
                copyContentVariant(kind, "ko", "en", "example")
            ).rejects.toThrow("기존 내용 보존");

            expect(rows).toEqual(before);
            expect(writes).toEqual([]);
        }
    );

    it("같은 언어로 복사 요청 시 조회와 저장 차단", async () => {
        await expect(
            copyContentVariant("portfolio", "ko", "ko", "example")
        ).rejects.toThrow("다른 언어");
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it("대상 언어 조회 실패 시 기존 자료 유무를 추정하지 않고 저장 차단", async () => {
        readErrors.en = { message: "대상 조회 실패" };
        await expect(
            copyContentVariant("portfolio", "ko", "en", "example")
        ).rejects.toThrow("대상 언어 조회 실패");
        expect(writes).toEqual([]);
    });

    it.each(["portfolio", "post", "book"] as VariantKind[])(
        "%s 복사본을 비공개로 저장하고 원본 공개 상태 보존",
        async (kind) => {
            const original = structuredClone(rows.ko);
            await expect(
                copyContentVariant(kind, "ko", "ja", "example")
            ).resolves.toEqual({ success: true, lang: "ja", published: false });
            expect(writes).toHaveLength(1);
            expect(writes[0]).toMatchObject({
                locale: "ja",
                operation: "insert",
                payload: { slug: "example", published: false },
            });
            expect(writes[0].payload).not.toHaveProperty("id");
            expect(writes[0].payload).not.toHaveProperty("created_at");
            expect(writes[0].payload).not.toHaveProperty("updated_at");
            expect(rows.ko).toEqual(original);
        }
    );

    it("빈 이력서 언어 자리에 비공개 사본 저장", async () => {
        rows.ko = {
            id: "source-id",
            lang: "ko",
            data: { basics: { name: "원본 이름" } },
        };
        rows.en = { id: "empty-en", lang: "en", data: {} };
        await copyContentVariant("resume", "ko", "en");
        expect(writes).toEqual([
            {
                table: "resume_data",
                locale: "en",
                operation: "update",
                payload: { data: rows.ko.data, published: false },
            },
        ]);
    });

    it("대상 확인 뒤 다른 저장이 채운 이력서는 조건부 갱신에서 보존", async () => {
        rows.ko = { id: "source", data: { basics: { name: "원본" } } };
        rows.en = { id: "empty-en", data: {} };
        beforeUpdate = () => {
            rows.en = {
                id: "empty-en",
                data: { basics: { name: "다른 저장" } },
            };
        };
        await expect(copyContentVariant("resume", "ko", "en")).rejects.toThrow(
            "복사 중단"
        );
        expect(rows.en.data).toEqual({ basics: { name: "다른 저장" } });
        expect(writes).toEqual([]);
    });

    it.each([null, undefined, [], "", "{}"].map((value) => ({ value })))(
        "$value는 빈 이력서 초기 행으로 취급 제외",
        async ({ value }) => {
            rows.ko = { id: "source", data: { basics: {} } };
            rows.en = { id: "target", data: value };
            await expect(
                copyContentVariant("resume", "ko", "en")
            ).rejects.toThrow("기존 내용 보존");
            expect(writes).toEqual([]);
        }
    );

    it("소개 최초 사본은 같은 대상 문서의 고정 식별자로 삽입", async () => {
        rows.en = { id: "source-en", data: { description: "English" } };
        rows.ja = { id: "source-ja", data: { description: "日本語" } };
        rows.ko = null;
        await copyContentVariant("about", "en", "ko");
        await copyContentVariant("about", "ja", "ko");
        expect(writes[0].payload.id).toMatch(/^[a-f\d-]{36}$/i);
        expect(writes[0].payload.id).toBe(writes[1].payload.id);
        expect(writes.every((write) => write.operation === "insert")).toBe(
            true
        );
    });

    it("이력서 대상 행 부재 시 upsert 대신 삽입만 사용", async () => {
        rows.ko = { id: "source", data: { basics: {} } };
        await copyContentVariant("resume", "ko", "en");
        expect(writes[0]).toMatchObject({
            operation: "insert",
            locale: "en",
            payload: { lang: "en", published: false },
        });
    });

    it("소개 사본을 비공개로 저장하고 공개 원본 보존", async () => {
        rows.ko = {
            id: "source-about",
            data: { description: "원본 소개" },
            published: true,
        };
        const original = structuredClone(rows.ko);
        await copyContentVariant("about", "ko", "en");
        expect(writes[0]).toMatchObject({
            table: "about_data",
            locale: "en",
            payload: { data: rows.ko.data, published: false },
        });
        expect(rows.ko).toEqual(original);
    });

    it("블로그의 원본 언어에서 분할 본문을 복원해 전체 내용 복사", async () => {
        const complete = "첫 번째 조각\n두 번째 조각\n".repeat(100);
        let readLocale: Locale | undefined;
        mocks.readPostContentById.mockImplementation(async () => {
            readLocale = getContentLocale();
            return { content: complete, storageMode: "chunked" };
        });
        await copyContentVariant("post", "ko", "en", "example");
        expect(mocks.readPostContentById).toHaveBeenCalledExactlyOnceWith(
            "source-id",
            "원본 본문",
            { strict: true }
        );
        expect(readLocale).toBe("ko");
        expect(writes[0].payload.content).toBe(complete);
    });
});

describe("지원용 공유본 언어 사본", () => {
    beforeEach(() => {
        rows.ko = {
            id: "original-profile",
            public_token: "example",
            name: "원본 지원본",
            parent_job_field: "web",
            status: "published",
            version: 7,
            published_at: "2026-01-01",
            public_snapshot: { sourceHash: "old-public" },
            base_snapshot: { sourceHash: "old-base" },
            overrides: {
                headline: "원본 제목",
                summary: "원본 요약",
                excludedPortfolioSlugs: ["excluded"],
                portfolioOrder: ["example"],
            },
        };
    });

    it("같은 공개 token을 유지하면서 Draft로 새 사본 생성", async () => {
        await copyContentVariant("application", "ko", "ja", "example");
        expect(writes[0]).toMatchObject({
            table: "application_profiles",
            locale: "ja",
            payload: {
                public_token: "example",
                status: "draft",
                version: 1,
                public_snapshot: null,
                published_at: null,
            },
        });
        expect(writes[0].payload).not.toHaveProperty("id");
        expect(rows.ko?.status).toBe("published");
    });

    it("원본의 과거 사본 대신 목표 언어의 최신 자료를 기준으로 구성", async () => {
        await copyContentVariant("application", "ko", "en", "example");
        expect(
            mocks.createApplicationSourceSnapshot
        ).toHaveBeenCalledExactlyOnceWith("web", { strict: true });
        expect(writes[0].payload.base_snapshot).toMatchObject({
            sourceHash: "target-hash",
            locale: "en",
        });
    });

    it("언어별 제목과 요약을 비우고 공통 선택 순서 보존", async () => {
        await copyContentVariant("application", "ko", "en", "example");
        expect(writes[0].payload.overrides).toEqual({
            headline: undefined,
            summary: undefined,
            excludedPortfolioSlugs: ["excluded"],
            portfolioOrder: ["example"],
        });
    });
});
