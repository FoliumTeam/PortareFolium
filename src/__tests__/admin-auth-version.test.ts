import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminAuthVersion } from "@/lib/admin-auth-version";

describe("admin auth version", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("관리자 이메일 또는 password hash 변경 시 fingerprint 변경", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@example.com");
        vi.stubEnv("AUTH_ADMIN_PASSWORD_HASH", "scrypt$abc$123");
        const first = getAdminAuthVersion();

        vi.stubEnv("AUTH_ADMIN_PASSWORD_HASH", "scrypt$def$456");
        const second = getAdminAuthVersion();

        expect(first).not.toBe(second);
    });
});
