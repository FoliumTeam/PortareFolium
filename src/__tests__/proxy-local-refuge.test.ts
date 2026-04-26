import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string): NextRequest {
    return new NextRequest(`http://127.0.0.1:3100${path}`, {
        headers: { host: "127.0.0.1:3100" },
    });
}

describe("proxy local sqlite refuge bypass", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("allows explicit local next start refuge bypass", () => {
        vi.stubEnv("SQLITE_REFUGE_ADMIN_BYPASS", "local-dev-only");
        vi.stubEnv("SQLITE_REFUGE_ALLOW_LOCAL_START", "local-dev-only");
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("VERCEL", "");
        vi.stubEnv("VERCEL_ENV", "");

        const response = proxy(request("/admin"));

        expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("keeps production local start bypass closed without explicit opt-in", () => {
        vi.stubEnv("SQLITE_REFUGE_ADMIN_BYPASS", "local-dev-only");
        vi.stubEnv("SQLITE_REFUGE_ALLOW_LOCAL_START", "");
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("VERCEL", "");
        vi.stubEnv("VERCEL_ENV", "");

        const response = proxy(request("/admin"));

        expect(response.headers.get("location")).toContain("/admin/login");
    });
});
