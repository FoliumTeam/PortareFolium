import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
let tempDir = "";

async function activateRefugeMode() {
    const paths = await import("@/lib/refuge/paths");
    fs.mkdirSync(path.dirname(paths.REFUGE_MODE_PATH), { recursive: true });
    fs.writeFileSync(
        paths.REFUGE_MODE_PATH,
        JSON.stringify(
            {
                mode: "sqlite-refuge",
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

describe("admin mutation origin guard", () => {
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portare-origin-"));
        process.chdir(tempDir);
        vi.resetModules();
        vi.stubEnv("SQLITE_REFUGE_ADMIN_BYPASS", "local-dev-only");
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("VERCEL", "");
        vi.stubEnv("VERCEL_ENV", "");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        process.chdir(originalCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
        vi.resetModules();
    });

    it("blocks cross-site POST while local refuge bypass is active", async () => {
        await activateRefugeMode();
        const { assertSafeAdminMutationRequest } =
            await import("@/lib/admin-mutation-origin");
        const headers = new Headers({
            host: "localhost:3000",
            origin: "https://evil.example",
            "sec-fetch-site": "cross-site",
        });

        expect(() => assertSafeAdminMutationRequest({ headers })).toThrow(
            /cross-site|cross-origin/
        );
    });

    it("allows same-origin localhost mutation while local refuge bypass is active", async () => {
        await activateRefugeMode();
        const { assertSafeAdminMutationRequest } =
            await import("@/lib/admin-mutation-origin");
        const headers = new Headers({
            host: "localhost:3000",
            origin: "http://localhost:3000",
            "sec-fetch-site": "same-origin",
        });

        expect(() => assertSafeAdminMutationRequest({ headers })).not.toThrow();
    });
});
