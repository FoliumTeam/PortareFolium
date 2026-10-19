import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
    applyJournal,
    buildReplayPlan,
    readReplaySnapshot,
} from "@/lib/refuge/replay";
import {
    getRefugeIdentity,
    type RefugeJournalEntry,
    type RefugeRow,
} from "@/lib/refuge/schema";

// 실제 DB 접근 없이 필터·복합 고유 키·이력서 UUID 제약을 적용하는 가짜 DB
const fakeDatabase = (
    initial: Record<string, RefugeRow[]>,
    options: {
        triggerUpdatedAt?: boolean;
        afterWrite?: (
            tables: Record<string, RefugeRow[]>,
            writeCount: number
        ) => void;
        readError?: { table: string; offset: number };
    } = {}
) => {
    const tables = structuredClone(initial);
    const writes: { table: string; payload?: RefugeRow; columns?: string }[] =
        [];
    const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
    const client = {
        from(table: string) {
            let mode = "select";
            let payload: RefugeRow = {};
            let columns = "";
            const filters: [string, unknown][] = [];
            const orders: string[] = [];
            let offset = 0;
            let end: number | undefined;
            const base = table.replace(/_i18n$/, "");
            const prefix = table.endsWith("_i18n") ? ["lang"] : [];
            const expected = [
                ...prefix,
                ...(table === "about_data_i18n"
                    ? []
                    : ["posts", "portfolio_items", "books", "tags"].includes(
                            base
                        )
                      ? ["slug"]
                      : base === "post_categories"
                        ? ["name"]
                        : base === "site_config"
                          ? ["key"]
                          : base === "resume_data"
                            ? ["lang"]
                            : base === "post_content_chunks"
                              ? ["revision_id", "chunk_index"]
                              : ["id"]),
            ];
            const constraints = [expected];
            if (
                [
                    "posts",
                    "portfolio_items",
                    "books",
                    "about_data",
                    "resume_data",
                ].includes(base)
            )
                constraints.push([...prefix, "id"]);
            const hasDuplicate = (rows: RefugeRow[]) =>
                constraints.some((keys) =>
                    rows.some(
                        (row, index) =>
                            keys.every((key) => row[key] != null) &&
                            rows
                                .slice(index + 1)
                                .some((other) =>
                                    keys.every((key) => row[key] === other[key])
                                )
                    )
                );
            const stamp = (row: RefugeRow) => {
                if (options.triggerUpdatedAt && "updated_at" in row)
                    row.updated_at = new Date(
                        Date.UTC(2026, 9, 19, 0, 0, writes.length + 1)
                    ).toISOString();
                return row;
            };
            const execute = () => {
                const rows = tables[table] ?? [];
                const matches = (row: RefugeRow) =>
                    filters.every(([column, value]) => row[column] === value);
                if (mode === "select") {
                    if (
                        options.readError?.table === table &&
                        options.readError.offset === offset
                    )
                        return {
                            data: [],
                            error: { message: "snapshot read failed" },
                        };
                    const selected = rows.filter(matches).sort((a, b) => {
                        for (const column of orders) {
                            const result = String(a[column]).localeCompare(
                                String(b[column])
                            );
                            if (result) return result;
                        }
                        return 0;
                    });
                    return {
                        data: selected.slice(
                            offset,
                            end === undefined ? undefined : end + 1
                        ),
                        error: null,
                    };
                }
                if (mode === "delete") {
                    writes.push({ table });
                    tables[table] = rows.filter((row) => !matches(row));
                    options.afterWrite?.(tables, writes.length);
                    return { data: [], error: null };
                }
                if (mode === "update") {
                    const changed: RefugeRow[] = [];
                    const nextRows = rows.map((row) => {
                        if (!matches(row)) return row;
                        const next = stamp({ ...row, ...payload });
                        changed.push(next);
                        return next;
                    });
                    if (hasDuplicate(nextRows))
                        return {
                            data: [],
                            error: {
                                message:
                                    "duplicate key value violates unique constraint",
                            },
                        };
                    tables[table] = nextRows;
                    writes.push({ table, payload: { ...payload } });
                    options.afterWrite?.(tables, writes.length);
                    return { data: changed, error: null };
                }
                if (
                    mode === "upsert" &&
                    (expected.length !== columns.split(",").length ||
                        !expected.every((key) =>
                            columns.split(",").includes(key)
                        ))
                ) {
                    return {
                        data: [],
                        error: { message: "no matching unique constraint" },
                    };
                }
                if (
                    table === "resume_data" &&
                    payload.id !== undefined &&
                    !uuid.test(String(payload.id))
                ) {
                    return {
                        data: [],
                        error: {
                            message: "invalid input syntax for type uuid",
                        },
                    };
                }
                const index =
                    mode === "insert"
                        ? -1
                        : rows.findIndex((row) =>
                              expected.every((key) => row[key] === payload[key])
                          );
                const next = { ...(rows[index] ?? {}), ...payload };
                if (table === "resume_data") next.id ??= randomUUID();
                if (index >= 0) stamp(next);
                const nextRows = [...rows];
                if (index >= 0) nextRows[index] = next;
                else nextRows.push(next);
                if (hasDuplicate(nextRows))
                    return {
                        data: [],
                        error: {
                            message:
                                "duplicate key value violates unique constraint",
                        },
                    };
                writes.push({ table, payload: { ...payload }, columns });
                tables[table] = nextRows;
                options.afterWrite?.(tables, writes.length);
                return { data: [next], error: null };
            };
            const query = {
                select: () => query,
                order: (column: string) => {
                    orders.push(column);
                    return query;
                },
                range: async (start: number, last: number) => {
                    offset = start;
                    end = last;
                    return execute();
                },
                eq: (column: string, value: unknown) => {
                    filters.push([column, value]);
                    return query;
                },
                delete: () => {
                    mode = "delete";
                    return query;
                },
                update: (row: RefugeRow) => {
                    mode = "update";
                    payload = row;
                    return query;
                },
                upsert: (row: RefugeRow, options: { onConflict: string }) => {
                    mode = "upsert";
                    payload = row;
                    columns = options.onConflict;
                    return query;
                },
                insert: (row: RefugeRow) => {
                    mode = "insert";
                    payload = row;
                    return query;
                },
                maybeSingle: async () => {
                    const result = execute();
                    if (result.data.length > 1)
                        return {
                            data: null,
                            error: { message: "multiple rows" },
                        };
                    return { ...result, data: result.data[0] ?? null };
                },
                then: (
                    resolve: (value: ReturnType<typeof execute>) => unknown
                ) => Promise.resolve(execute()).then(resolve),
            };
            return query;
        },
    } as unknown as SupabaseClient;
    return { client, tables, writes };
};

// SQLite가 작성한 언어별 identity와 변경 전후 상태 재현
const entry = (
    table: string,
    before: RefugeRow | null,
    after: RefugeRow | null
): RefugeJournalEntry => ({
    id: randomUUID(),
    at: "2026-10-19T00:00:00Z",
    table,
    operation:
        after === null ? "delete" : before === null ? "insert" : "update",
    identity: getRefugeIdentity(table, { ...(after ?? before) }),
    before,
    after,
});

describe("다국어 refuge 복구", () => {
    it("같은 ID와 slug의 번역 수정·삭제를 언어별로 격리", async () => {
        const ko = { id: "same", slug: "same", title: "한국어" };
        const en = { id: "same", lang: "en", slug: "same", title: "English" };
        const ja = { id: "same", lang: "ja", slug: "same", title: "日本語" };
        const nextEn = { ...en, title: "Updated English" };
        const nextJa = { ...ja, title: "更新した日本語" };
        const database = fakeDatabase({ posts: [ko], posts_i18n: [en, ja] });
        const journal = [
            entry("posts_i18n", en, nextEn),
            entry("posts_i18n", ja, nextJa),
            entry("posts_i18n", nextEn, null),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        expect(database.writes).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.posts_i18n).toEqual([nextJa]);
        expect(database.tables.posts).toEqual([ko]);
    });

    it.each([
        ["tags_i18n", { slug: "same", name: "Tag" }],
        ["post_categories_i18n", { name: "Same::category" }],
        ["site_config_i18n", { key: "site_name", value: "Same" }],
        [
            "post_content_chunks_i18n",
            { revision_id: "same", chunk_index: 0, content: "Same" },
        ],
    ])("%s 삭제에서 다른 언어와 다른 조각 보존", async (table, fields) => {
        const en = { ...fields, lang: "en" };
        const ja = { ...fields, lang: "ja" };
        const extra = { ...en, chunk_index: 1 };
        const rows = [
            en,
            ja,
            ...(table === "post_content_chunks_i18n" ? [extra] : []),
        ];
        const database = fakeDatabase({ [table]: rows });
        const journal = [entry(table, en, null)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables[table]).toEqual(rows.slice(1));
    });

    it("분할 본문 upsert에 revision_id·chunk_index·lang 고유 키 적용", async () => {
        const en = {
            revision_id: "same",
            chunk_index: 0,
            lang: "en",
            content: "Old",
        };
        const ja = { ...en, lang: "ja", content: "日本語" };
        const other = { ...en, chunk_index: 1, content: "Other" };
        const database = fakeDatabase({
            post_content_chunks_i18n: [en, ja, other],
        });
        await applyJournal(database.client, [
            entry("post_content_chunks_i18n", en, {
                ...en,
                content: "Updated",
            }),
        ]);
        expect(database.tables.post_content_chunks_i18n).toEqual([
            { ...en, content: "Updated" },
            ja,
            other,
        ]);
    });

    it("분류명과 slug 변경 뒤의 연속 변경도 기존 행에 적용", async () => {
        const category = { lang: "en", name: "Old::category" };
        const renamed = { ...category, name: "New::category" };
        const post = { id: "post", lang: "en", slug: "old", title: "Old" };
        const database = fakeDatabase({
            post_categories_i18n: [category, { ...category, lang: "ja" }],
            posts_i18n: [post],
        });
        const journal = [
            entry("post_categories_i18n", category, renamed),
            entry("post_categories_i18n", renamed, null),
            entry("posts_i18n", post, { ...post, slug: "new" }),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.post_categories_i18n).toEqual([
            { ...category, lang: "ja" },
        ]);
        expect(database.tables.posts_i18n).toEqual([{ ...post, slug: "new" }]);
    });

    it("030 이력서 임시 ID를 제외하고 기존 원격 UUID와 새 UUID 기본값 보존", async () => {
        const id = randomUUID();
        const en = { id: "i18n-en", lang: "en", data: {} };
        const ja = { id: "i18n-ja", lang: "ja", data: { name: "日本語" } };
        const database = fakeDatabase({ resume_data: [{ ...en, id }] });
        const journal = [
            entry("resume_data", en, { ...en, data: { name: "English" } }),
            entry("resume_data", null, ja),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.resume_data[0]).toEqual({
            id,
            lang: "en",
            data: { name: "English" },
        });
        expect(database.tables.resume_data[1]).toMatchObject({
            lang: "ja",
            data: { name: "日本語" },
        });
        expect(database.tables.resume_data[1].id).toMatch(/^[0-9a-f-]{36}$/);
        expect(
            database.writes.every((write) => write.payload?.id === undefined)
        ).toBe(true);
        expect(journal[0].before?.id).toBe("i18n-en");
    });

    it("누락된 언어·조각 키는 전체 적용 전 거부", async () => {
        const database = fakeDatabase({});
        const valid = entry("posts_i18n", null, {
            id: "valid",
            lang: "en",
            slug: "valid",
        });
        for (const invalid of [
            entry("posts_i18n", { id: "shared" }, null),
            entry(
                "post_content_chunks_i18n",
                { lang: "en", revision_id: "shared" },
                null
            ),
        ]) {
            await expect(
                buildReplayPlan(database.client, [valid, invalid])
            ).rejects.toThrow("identity missing or invalid");
            await expect(
                applyJournal(database.client, [valid, invalid], {
                    localWins: true,
                })
            ).rejects.toThrow("identity missing or invalid");
        }
        expect(database.writes).toEqual([]);
    });

    it("원격 변경 거부와 명시적 localWins 적용 범위·로컬 인증 자료 제외 유지", async () => {
        const before = {
            id: "post",
            lang: "en",
            slug: "same",
            title: "Before",
        };
        const remote = { ...before, title: "Remote" };
        const ja = { ...before, lang: "ja", title: "日本語" };
        const local = { ...before, title: "Local" };
        const database = fakeDatabase({ posts_i18n: [remote, ja] });
        const journal = [
            entry("posts_i18n", before, local),
            entry("admin_login_attempts", null, { key_hash: "local" }),
        ];
        const plan = await buildReplayPlan(database.client, journal);
        expect(plan.conflicts).toHaveLength(1);
        expect(plan.skippedLocalOnly).toHaveLength(1);
        await expect(applyJournal(database.client, journal)).rejects.toThrow(
            "drift before apply"
        );
        expect(database.writes).toEqual([]);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.posts_i18n).toEqual([local, ja]);
        expect(database.tables).not.toHaveProperty("admin_login_attempts");
        expect(
            (
                await buildReplayPlan(database.client, [
                    entry("ai_agent_tokens", null, { id: "excluded" }),
                ])
            ).conflicts[0].reason
        ).toBe("unsupported table");
    });

    it("같은 언어·slug의 새 원격 ID도 충돌로 감지하고 localWins에서만 대체", async () => {
        const remote = {
            id: "remote-id",
            lang: "en",
            slug: "same",
            title: "Remote",
        };
        const local = { ...remote, id: "local-id", title: "Local" };
        const ja = { ...remote, lang: "ja", title: "日本語" };
        const database = fakeDatabase({ posts_i18n: [remote, ja] });
        const journal = [entry("posts_i18n", null, local)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts[0]
                .reason
        ).toBe("Supabase row exists for local insert");
        const plan = await buildReplayPlan(database.client, journal, {
            localWins: true,
        });
        expect(plan.conflicts).toEqual([]);
        expect(plan.overrides).toHaveLength(1);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.posts_i18n).toEqual([local, ja]);
    });

    it("언어별 소개 한 개 제약에서 원격 ID가 달라도 충돌 감지", async () => {
        const remote = {
            id: "remote-id",
            lang: "en",
            data: { name: "Remote" },
        };
        const local = { ...remote, id: "local-id", data: { name: "Local" } };
        const ja = { ...remote, lang: "ja" };
        const database = fakeDatabase({ about_data_i18n: [remote, ja] });
        const journal = [entry("about_data_i18n", null, local)];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toHaveLength(1);
        await applyJournal(database.client, journal, { localWins: true });
        expect(database.tables.about_data_i18n).toEqual([local, ja]);
    });

    it("서버 자동 updated_at 변경 뒤에도 연속 본문·공개 상태 복구 완료", async () => {
        const before = {
            id: "post",
            slug: "same",
            lang: "en",
            content: "Before",
            published: false,
            updated_at: "2026-10-01T00:00:00Z",
        };
        const first = {
            ...before,
            content: "First",
            updated_at: "2026-10-02T00:00:00Z",
        };
        const last = {
            ...first,
            content: "Last",
            published: true,
            updated_at: "2026-10-03T00:00:00Z",
        };
        const ja = { ...before, lang: "ja" };
        const database = fakeDatabase(
            { posts_i18n: [before, ja] },
            { triggerUpdatedAt: true }
        );
        const journal = [
            entry("posts_i18n", before, first),
            entry("posts_i18n", first, last),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.writes).toHaveLength(2);
        expect(database.tables.posts_i18n[0]).toMatchObject({
            content: "Last",
            published: true,
        });
        expect(database.tables.posts_i18n[0].updated_at).not.toBe(
            last.updated_at
        );
        expect(database.tables.posts_i18n[1]).toEqual(ja);
    });

    it("최상위 updated_at만 달라진 원격 행은 내용 충돌에서 제외", async () => {
        const before = {
            id: "post",
            slug: "same",
            lang: "en",
            content: "Before",
            updated_at: "local-time",
        };
        const database = fakeDatabase(
            { posts_i18n: [{ ...before, updated_at: "server-time" }] },
            { triggerUpdatedAt: true }
        );
        const journal = [
            entry("posts_i18n", before, { ...before, content: "After" }),
        ];
        expect(
            (await buildReplayPlan(database.client, journal)).conflicts
        ).toEqual([]);
        await applyJournal(database.client, journal);
        expect(database.tables.posts_i18n[0].content).toBe("After");
    });

    it.each([
        { content: "Remote body" },
        { published: true },
        { data: { updated_at: "Remote content metadata" } },
    ])(
        "updated_at 차이를 허용해도 실제 본문·공개 상태·중첩 자료 변경 거부: %j",
        async (change) => {
            const before = {
                id: "portfolio",
                slug: "same",
                lang: "en",
                content: "Before",
                published: false,
                data: { updated_at: "Content metadata" },
                updated_at: "local-time",
            };
            const database = fakeDatabase({
                portfolio_items_i18n: [
                    { ...before, ...change, updated_at: "server-time" },
                ],
            });
            const journal = [
                entry("portfolio_items_i18n", before, {
                    ...before,
                    content: "Local",
                }),
            ];
            expect(
                (await buildReplayPlan(database.client, journal)).conflicts
            ).toHaveLength(1);
            await expect(
                applyJournal(database.client, journal)
            ).rejects.toThrow("drift before apply");
            expect(database.writes).toEqual([]);
        }
    );

    it("서버 trigger와 함께 발생한 외부 본문 수정은 다음 쓰기 전 거부", async () => {
        const before = {
            id: "post",
            slug: "same",
            lang: "en",
            content: "Before",
            updated_at: "original",
        };
        const first = {
            ...before,
            content: "First",
            updated_at: "first-local-time",
        };
        const database = fakeDatabase(
            { posts_i18n: [before] },
            {
                triggerUpdatedAt: true,
                afterWrite(tables, count) {
                    if (count === 1)
                        tables.posts_i18n[0].content = "Concurrent remote edit";
                },
            }
        );
        const journal = [
            entry("posts_i18n", before, first),
            entry("posts_i18n", first, { ...first, content: "Last" }),
        ];
        await expect(applyJournal(database.client, journal)).rejects.toThrow(
            "drift before apply"
        );
        expect(database.writes).toHaveLength(1);
        expect(database.tables.posts_i18n[0].content).toBe(
            "Concurrent remote edit"
        );
    });

    it.each([false, true])(
        "rename 목적지 기존 자료는 localWins=%s에서도 전체 적용 전 충돌",
        async (localWins) => {
            const source = {
                id: "source",
                slug: "old",
                lang: "en",
                title: "Source",
            };
            const destination = {
                id: "destination",
                slug: "new",
                lang: "en",
                title: "Destination",
            };
            const ja = { ...destination, lang: "ja" };
            const config = { key: "site_name", value: "Before" };
            const database = fakeDatabase({
                posts_i18n: [source, destination, ja],
                site_config: [config],
            });
            const journal = [
                entry("site_config", config, { ...config, value: "Local" }),
                entry("posts_i18n", source, { ...source, slug: "new" }),
            ];
            const plan = await buildReplayPlan(database.client, journal, {
                localWins,
            });
            expect(plan.conflicts[0]?.reason).toContain(
                "destination row exists"
            );
            await expect(
                applyJournal(database.client, journal, { localWins })
            ).rejects.toThrow("destination row exists");
            expect(database.writes).toEqual([]);
            expect(database.tables.posts_i18n).toEqual([
                source,
                destination,
                ja,
            ]);
            expect(database.tables.site_config).toEqual([config]);
        }
    );

    it("분류명 변경의 목적지 분류 충돌도 사전 거부", async () => {
        const source = { name: "Old", lang: "en" };
        const destination = { name: "New", lang: "en" };
        const database = fakeDatabase({
            post_categories_i18n: [source, destination],
        });
        const journal = [
            entry("post_categories_i18n", source, { ...source, name: "New" }),
        ];
        expect(
            (
                await buildReplayPlan(database.client, journal, {
                    localWins: true,
                })
            ).conflicts[0]?.reason
        ).toContain("destination row exists");
        await expect(
            applyJournal(database.client, journal, { localWins: true })
        ).rejects.toThrow("destination row exists");
        expect(database.writes).toEqual([]);
    });

    it("사전 검사 후 새로 생긴 rename 목적지도 쓰기 직전 거부", async () => {
        const source = {
            id: "source",
            slug: "old",
            lang: "en",
            title: "Source",
        };
        const destination = {
            id: "destination",
            slug: "new",
            lang: "en",
            title: "Concurrent destination",
        };
        const config = { key: "site_name", value: "Before" };
        const database = fakeDatabase(
            { posts_i18n: [source], site_config: [config] },
            {
                afterWrite(tables, count) {
                    if (count === 1) tables.posts_i18n.push(destination);
                },
            }
        );
        const journal = [
            entry("site_config", config, { ...config, value: "Local" }),
            entry("posts_i18n", source, { ...source, slug: "new" }),
        ];
        await expect(
            applyJournal(database.client, journal, { localWins: true })
        ).rejects.toThrow("destination row exists");
        expect(database.writes).toHaveLength(1);
        expect(database.tables.posts_i18n).toEqual([source, destination]);
    });

    it("rename 원본 부재의 재생성 경쟁에서도 새 목적지 자료 덮어쓰기 차단", async () => {
        const source = {
            id: "source",
            slug: "old",
            lang: "en",
            title: "Source",
        };
        const destination = {
            id: "destination",
            slug: "new",
            lang: "en",
            title: "Concurrent destination",
        };
        const database = fakeDatabase(
            { posts_i18n: [] },
            {
                afterWrite(tables, count) {
                    if (count === 1) tables.posts_i18n.push(destination);
                },
            }
        );
        const journal = [
            entry("posts_i18n", source, { ...source, slug: "new" }),
        ];
        await expect(
            applyJournal(database.client, journal, { localWins: true })
        ).rejects.toThrow("duplicate key");
        expect(database.tables.posts_i18n).toEqual([destination]);
    });

    it("복구 전 백업에 1000행을 넘는 언어별 이력 전체 포함", async () => {
        const rows = Array.from({ length: 1210 }, (_, index) => ({
            id: `post-${String(Math.floor(index / 2)).padStart(4, "0")}`,
            slug: `post-${String(Math.floor(index / 2)).padStart(4, "0")}`,
            lang: index % 2 === 0 ? "en" : "ja",
            content: `Body ${index}`,
        }));
        const database = fakeDatabase({ posts_i18n: [...rows].reverse() });
        const snapshot = await readReplaySnapshot(database.client);
        expect(snapshot.posts_i18n).toHaveLength(1210);
        expect(
            new Set(snapshot.posts_i18n.map((row) => `${row.lang}:${row.id}`))
                .size
        ).toBe(1210);
        expect(snapshot.posts_i18n.map((row) => row.content).sort()).toEqual(
            rows.map((row) => row.content).sort()
        );
        expect(database.writes).toEqual([]);
    });

    it("복구 전 백업의 다음 페이지 오류 시 불완전한 결과 반환 거부", async () => {
        const rows = Array.from({ length: 501 }, (_, index) => ({
            id: String(index),
        }));
        const database = fakeDatabase(
            { post_content_revisions_i18n: rows },
            { readError: { table: "post_content_revisions_i18n", offset: 500 } }
        );
        await expect(readReplaySnapshot(database.client)).rejects.toThrow(
            "snapshot read failed"
        );
        expect(database.writes).toEqual([]);
    });

    it("복구 전 백업 행 제한 초과 시 조용한 잘림 대신 오류 반환", async () => {
        const query = {
            select: () => query,
            order: () => query,
            range: async () => ({
                data: Array.from({ length: 500 }, (_, index) => ({
                    id: index,
                })),
                error: null,
            }),
        };
        const client = { from: () => query } as unknown as SupabaseClient;
        await expect(readReplaySnapshot(client)).rejects.toThrow("100000");
    });
});
