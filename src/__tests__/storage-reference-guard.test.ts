import {
    CopyObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/storage-ops/route";
import { getStorageReferenceGuard } from "@/lib/storage-reference-guard";
import { withContentLocale } from "@/lib/content-locale";

const mocks = vi.hoisted(() => ({
    connected: true,
    from: vi.fn(),
    localizedFrom: vi.fn(),
    send: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    get unscopedServerClient() {
        return mocks.connected ? { from: mocks.from } : null;
    },
    serverClient: { from: mocks.localizedFrom },
}));
vi.mock("@/lib/r2", () => ({
    r2Client: { send: mocks.send },
    R2_BUCKET: "test-bucket",
}));
vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: vi.fn(async () => ({ user: { isAdmin: true } })),
}));

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let failures: Record<string, { message: string }>;
let ranges: { table: string; start: number; end: number }[];
const original = "portfolio/project/asset.webp";
const url = `https://images.example.test/${original}`;

beforeEach(() => {
    vi.clearAllMocks();
    mocks.connected = true;
    tables = {};
    failures = {};
    ranges = [];
    mocks.from.mockImplementation((table: string) => {
        const builder = {
            select: (_columns: string) => builder,
            order: (_column: string) => builder,
            range: async (start: number, end: number) => {
                ranges.push({ table, start, end });
                return {
                    data: (tables[table] ?? []).slice(start, end + 1),
                    error: failures[table] ?? null,
                };
            },
        };
        return builder;
    });
    mocks.send.mockResolvedValue({});
});

describe("전체 언어의 미디어 참조 보호", () => {
    it.each([
        ["resume_data", { lang: "ja", data: { basics: { image: url } } }],
        ["about_data", { data: { description: `![원본](${url})` } }],
        ["posts", { content: `![원본](${url})` }],
        ["portfolio_items", { thumbnail: url }],
        ["books", { cover_image: url }],
        ["editor_states", { data: { content: `![원본](${url})` } }],
        [
            "post_content_chunks",
            { revision_id: "revision", chunk_index: 0, content: url },
        ],
        [
            "application_profiles",
            { public_snapshot: { portfolio: [{ thumbnail: url }] } },
        ],
        [
            "site_config",
            { key: "seo_config", value: { default_og_image: url } },
        ],
        [
            "about_data_i18n",
            { lang: "en", data: { description: `![Copied](${url})` } },
        ],
        ["posts_i18n", { lang: "ja", content: `![画像](${url})` }],
        ["portfolio_items_i18n", { lang: "en", thumbnail: url }],
        ["books_i18n", { lang: "ja", cover_image: url }],
        ["editor_states_i18n", { lang: "en", snapshot: { thumbnail: url } }],
        [
            "post_content_chunks_i18n",
            {
                lang: "ja",
                revision_id: "revision",
                chunk_index: 0,
                content: url,
            },
        ],
        [
            "application_profiles_i18n",
            {
                lang: "en",
                base_snapshot: { resume: { basics: { image: url } } },
            },
        ],
        [
            "site_config_i18n",
            { key: "seo_config", lang: "en", value: { default_og_image: url } },
        ],
    ] as [string, Row][])(
        "%s에서 참조하는 한국어 원본의 삭제 차단",
        async (table, row) => {
            tables[table] = [row];
            const referenced = await withContentLocale(
                "ja",
                getStorageReferenceGuard
            );
            expect(referenced(original)).toBe(true);
            expect(mocks.localizedFrom).not.toHaveBeenCalled();
        }
    );

    it.each(["thumb", "poster"])(
        "원본 참조만 있어도 %s 보조 이미지 보호",
        async (suffix) => {
            tables.posts_i18n = [{ lang: "en", content: url }];
            const referenced = await getStorageReferenceGuard();
            expect(referenced(`portfolio/project/asset.${suffix}.webp`)).toBe(
                true
            );
        }
    );

    it("보조 이미지 참조만 남아도 같은 원본 파일 보호", async () => {
        tables.posts = [
            {
                content:
                    "https://images.example.test/blog/post/clip.poster.webp",
            },
        ];
        const referenced = await getStorageReferenceGuard();
        expect(referenced("blog/post/clip.gif")).toBe(true);
    });

    it("참조된 영어 경로와 같은 이름의 미참조 일본어 파일 구분", async () => {
        tables.portfolio_items_i18n = [
            {
                lang: "en",
                thumbnail:
                    "https://images.example.test/portfolio/_i18n/en/project/asset.webp",
            },
        ];
        const referenced = await getStorageReferenceGuard();
        expect(referenced("portfolio/_i18n/en/project/asset.webp")).toBe(true);
        expect(referenced("portfolio/_i18n/ja/project/asset.webp")).toBe(false);
    });

    it("첫 페이지 뒤에만 존재하는 참조도 읽어 파일 보호", async () => {
        tables.posts_i18n = [
            ...Array.from({ length: 500 }, (_, id) => ({ id, content: "" })),
            { id: 500, content: url },
        ];
        const referenced = await getStorageReferenceGuard();
        expect(referenced(original)).toBe(true);
        expect(ranges).toContainEqual({
            table: "posts_i18n",
            start: 500,
            end: 999,
        });
    });

    it("조각 경계에서 URL이 나뉜 번역 블로그의 원본 파일 보호", async () => {
        tables.post_content_chunks_i18n = [
            {
                lang: "en",
                revision_id: "revision",
                chunk_index: 0,
                content: "![Copied](https://images.example.test/portfolio/pro",
            },
            {
                lang: "en",
                revision_id: "revision",
                chunk_index: 1,
                content: "ject/asset.webp)",
            },
        ];
        const referenced = await getStorageReferenceGuard();
        expect(referenced(original)).toBe(true);
    });

    it("분할 본문의 URL이 조회 페이지 경계에 걸쳐도 원본 파일 보호", async () => {
        tables.post_content_chunks_i18n = [
            ...Array.from({ length: 499 }, (_, index) => ({
                lang: "ja",
                revision_id: "revision",
                chunk_index: index,
                content: "앞부분",
            })),
            {
                lang: "ja",
                revision_id: "revision",
                chunk_index: 499,
                content: "![画像](https://images.example.test/portfolio/pro",
            },
            {
                lang: "ja",
                revision_id: "revision",
                chunk_index: 500,
                content: "ject/asset.webp)",
            },
        ];
        const referenced = await getStorageReferenceGuard();
        expect(referenced(original)).toBe(true);
    });

    it("한 언어의 참조 조회 실패도 삭제 승인 대신 오류 반환", async () => {
        failures.posts_i18n = { message: "번역 조회 실패" };
        await expect(getStorageReferenceGuard()).rejects.toThrow(
            "전체 언어의 미디어 참조 확인 실패"
        );
    });

    it("조회 한도를 넘으면 일부 결과로 삭제를 승인하지 않고 중단", async () => {
        tables.posts = Array.from({ length: 10_000 }, (_, id) => ({ id }));
        await expect(getStorageReferenceGuard()).rejects.toThrow(
            "행 수 한도 초과"
        );
    });

    it("DB 연결이 없으면 참조 미확인을 삭제 가능으로 해석하지 않고 중단", async () => {
        mocks.connected = false;
        await expect(getStorageReferenceGuard()).rejects.toThrow(
            "DB 연결 없음"
        );
        expect(mocks.from).not.toHaveBeenCalled();
    });
});

describe("참조 보호를 적용한 가짜 R2 작업", () => {
    it("영어 설정의 직무별 OG 이미지에만 남은 한국어 원본과 thumb 보호", async () => {
        tables.site_config_i18n = [
            {
                key: "seo_config",
                lang: "en",
                value: JSON.stringify({
                    job_fields: { web: { og_image: url } },
                }),
            },
        ];
        const response = await POST({
            json: async () => ({
                action: "delete-keys",
                keys: [original, "portfolio/project/asset.thumb.webp"],
            }),
        } as never);
        expect(await response.json()).toEqual({ ok: true, deleted: 0 });
        expect(mocks.send).not.toHaveBeenCalled();
    });

    it("번역에서 사용하는 한국어 원본과 thumb을 남기고 미사용 파일만 삭제", async () => {
        tables.posts_i18n = [{ lang: "en", content: url }];
        const response = await POST({
            json: async () => ({
                action: "delete-keys",
                keys: [
                    original,
                    "portfolio/project/asset.thumb.webp",
                    "portfolio/_i18n/en/project/unused.webp",
                ],
            }),
        } as never);
        expect(await response.json()).toEqual({ ok: true, deleted: 1 });
        expect(mocks.send).toHaveBeenCalledExactlyOnceWith(
            expect.any(DeleteObjectsCommand)
        );
        expect(mocks.send.mock.calls[0][0].input.Delete.Objects).toEqual([
            { Key: "portfolio/_i18n/en/project/unused.webp" },
        ]);
    });

    it("번역이 참조 중인 한국어 폴더 이동 시 복사 후 원본 삭제 생략", async () => {
        tables.portfolio_items_i18n = [{ lang: "ja", content: url }];
        mocks.send.mockImplementation(async (command: unknown) =>
            command instanceof ListObjectsV2Command
                ? { Contents: [{ Key: original }] }
                : {}
        );
        const response = await POST({
            json: async () => ({
                action: "move",
                oldPrefix: "portfolio/project",
                newPrefix: "portfolio/renamed",
            }),
        } as never);
        expect(response.status).toBe(200);
        expect(mocks.send).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
        expect(mocks.send).not.toHaveBeenCalledWith(
            expect.any(DeleteObjectsCommand)
        );
    });

    it("DB 조회 오류 시 R2 목록과 삭제 호출 전 중단", async () => {
        failures.editor_states_i18n = { message: "편집 이력 조회 실패" };
        await expect(
            POST({
                json: async () => ({
                    action: "delete",
                    prefix: "portfolio/project",
                }),
            } as never)
        ).rejects.toThrow("미디어 참조 확인 실패");
        expect(mocks.send).not.toHaveBeenCalled();
    });
});
