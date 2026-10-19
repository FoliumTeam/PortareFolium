import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplicationSourceSnapshot } from "@/lib/application-profile";
import { readPostContentById } from "@/lib/post-content-chunks";

type QueryResult = {
    data: unknown;
    error: { message: string; code?: string } | null;
};

const mocks = vi.hoisted(() => ({
    serverClient: { from: vi.fn() },
    available: true,
}));

vi.mock("@/lib/supabase", () => ({
    get serverClient() {
        return mocks.available ? mocks.serverClient : null;
    },
}));

let responses: Record<string, QueryResult>;

// 실제 연결 없이 테이블별 읽기 결과와 단일 행 규칙 재현
function createQuery(table: string) {
    let rowLimit: number | undefined;
    const execute = (): QueryResult => {
        const result = responses[table] ?? { data: [], error: null };
        return {
            ...result,
            data: Array.isArray(result.data)
                ? result.data.slice(0, rowLimit)
                : result.data,
        };
    };
    const one = (optional: boolean): Promise<QueryResult> => {
        const result = execute();
        if (result.error) return Promise.resolve(result);
        const rows = Array.isArray(result.data) ? result.data : [];
        if (rows.length > 1 || (!optional && rows.length === 0)) {
            return Promise.resolve({
                data: null,
                error: { message: "row count mismatch", code: "PGRST116" },
            });
        }
        return Promise.resolve({ data: rows[0] ?? null, error: null });
    };
    const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: (value: number) => {
            rowLimit = value;
            return query;
        },
        single: () => one(false),
        maybeSingle: () => one(true),
        then<TResult1 = QueryResult, TResult2 = never>(
            onfulfilled?:
                | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
                | null,
            onrejected?:
                | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
                | null
        ) {
            return Promise.resolve(execute()).then(onfulfilled, onrejected);
        },
    };
    return query;
}

// 분할 본문과 검증 값의 정상 기준
function seedChunks() {
    const content = "first\nsecond";
    const revision = {
        id: "revision-1",
        post_id: "post-1",
        content_hash: createHash("sha256").update(content).digest("hex"),
        chunk_count: 2,
    };
    const chunks = ["first\n", "second"].map((part, index) => ({
        revision_id: "revision-1",
        chunk_index: index,
        content: part,
        checksum: createHash("sha256").update(part).digest("hex"),
    }));
    responses.post_content_revisions = {
        data: [revision],
        error: null,
    };
    responses.post_content_chunks = {
        data: chunks,
        error: null,
    };
    return { content, revision, chunks };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.available = true;
    responses = {};
    mocks.serverClient.from.mockImplementation(createQuery);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("복사 원본의 엄격한 읽기", () => {
    it("DB 연결 부재를 inline 본문으로 대체하지 않고 거부", async () => {
        mocks.available = false;

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("serverClient");
    });

    it("revision 조회 실패를 inline 본문으로 대체하지 않고 거부", async () => {
        responses.post_content_revisions = {
            data: null,
            error: { message: "revision read unavailable" },
        };

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("revision read unavailable");
    });

    it("분할 본문 개수 부족을 inline 본문으로 대체하지 않고 거부", async () => {
        seedChunks();
        responses.post_content_chunks.data = [];

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("chunk count mismatch");
    });

    it("분할 본문 조회 실패를 inline 본문으로 대체하지 않고 거부", async () => {
        seedChunks();
        responses.post_content_chunks = {
            data: null,
            error: { message: "chunk read unavailable" },
        };

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("chunk read unavailable");
    });

    it("분할 본문 결과 부재를 inline 본문으로 대체하지 않고 거부", async () => {
        seedChunks();
        responses.post_content_chunks.data = null;

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("chunk 조회 실패");
    });

    it("분할 순서의 빈 번호를 전체 hash가 같아도 거부", async () => {
        const { chunks } = seedChunks();
        chunks[1].chunk_index = 2;

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("chunk index mismatch");
    });

    it("개별 분할 검증 값 불일치를 전체 hash가 같아도 거부", async () => {
        const { chunks } = seedChunks();
        chunks[1].checksum = "invalid";

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("chunk checksum mismatch");
    });

    it("전체 본문 hash 불일치를 inline 본문으로 대체하지 않고 거부", async () => {
        const { revision } = seedChunks();
        revision.content_hash = "invalid";

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).rejects.toThrow("content hash mismatch");
    });

    it("정상 분할 본문의 전체 내용 반환", async () => {
        const { content } = seedChunks();

        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).resolves.toEqual({ content, storageMode: "chunked" });
    });

    it("정상적인 revision 부재에서는 inline 본문 반환", async () => {
        await expect(
            readPostContentById("post-1", "inline body", { strict: true })
        ).resolves.toEqual({ content: "inline body", storageMode: "inline" });
    });

    it.each(["resume_data", "about_data", "portfolio_items", "posts"])(
        "%s 조회 실패를 빈 지원 프로필로 대체하지 않고 거부",
        async (table) => {
            responses[table] = {
                data: null,
                error: { message: `${table} read unavailable` },
            };

            await expect(
                createApplicationSourceSnapshot("web", { strict: true })
            ).rejects.toThrow(`${table} read unavailable`);
        }
    );

    it("정상적인 단일 자료 부재와 빈 목록은 허용", async () => {
        await expect(
            createApplicationSourceSnapshot("web", { strict: true })
        ).resolves.toMatchObject({ jobField: "web", portfolio: [], posts: [] });
    });

    it("엄격한 지원 자료에서는 분할 게시물 전체 본문을 기존 형태로 복원", async () => {
        const { content } = seedChunks();
        responses.posts = {
            data: [
                {
                    id: "post-1",
                    slug: "chunked-post",
                    title: "분할 게시물",
                    content: "",
                    job_field: ["web"],
                },
            ],
            error: null,
        };

        const snapshot = await createApplicationSourceSnapshot("web", {
            strict: true,
        });

        expect(snapshot.posts).toEqual([
            { slug: "chunked-post", title: "분할 게시물", content },
        ]);
    });

    it("지원 자료에 포함된 게시물의 분할 읽기 실패에서는 복사 중단", async () => {
        seedChunks();
        responses.posts = {
            data: [
                {
                    id: "post-1",
                    slug: "chunked-post",
                    title: "분할 게시물",
                    content: "",
                    job_field: "web",
                },
            ],
            error: null,
        };
        responses.post_content_chunks = {
            data: null,
            error: { message: "chunk read unavailable" },
        };

        await expect(
            createApplicationSourceSnapshot("web", { strict: true })
        ).rejects.toThrow("chunk read unavailable");
    });

    it("중복 About 행을 임의로 하나 골라 복사하지 않고 거부", async () => {
        responses.about_data = {
            data: [{ data: {} }, { data: {} }],
            error: null,
        };

        await expect(
            createApplicationSourceSnapshot("web", { strict: true })
        ).rejects.toThrow("row count mismatch");
    });
});

describe("공개 화면의 기존 읽기 동작", () => {
    it("기본 모드의 게시물 반환에서 내부 id 제외", async () => {
        responses.posts = {
            data: [
                {
                    id: "post-1",
                    slug: "inline-post",
                    title: "기존 게시물",
                    content: "inline body",
                    job_field: "web",
                },
            ],
            error: null,
        };

        const snapshot = await createApplicationSourceSnapshot("web");

        expect(snapshot.posts).toEqual([
            {
                slug: "inline-post",
                title: "기존 게시물",
                content: "inline body",
            },
        ]);
    });

    it("기본 모드의 revision 조회 실패에서는 inline 본문 유지", async () => {
        responses.post_content_revisions = {
            data: null,
            error: { message: "revision read unavailable" },
        };

        await expect(
            readPostContentById("post-1", "inline body")
        ).resolves.toEqual({ content: "inline body", storageMode: "inline" });
    });

    it.each(["query", "count", "hash"])(
        "기본 모드의 분할 %s 오류에서는 inline 본문 유지",
        async (failure) => {
            const { revision } = seedChunks();
            if (failure === "query") {
                responses.post_content_chunks = {
                    data: null,
                    error: { message: "chunk read unavailable" },
                };
            }
            if (failure === "count") responses.post_content_chunks.data = [];
            if (failure === "hash") revision.content_hash = "invalid";

            await expect(
                readPostContentById("post-1", "inline body")
            ).resolves.toEqual({
                content: "inline body",
                storageMode: "inline",
            });
        }
    );

    it("기본 모드의 지원 자료 조회 실패에서는 빈 목록 유지", async () => {
        responses.posts = {
            data: null,
            error: { message: "posts read unavailable" },
        };

        await expect(
            createApplicationSourceSnapshot("web")
        ).resolves.toMatchObject({
            jobField: "web",
            portfolio: [],
            posts: [],
        });
    });
});
