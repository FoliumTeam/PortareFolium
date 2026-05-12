import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

type PostRow = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
    job_field: string[] | null;
    thumbnail: string | null;
    content: string;
    published: boolean;
    updated_at: string;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type RevisionRow = {
    id: string;
    post_id: string;
    content_hash: string;
    content_size: number;
    chunk_size: number;
    chunk_count: number;
    active: boolean;
    status: string;
    committed_at?: string | null;
};

type ChunkRow = {
    revision_id: string;
    chunk_index: number;
    content: string;
    checksum: string;
};

type Filter = {
    field: string;
    value: unknown;
    negate?: boolean;
};

type FakeDb = {
    posts: PostRow[];
    revisions: RevisionRow[];
    chunks: ChunkRow[];
    writes: {
        table: string;
        operation: "insert" | "update" | "delete";
        payload?: unknown;
        filters?: Filter[];
    }[];
};

const mocks = vi.hoisted(() => ({
    requireAdminSession: vi.fn(async () => ({
        user: { id: "admin", isAdmin: true },
    })),
    revalidatePost: vi.fn(async () => undefined),
    serverClient: {
        from: vi.fn(),
    },
}));

vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/app/admin/actions/revalidate", () => ({
    revalidatePost: mocks.revalidatePost,
}));

vi.mock("@/lib/supabase", () => ({
    serverClient: mocks.serverClient,
}));

const POST_SELECT_BASE: Omit<PostRow, "id" | "slug" | "title" | "content"> = {
    description: "description",
    pub_date: "2026-05-11T00:00",
    category: "dev",
    tags: ["next"],
    job_field: ["frontend"],
    thumbnail: null,
    published: false,
    updated_at: "2026-05-11T00:00:00.000Z",
    meta_title: null,
    meta_description: null,
    og_image: null,
};

let db: FakeDb;

function sha256Hex(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function cloneFilters(filters: Filter[]) {
    return filters.map((filter) => ({ ...filter }));
}

function matchesFilters(row: Record<string, unknown>, filters: Filter[]) {
    return filters.every((filter) => {
        const matches = row[filter.field] === filter.value;
        return filter.negate ? !matches : matches;
    });
}

function selectRows(
    table: string,
    filters: Filter[]
): Record<string, unknown>[] {
    if (table === "posts") {
        return db.posts.filter((row) =>
            matchesFilters(row as unknown as Record<string, unknown>, filters)
        ) as unknown as Record<string, unknown>[];
    }
    if (table === "post_content_revisions") {
        return db.revisions.filter((row) =>
            matchesFilters(row as unknown as Record<string, unknown>, filters)
        ) as unknown as Record<string, unknown>[];
    }
    if (table === "post_content_chunks") {
        return db.chunks.filter((row) =>
            matchesFilters(row as unknown as Record<string, unknown>, filters)
        ) as unknown as Record<string, unknown>[];
    }
    return [];
}

function upsertPost(payload: Partial<PostRow>) {
    db.posts.push({
        ...POST_SELECT_BASE,
        id: `post-${db.posts.length + 1}`,
        slug: payload.slug ?? `post-${db.posts.length + 1}`,
        title: payload.title ?? "Untitled",
        content: payload.content ?? "",
    });
}

function executeMutation(
    table: string,
    operation: "insert" | "update" | "delete",
    payload: unknown,
    filters: Filter[]
) {
    db.writes.push({
        table,
        operation,
        payload,
        filters: cloneFilters(filters),
    });

    if (operation === "insert") {
        if (table === "posts") upsertPost(payload as Partial<PostRow>);
        if (table === "post_content_revisions") {
            db.revisions.push(payload as RevisionRow);
        }
        if (table === "post_content_chunks") {
            db.chunks.push(payload as ChunkRow);
        }
        return { error: null };
    }

    if (operation === "update") {
        for (const row of selectRows(table, filters)) {
            Object.assign(row, payload);
        }
        return { error: null };
    }

    if (operation === "delete") {
        if (table === "post_content_revisions") {
            db.revisions = db.revisions.filter(
                (row) =>
                    !matchesFilters(
                        row as unknown as Record<string, unknown>,
                        filters
                    )
            );
        }
        if (table === "post_content_chunks") {
            db.chunks = db.chunks.filter(
                (row) =>
                    !matchesFilters(
                        row as unknown as Record<string, unknown>,
                        filters
                    )
            );
        }
        return { error: null };
    }

    return { error: null };
}

function createQueryBuilder(table: string) {
    let operation: "select" | "insert" | "update" | "delete" = "select";
    let payload: unknown;
    const filters: Filter[] = [];
    let orderField: string | null = null;
    let ascending = true;
    let rowLimit: number | null = null;

    const execute = ():
        | { data: Record<string, unknown>[]; error: null }
        | { error: null } => {
        if (operation !== "select") {
            return executeMutation(table, operation, payload, filters);
        }

        let rows = selectRows(table, filters);
        if (orderField) {
            rows = [...rows].sort((a, b) => {
                const left = (a as unknown as Record<string, unknown>)[
                    orderField as string
                ];
                const right = (b as unknown as Record<string, unknown>)[
                    orderField as string
                ];
                if (left === right) return 0;
                const result = String(left) < String(right) ? -1 : 1;
                return ascending ? result : -result;
            });
        }
        if (rowLimit !== null) rows = rows.slice(0, rowLimit);
        return { data: rows, error: null };
    };

    const builder = {
        select() {
            operation = "select";
            return builder;
        },
        insert(nextPayload: unknown) {
            operation = "insert";
            payload = nextPayload;
            return builder;
        },
        update(nextPayload: unknown) {
            operation = "update";
            payload = nextPayload;
            return builder;
        },
        delete() {
            operation = "delete";
            return builder;
        },
        eq(field: string, value: unknown) {
            filters.push({ field, value });
            return builder;
        },
        neq(field: string, value: unknown) {
            filters.push({ field, value, negate: true });
            return builder;
        },
        order(field: string, options?: { ascending?: boolean }) {
            orderField = field;
            ascending = options?.ascending ?? true;
            return builder;
        },
        limit(limit: number) {
            rowLimit = limit;
            return builder;
        },
        single() {
            const result = execute();
            const data =
                "data" in result && Array.isArray(result.data)
                    ? result.data[0]
                    : null;
            return Promise.resolve({ data: data ?? null, error: null });
        },
        maybeSingle() {
            const result = execute();
            const data =
                "data" in result && Array.isArray(result.data)
                    ? result.data[0]
                    : null;
            return Promise.resolve({ data: data ?? null, error: null });
        },
        then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?:
                | ((value: unknown) => TResult1 | PromiseLike<TResult1>)
                | null,
            onrejected?:
                | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
                | null
        ) {
            return Promise.resolve(execute()).then(onfulfilled, onrejected);
        },
    };

    return builder;
}

function resetDb() {
    db = {
        posts: [
            {
                ...POST_SELECT_BASE,
                id: "post-1",
                slug: "original-post",
                title: "Original post",
                content: "INLINE_CONTENT_BEFORE_CHUNK_COMMIT",
            },
        ],
        revisions: [],
        chunks: [],
        writes: [],
    };
    mocks.serverClient.from.mockImplementation((table: string) =>
        createQueryBuilder(table)
    );
}

async function postChunkedContent(body: Record<string, unknown>) {
    const { POST } =
        await import("@/app/api/admin/posts/chunked-content/route");
    return POST({ json: async () => body } as never);
}

describe("post content size and chunk save safeguards", () => {
    beforeEach(() => {
        vi.resetModules();
        mocks.requireAdminSession.mockClear();
        mocks.revalidatePost.mockClear();
        mocks.serverClient.from.mockReset();
        resetDb();
    });

    it("keeps the Server Actions body size limit at the changelog-required 4MB", () => {
        expect(
            (
                nextConfig as {
                    experimental?: {
                        serverActions?: { bodySizeLimit?: string };
                    };
                }
            ).experimental?.serverActions?.bodySizeLimit
        ).toBe("4mb");
    });

    it("saves large post content through chunks without overwriting existing inline content before commit", async () => {
        const content = "first chunk\n두 번째 chunk 🌿";
        const chunks = ["first chunk\n", "두 번째 chunk 🌿"];
        const initResponse = await postChunkedContent({
            action: "init",
            editTargetId: "post-1",
            payload: {
                slug: "large-post",
                title: "Large post",
                description: null,
                pub_date: "2026-05-11T00:00",
                category: null,
                tags: [],
                job_field: null,
                thumbnail: null,
                content,
                published: true,
                meta_title: null,
                meta_description: null,
                og_image: null,
            },
            contentHash: sha256Hex(content),
            contentSize: new Blob([content]).size,
            chunkSize: 256 * 1024,
            chunkCount: chunks.length,
        });

        expect(initResponse.status).toBe(200);
        const initJson = (await initResponse.json()) as {
            revisionId: string;
            post: PostRow;
        };
        expect(initJson.post.content).toBe(
            "INLINE_CONTENT_BEFORE_CHUNK_COMMIT"
        );

        const postUpdate = db.writes.find(
            (write) => write.table === "posts" && write.operation === "update"
        );
        expect(postUpdate?.payload).not.toHaveProperty("content");
        expect(db.posts[0]?.content).toBe("INLINE_CONTENT_BEFORE_CHUNK_COMMIT");

        for (let index = 0; index < chunks.length; index += 1) {
            const chunk = chunks[index] ?? "";
            const chunkResponse = await postChunkedContent({
                action: "chunk",
                revisionId: initJson.revisionId,
                chunkIndex: index,
                content: chunk,
                checksum: sha256Hex(chunk),
            });
            expect(chunkResponse.status).toBe(200);
        }

        const commitResponse = await postChunkedContent({
            action: "commit",
            revisionId: initJson.revisionId,
        });

        expect(commitResponse.status).toBe(200);
        await expect(commitResponse.json()).resolves.toMatchObject({
            success: true,
            post: { id: "post-1", slug: "large-post", content },
            storageMode: "chunked",
        });
        expect(mocks.revalidatePost).toHaveBeenCalledWith("large-post");
        expect(db.revisions).toMatchObject([
            {
                id: initJson.revisionId,
                post_id: "post-1",
                active: true,
                status: "committed",
            },
        ]);
    });

    it("uses an empty inline content placeholder for new chunked posts instead of writing the large body through Server Actions", async () => {
        const content = "new large body";
        const response = await postChunkedContent({
            action: "init",
            payload: {
                slug: "new-large-post",
                title: "New large post",
                description: null,
                pub_date: "2026-05-11T00:00",
                category: null,
                tags: [],
                job_field: null,
                thumbnail: null,
                content,
                published: false,
                meta_title: null,
                meta_description: null,
                og_image: null,
            },
            contentHash: sha256Hex(content),
            contentSize: new Blob([content]).size,
            chunkSize: 256 * 1024,
            chunkCount: 1,
        });

        expect(response.status).toBe(200);
        const postInsert = db.writes.find(
            (write) => write.table === "posts" && write.operation === "insert"
        );
        expect(postInsert?.payload).toMatchObject({
            slug: "new-large-post",
            content: "",
        });
        expect(postInsert?.payload).not.toMatchObject({ content });
    });

    it("rejects compromised chunk payloads before storing them", async () => {
        db.revisions.push({
            id: "revision-1",
            post_id: "post-1",
            content_hash: sha256Hex("expected"),
            content_size: 8,
            chunk_size: 256 * 1024,
            chunk_count: 1,
            active: false,
            status: "pending",
        });

        const checksumResponse = await postChunkedContent({
            action: "chunk",
            revisionId: "revision-1",
            chunkIndex: 0,
            content: "tampered",
            checksum: sha256Hex("different"),
        });

        expect(checksumResponse.status).toBe(400);
        await expect(checksumResponse.json()).resolves.toMatchObject({
            success: false,
            error: "chunk checksum 불일치",
        });
        expect(db.chunks).toHaveLength(0);

        const oversizedResponse = await postChunkedContent({
            action: "chunk",
            revisionId: "revision-1",
            chunkIndex: 0,
            content: "x".repeat(512 * 1024 + 1),
            checksum: sha256Hex("x".repeat(512 * 1024 + 1)),
        });

        expect(oversizedResponse.status).toBe(413);
        await expect(oversizedResponse.json()).resolves.toMatchObject({
            success: false,
            error: "chunk 크기 초과",
        });
        expect(db.chunks).toHaveLength(0);
    });

    it("rejects commit when stored chunks do not reconstruct the declared content hash", async () => {
        db.revisions.push({
            id: "revision-1",
            post_id: "post-1",
            content_hash: sha256Hex("expected content"),
            content_size: 16,
            chunk_size: 256 * 1024,
            chunk_count: 2,
            active: false,
            status: "pending",
        });
        db.chunks.push({
            revision_id: "revision-1",
            chunk_index: 0,
            content: "only one chunk",
            checksum: sha256Hex("only one chunk"),
        });

        const missingResponse = await postChunkedContent({
            action: "commit",
            revisionId: "revision-1",
        });

        expect(missingResponse.status).toBe(409);
        await expect(missingResponse.json()).resolves.toMatchObject({
            success: false,
            error: "chunk 누락",
        });
        expect(
            db.writes.some(
                (write) =>
                    write.table === "post_content_revisions" &&
                    write.operation === "update"
            )
        ).toBe(false);

        db.chunks.push({
            revision_id: "revision-1",
            chunk_index: 1,
            content: " but wrong",
            checksum: sha256Hex(" but wrong"),
        });

        const hashResponse = await postChunkedContent({
            action: "commit",
            revisionId: "revision-1",
        });

        expect(hashResponse.status).toBe(409);
        await expect(hashResponse.json()).resolves.toMatchObject({
            success: false,
            error: "content checksum 불일치",
        });
        expect(
            db.writes.some(
                (write) =>
                    write.table === "post_content_revisions" &&
                    write.operation === "update"
            )
        ).toBe(false);
    });
});
