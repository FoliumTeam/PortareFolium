import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
});
