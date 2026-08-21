import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@/lib/migrations";

const repoRoot = process.cwd();
const migrationDir = join(repoRoot, "supabase", "migrations");

describe("migration integrity", () => {
    it("records its own version in every migration SQL body", () => {
        const migrationFiles = readdirSync(migrationDir)
            .filter((fileName) => fileName.endsWith(".sql"))
            .sort();

        for (const fileName of migrationFiles) {
            const match = fileName.match(/^\d{3}_v(\d+(?:_\d+)*)_/u);
            expect(match, fileName).not.toBeNull();

            const version = match?.[1].replaceAll("_", ".");
            const sql = readFileSync(join(migrationDir, fileName), "utf8");
            expect(sql, fileName).toContain(
                `VALUES ('db_schema_version', '"${version}"')`
            );
        }
    });

    it("keeps initialization and whole-sync SQL at the app schema version", () => {
        const setupSql = readFileSync(
            join(repoRoot, "supabase", "setup.sql"),
            "utf8"
        );
        const wholeMigrationSql = readFileSync(
            join(repoRoot, "supabase", "migration-whole.sql"),
            "utf8"
        );

        expect(setupSql).toContain(`'db_schema_version',  '"${APP_VERSION}"'`);
        expect(wholeMigrationSql).toContain(
            `VALUES ('db_schema_version', '"${APP_VERSION}"')`
        );
        for (const structure of [
            "category_colors",
            "idx_posts_tags_gin",
            "post_tags",
            "post_categories",
            "post_content_revisions",
            "post_content_chunks",
        ]) {
            expect(wholeMigrationSql).toContain(structure);
        }
    });
});
