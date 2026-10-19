import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
let tempDir = "";

async function seedRefuge(rows: Record<string, unknown>[]) {
    const paths = await import("@/lib/refuge/paths");
    const store = await import("@/lib/refuge/store");
    const database = store.getRefugeDatabase();
    store.replaceRefugeTableRows(database, "posts", rows);
    store.replaceRefugeTableRows(database, "tags", []);
    fs.writeFileSync(paths.REFUGE_JOURNAL_PATH, "", "utf8");
    fs.writeFileSync(
        paths.REFUGE_MODE_PATH,
        JSON.stringify(
            {
                mode: "sqlite-refuge",
                activatedAt: new Date().toISOString(),
                dbPath: paths.REFUGE_DB_PATH,
                manifestPath: paths.REFUGE_MANIFEST_PATH,
                journalPath: paths.REFUGE_JOURNAL_PATH,
            },
            null,
            2
        ),
        "utf8"
    );
}

describe("sqlite refuge server client", () => {
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portare-refuge-"));
        process.chdir(tempDir);
        vi.resetModules();
    });

    afterEach(async () => {
        const store = await import("@/lib/refuge/store");
        store.closeRefugeDatabase();
        process.chdir(originalCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
        vi.resetModules();
    });

    it("reads filtered rows from local sqlite when refuge mode is active", async () => {
        await seedRefuge([
            { id: "1", slug: "draft", title: "Draft", published: false },
            { id: "2", slug: "live", title: "Live", published: true },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const { data, error } = await serverClient!
            .from("posts")
            .select("slug, title")
            .eq("published", true)
            .single();

        expect(error).toBeNull();
        expect(data).toEqual({ slug: "live", title: "Live" });
    });

    it("returns exact head counts for dashboard summaries", async () => {
        await seedRefuge([
            { id: "1", slug: "draft", title: "Draft", published: false },
            { id: "2", slug: "live", title: "Live", published: true },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const { count, data, error } = await serverClient!
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("published", false);

        expect(error).toBeNull();
        expect(data).toBeNull();
        expect(count).toBe(1);
    });

    it("allows release-1 site_config keys", async () => {
        await seedRefuge([]);

        const { serverClient } = await import("@/lib/supabase");
        const store = await import("@/lib/refuge/store");
        const configResult = await serverClient!
            .from("site_config")
            .upsert(
                [
                    { key: "color_scheme", value: "riot" },
                    { key: "site_name", value: "Portfolio" },
                    { key: "seo_config", value: { default_description: "ok" } },
                ],
                { onConflict: "key" }
            )
            .select("key, value");

        expect(configResult.error).toBeNull();
        expect(configResult.data).toHaveLength(3);
        for (const row of store.listRefugeRows("site_config")) {
            expect(row).not.toHaveProperty("id");
            expect(row).not.toHaveProperty("created_at");
        }
    });

    it("does not add unsupported timestamp columns to schema-light tables", async () => {
        await seedRefuge([]);

        const { serverClient } = await import("@/lib/supabase");
        const store = await import("@/lib/refuge/store");
        const editorResult = await serverClient!
            .from("editor_states")
            .insert({
                id: "editor-state-1",
                entity_type: "posts",
                entity_slug: "hello",
                label: "Initial",
                content: "{}",
            })
            .select("*")
            .single();
        const tagResult = await serverClient!
            .from("tags")
            .insert({ slug: "new", name: "New" })
            .select("*")
            .single();

        expect(editorResult.error).toBeNull();
        expect(editorResult.data).not.toHaveProperty("updated_at");
        expect(tagResult.error).toBeNull();
        expect(tagResult.data).not.toHaveProperty("id");
        expect(tagResult.data).not.toHaveProperty("updated_at");
        expect(store.listRefugeRows("editor_states")[0]).not.toHaveProperty(
            "updated_at"
        );
        expect(store.listRefugeRows("tags")[0]).not.toHaveProperty(
            "updated_at"
        );
    });

    it("rejects auth tables but allows site_config keys", async () => {
        await seedRefuge([]);

        const { serverClient } = await import("@/lib/supabase");
        const tokenResult = await serverClient!
            .from("ai_agent_tokens")
            .select("id");
        expect(tokenResult.error?.message).toContain("not available");

        const configResult = await serverClient!.from("site_config").upsert(
            [
                { key: "color_scheme", value: "riot" },
                { key: "plain_mode", value: false },
            ],
            { onConflict: "key" }
        );
        expect(configResult.error).toBeNull();
    });

    it("allows local admin login attempts without Supabase replay", async () => {
        await seedRefuge([]);

        const schema = await import("@/lib/refuge/schema");
        expect(schema.isRefugeQueryableTable("admin_login_attempts")).toBe(
            true
        );
        expect(schema.REFUGE_REPLAY_TABLES).not.toContain(
            "admin_login_attempts"
        );

        const { serverClient } = await import("@/lib/supabase");
        const result = await serverClient!
            .from("admin_login_attempts")
            .upsert(
                {
                    key_hash: "login-key",
                    attempts: 1,
                    blocked_until: null,
                },
                { onConflict: "key_hash" }
            )
            .select("key_hash, attempts")
            .single();

        expect(result.error).toBeNull();
        expect(result.data).toEqual({ key_hash: "login-key", attempts: 1 });
    });

    it("allows tag mutations and post category mass updates in refuge mode", async () => {
        await seedRefuge([
            { id: "1", slug: "one", title: "One", category: "Old" },
            { id: "2", slug: "two", title: "Two", category: "Old" },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const tagResult = await serverClient!
            .from("tags")
            .insert({ slug: "new", name: "New" });
        expect(tagResult.error).toBeNull();

        const categoryResult = await serverClient!
            .from("posts")
            .update({ category: "New" })
            .eq("category", "Old");
        expect(categoryResult.error).toBeNull();
        expect(categoryResult.data).toHaveLength(2);
    });

    it("allows content deletes in refuge mode", async () => {
        await seedRefuge([
            { id: "1", slug: "live", title: "Live", published: true },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const result = await serverClient!
            .from("posts")
            .delete()
            .eq("slug", "live");

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(1);
    });

    it("writes local projection updates and records the journal", async () => {
        await seedRefuge([
            { id: "1", slug: "live", title: "Live", published: true },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const paths = await import("@/lib/refuge/paths");
        const store = await import("@/lib/refuge/store");
        const update = await serverClient!
            .from("posts")
            .update({ title: "Updated" })
            .eq("slug", "live")
            .select("slug, title")
            .single();

        expect(update.error).toBeNull();
        expect(update.data).toEqual({ slug: "live", title: "Updated" });

        const journal = fs
            .readFileSync(paths.REFUGE_JOURNAL_PATH, "utf8")
            .trim()
            .split("\n")
            .map(
                (line) =>
                    JSON.parse(line) as {
                        operation: string;
                        table: string;
                        prevHash: string;
                        hash: string;
                    }
            );
        expect(journal).toMatchObject([
            {
                operation: "update",
                table: "posts",
                prevHash: store.REFUGE_JOURNAL_GENESIS_HASH,
            },
        ]);
        expect(journal[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(store.readRefugeJournal()).toHaveLength(1);
    });

    it("rejects tampered refuge journal entries", async () => {
        await seedRefuge([
            { id: "1", slug: "live", title: "Live", published: true },
        ]);

        const { serverClient } = await import("@/lib/supabase");
        const paths = await import("@/lib/refuge/paths");
        const store = await import("@/lib/refuge/store");
        await serverClient!
            .from("posts")
            .update({ title: "Updated" })
            .eq("slug", "live");

        const entry = JSON.parse(
            fs.readFileSync(paths.REFUGE_JOURNAL_PATH, "utf8").trim()
        ) as { after: { title: string } };
        entry.after.title = "Tampered";
        fs.writeFileSync(
            paths.REFUGE_JOURNAL_PATH,
            `${JSON.stringify(entry)}\n`,
            "utf8"
        );

        expect(() => store.readRefugeJournal()).toThrow(/hash mismatch/);
    });

    it("applies SQLite-only migrations by updating local schema version without journal replay", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const paths = await import("@/lib/refuge/paths");
        const migrations = await import("@/lib/refuge/sqlite-migrations");
        const database = store.getRefugeDatabase();
        store.replaceRefugeTableRows(database, "site_config", [
            { key: "db_schema_version", value: "0.12.0" },
        ]);

        migrations.applySqliteRefugeMigration({
            version: "0.12.106",
            title: "local sqlite metadata",
            feature: "sqlite refuge migration",
            sql: "SELECT 1;",
            sqliteSql:
                "CREATE TABLE IF NOT EXISTS refuge_migration_probe (id TEXT PRIMARY KEY);",
        });

        expect(migrations.getSqliteRefugeSchemaVersion()).toBe("0.12.106");
        expect(fs.readFileSync(paths.REFUGE_JOURNAL_PATH, "utf8")).toBe("");
        expect(
            database
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
                )
                .get("refuge_migration_probe")
        ).toBeTruthy();
    });

    it("applies the resume en-row removal migration locally", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const migrations = await import("@/lib/refuge/sqlite-migrations");
        const database = store.getRefugeDatabase();
        store.replaceRefugeTableRows(database, "site_config", [
            { key: "db_schema_version", value: "0.12.113" },
        ]);
        store.replaceRefugeTableRows(database, "resume_data", [
            { id: "ko-id", lang: "ko", data: {} },
            { id: "en-id", lang: "en", data: {} },
        ]);

        migrations.applySqliteRefugeMigration({
            version: "0.12.114",
            title: "drop en resume",
            feature: "resume cleanup",
            sql: "DELETE FROM resume_data WHERE lang = 'en';",
            sqliteSql: `
DELETE FROM refuge_rows
WHERE table_name = 'resume_data'
  AND identity = 'en';`,
        });

        expect(store.listRefugeRows("resume_data")).toEqual([
            { id: "ko-id", lang: "ko", data: {} },
        ]);
        expect(migrations.getSqliteRefugeSchemaVersion()).toBe("0.12.114");
    });

    it.each([
        { id: "existing", slug: "another", title: "PK collision" },
        { id: "another", slug: "existing", title: "Slug collision" },
    ])(
        "insert 고유 키 충돌에서 기존 행과 journal 보존: %j",
        async (incoming) => {
            const original = {
                id: "existing",
                slug: "existing",
                title: "Original",
            };
            await seedRefuge([original]);
            const { unscopedServerClient: client } =
                await import("@/lib/supabase");
            const store = await import("@/lib/refuge/store");
            const result = await client!.from("posts").insert(incoming);
            expect(result.error).not.toBeNull();
            expect(store.listRefugeRows("posts")).toEqual([original]);
            expect(store.readRefugeJournal()).toEqual([]);
        }
    );

    it("insert 일괄 저장의 두 번째 충돌에서 첫 번째 행과 journal도 취소", async () => {
        const original = {
            id: "existing",
            slug: "existing",
            title: "Original",
        };
        await seedRefuge([original]);
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const store = await import("@/lib/refuge/store");
        const result = await client!.from("posts").insert([
            { id: "new", slug: "new", title: "New" },
            { id: "collision", slug: "existing", title: "Must not replace" },
        ]);
        expect(result.error).not.toBeNull();
        expect(store.listRefugeRows("posts")).toEqual([original]);
        expect(store.readRefugeJournal()).toEqual([]);
    });

    it("같은 insert 일괄 자료 안의 고유 키 중복도 전체 거부", async () => {
        await seedRefuge([]);
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const store = await import("@/lib/refuge/store");
        const result = await client!.from("posts").insert([
            { id: "first", slug: "same", title: "First" },
            { id: "second", slug: "same", title: "Second" },
        ]);
        expect(result.error).not.toBeNull();
        expect(store.listRefugeRows("posts")).toEqual([]);
        expect(store.readRefugeJournal()).toEqual([]);
    });

    it("data.eq.{}의 첫 조건부 갱신 1행 뒤 재시도 0행과 다른 언어 보존", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const ja = { id: "ja-row", lang: "ja", data: {} };
        store.replaceRefugeTableRows(store.getRefugeDatabase(), "resume_data", [
            { id: "en-row", lang: "en", data: {} },
            ja,
        ]);
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const update = () =>
            client!
                .from("resume_data")
                .update({ data: { name: "Copied" }, published: false })
                .eq("lang", "en")
                .eq("id", "en-row")
                .eq("data", "{}")
                .select("id");
        const first = await update();
        const second = await update();
        expect(first.error).toBeNull();
        expect(first.data).toEqual([{ id: "en-row" }]);
        expect(second.error).toBeNull();
        expect(second.data).toEqual([]);
        expect(
            store.listRefugeRows("resume_data").find((row) => row.lang === "ja")
        ).toEqual(ja);
        expect(store.readRefugeJournal()).toHaveLength(1);
    });

    it("data JSON 비교에서 키 순서만 다른 객체를 동일하게 처리", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        store.replaceRefugeTableRows(store.getRefugeDatabase(), "resume_data", [
            { id: "en-row", lang: "en", data: { b: 2, a: 1 } },
        ]);
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const result = await client!
            .from("resume_data")
            .update({ data: { changed: true } })
            .eq("lang", "en")
            .eq("data", '{"a":1,"b":2}')
            .select("id");
        expect(result.error).toBeNull();
        expect(result.data).toEqual([{ id: "en-row" }]);
    });

    it.each([null, [], ""])(
        "빈 객체 조건으로 다른 JSON 값 갱신 차단: %j",
        async (data) => {
            await seedRefuge([]);
            const store = await import("@/lib/refuge/store");
            const original = { id: "en-row", lang: "en", data };
            store.replaceRefugeTableRows(
                store.getRefugeDatabase(),
                "resume_data",
                [original]
            );
            const { unscopedServerClient: client } =
                await import("@/lib/supabase");
            const result = await client!
                .from("resume_data")
                .update({ data: { changed: true } })
                .eq("lang", "en")
                .eq("data", "{}")
                .select("id");
            expect(result.error).toBeNull();
            expect(result.data).toEqual([]);
            expect(store.listRefugeRows("resume_data")).toEqual([original]);
            expect(store.readRefugeJournal()).toEqual([]);
        }
    );

    it.each([
        ["about_data_i18n", { data: { description: "Original" } }],
        [
            "application_profiles_i18n",
            { public_token: "same-token", name: "Original" },
        ],
    ])(
        "%s의 언어별 추가 고유 키 검사와 다른 언어 허용",
        async (table, fields) => {
            await seedRefuge([]);
            const store = await import("@/lib/refuge/store");
            const original = { ...fields, id: "original", lang: "en" };
            store.replaceRefugeTableRows(store.getRefugeDatabase(), table, [
                original,
            ]);
            const { unscopedServerClient: client } =
                await import("@/lib/supabase");
            const collision = await client!
                .from(table)
                .insert({ ...fields, id: "other", lang: "en" });
            expect(collision.error).not.toBeNull();
            expect(store.listRefugeRows(table)).toEqual([original]);
            expect(store.readRefugeJournal()).toEqual([]);
            const differentLanguage = await client!
                .from(table)
                .insert({ ...fields, id: "original", lang: "ja" });
            expect(differentLanguage.error).toBeNull();
            expect(store.listRefugeRows(table)).toHaveLength(2);
            expect(store.readRefugeJournal()).toHaveLength(1);
        }
    );

    it("언어·ID 복합 키 upsert는 기존 행을 바꾸고 다른 언어 보존", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const en = { id: "same", lang: "en", slug: "old", title: "Old" };
        const ja = { ...en, lang: "ja", title: "日本語" };
        store.replaceRefugeTableRows(store.getRefugeDatabase(), "posts_i18n", [
            en,
            ja,
        ]);
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const result = await client!
            .from("posts_i18n")
            .upsert(
                { ...en, slug: "new", title: "New" },
                { onConflict: "lang,id" }
            );
        expect(result.error).toBeNull();
        const rows = store.listRefugeRows("posts_i18n");
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.lang === "en")).toMatchObject({
            slug: "new",
            title: "New",
        });
        expect(rows.find((row) => row.lang === "ja")).toEqual(ja);
    });

    it("내용 읽기 전 쓰기 잠금 확보와 종료 뒤 두 번째 연결의 잠금 획득", async () => {
        await seedRefuge([{ id: "post", slug: "post", title: "Old" }]);
        const store = await import("@/lib/refuge/store");
        const paths = await import("@/lib/refuge/paths");
        const database = store.getRefugeDatabase();
        const competitor = new DatabaseSync(paths.REFUGE_DB_PATH);
        competitor.exec("PRAGMA busy_timeout=0");
        const read = store.listRefugeRows;
        let transactionBeforeRead = false;
        let competingWriteBlocked = false;
        const spy = vi
            .spyOn(store, "listRefugeRows")
            .mockImplementation((table) => {
                transactionBeforeRead = database.isTransaction;
                try {
                    competitor.exec("BEGIN IMMEDIATE");
                } catch {
                    competingWriteBlocked = true;
                } finally {
                    if (competitor.isTransaction) competitor.exec("ROLLBACK");
                }
                return read(table);
            });
        try {
            const { unscopedServerClient: client } =
                await import("@/lib/supabase");
            const result = await client!
                .from("posts")
                .update({ title: "New" })
                .eq("id", "post");
            expect(result.error).toBeNull();
            expect(transactionBeforeRead).toBe(true);
            expect(competingWriteBlocked).toBe(true);
            expect(database.isTransaction).toBe(false);
            expect(() => competitor.exec("BEGIN IMMEDIATE")).not.toThrow();
        } finally {
            spy.mockRestore();
            if (competitor.isTransaction) competitor.exec("ROLLBACK");
            competitor.close();
        }
    });

    it("journal 저장 실패 뒤 DB·journal 복원과 쓰기 잠금 해제", async () => {
        const original = { id: "post", slug: "post", title: "Original" };
        await seedRefuge([original]);
        const store = await import("@/lib/refuge/store");
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const append = fs.appendFileSync;
        const spy = vi
            .spyOn(fs, "appendFileSync")
            .mockImplementationOnce((...args) => {
                append(...args);
                throw new Error("journal disk failure");
            });
        try {
            const failed = await client!
                .from("posts")
                .update({ title: "Must rollback" })
                .eq("id", "post");
            expect(failed.error?.message).toContain("journal disk failure");
            expect(store.listRefugeRows("posts")).toEqual([original]);
            expect(store.readRefugeJournal()).toEqual([]);
            expect(store.getRefugeDatabase().isTransaction).toBe(false);
        } finally {
            spy.mockRestore();
        }
        const retry = await client!
            .from("posts")
            .update({ title: "Retry" })
            .eq("id", "post");
        expect(retry.error).toBeNull();
        expect(store.readRefugeJournal()).toHaveLength(1);
    });

    it("기존 journal 뒤 일괄 append의 두 번째 실패도 이전 기록까지 정확히 보존", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const paths = await import("@/lib/refuge/paths");
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        await client!
            .from("posts")
            .insert({ id: "prior", slug: "prior", title: "Prior" });
        const beforeRows = store.listRefugeRows("posts");
        const beforeJournal = fs.readFileSync(
            paths.REFUGE_JOURNAL_PATH,
            "utf8"
        );
        const append = fs.appendFileSync;
        let attempts = 0;
        const spy = vi
            .spyOn(fs, "appendFileSync")
            .mockImplementation((...args) => {
                append(...args);
                if (++attempts === 2) throw new Error("second append failure");
            });
        try {
            const failed = await client!.from("posts").insert([
                { id: "first", slug: "first", title: "First" },
                { id: "second", slug: "second", title: "Second" },
            ]);
            expect(failed.error?.message).toContain("second append failure");
            expect(store.listRefugeRows("posts")).toEqual(beforeRows);
            expect(fs.readFileSync(paths.REFUGE_JOURNAL_PATH, "utf8")).toBe(
                beforeJournal
            );
            expect(store.readRefugeJournal()).toHaveLength(1);
            expect(store.getRefugeDatabase().isTransaction).toBe(false);
        } finally {
            spy.mockRestore();
        }
    });

    it("한국어 지원본의 public_token 중복도 기존 자료와 journal 보존", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const original = {
            id: "original",
            public_token: "same-token",
            name: "Original",
        };
        store.replaceRefugeTableRows(
            store.getRefugeDatabase(),
            "application_profiles",
            [original]
        );
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const result = await client!
            .from("application_profiles")
            .insert({ ...original, id: "other", name: "Other" });
        expect(result.error?.code).toBe("23505");
        expect(store.listRefugeRows("application_profiles")).toEqual([
            original,
        ]);
        expect(store.readRefugeJournal()).toEqual([]);
    });

    it.each(["single", "maybeSingle"] as const)(
        "%s의 복수 행 오류와 0행·1행 계약 유지",
        async (method) => {
            await seedRefuge([
                { id: "first", slug: "first", title: "First" },
                { id: "second", slug: "second", title: "Second" },
            ]);
            const { unscopedServerClient: client } =
                await import("@/lib/supabase");
            const multiple = await client!
                .from("posts")
                .select("id")
                .limit(2)
                [method]();
            expect(multiple.data).toBeNull();
            expect(multiple.error?.code).toBe("PGRST116");
            const one = await client!
                .from("posts")
                .select("id")
                .eq("id", "first")
                [method]();
            expect(one.error).toBeNull();
            expect(one.data).toEqual({ id: "first" });
            const empty = await client!
                .from("posts")
                .select("id")
                .eq("id", "missing")
                [method]();
            expect(empty.data).toBeNull();
            if (method === "single") expect(empty.error).not.toBeNull();
            else expect(empty.error).toBeNull();
        }
    );

    it("일괄 insert 뒤 single 응답 오류에서도 기존 DB와 journal 보존", async () => {
        await seedRefuge([{ id: "prior", slug: "prior", title: "Prior" }]);
        const store = await import("@/lib/refuge/store");
        const paths = await import("@/lib/refuge/paths");
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        await client!
            .from("posts")
            .update({ title: "Saved" })
            .eq("id", "prior");
        const beforeRows = store.listRefugeRows("posts");
        const beforeJournal = fs.readFileSync(
            paths.REFUGE_JOURNAL_PATH,
            "utf8"
        );
        const result = await client!
            .from("posts")
            .insert([
                { id: "first", slug: "first", title: "First" },
                { id: "second", slug: "second", title: "Second" },
            ])
            .select("id")
            .single();
        expect(result.data).toBeNull();
        expect(result.error?.code).toBe("PGRST116");
        expect(store.listRefugeRows("posts")).toEqual(beforeRows);
        expect(fs.readFileSync(paths.REFUGE_JOURNAL_PATH, "utf8")).toBe(
            beforeJournal
        );
        expect(store.readRefugeJournal()).toHaveLength(1);
        expect(store.getRefugeDatabase().isTransaction).toBe(false);
    });

    it("갱신으로 생기는 다른 행의 고유 키 충돌도 전체 자료와 journal 보존", async () => {
        await seedRefuge([]);
        const store = await import("@/lib/refuge/store");
        const rows = [
            { id: "source", lang: "en", slug: "source" },
            { id: "destination", lang: "en", slug: "occupied" },
            { id: "source", lang: "ja", slug: "source" },
        ];
        store.replaceRefugeTableRows(
            store.getRefugeDatabase(),
            "posts_i18n",
            rows
        );
        const before = store.listRefugeRows("posts_i18n");
        const { unscopedServerClient: client } = await import("@/lib/supabase");
        const result = await client!
            .from("posts_i18n")
            .update({ slug: "occupied" })
            .eq("id", "source")
            .eq("lang", "en");
        expect(result.error?.code).toBe("23505");
        expect(store.listRefugeRows("posts_i18n")).toEqual(before);
        expect(store.readRefugeJournal()).toEqual([]);
    });
});
