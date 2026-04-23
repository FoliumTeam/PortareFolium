import { describe, expect, it, vi, afterEach } from "vitest";
import {
    getAdminCredentialSetup,
    verifyAdminCredentials,
} from "@/lib/admin-credentials";
import { randomBytes, scryptSync } from "node:crypto";

function createPasswordHash(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

describe("admin credentials helpers", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("누락된 env key 목록 반환", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "");
        vi.stubEnv("AUTH_ADMIN_PASSWORD_HASH", "");
        vi.stubEnv("NEXTAUTH_SECRET", "");

        expect(getAdminCredentialSetup().missingEnvKeys).toEqual([
            "AUTH_ADMIN_EMAIL",
            "AUTH_ADMIN_PASSWORD_HASH",
            "NEXTAUTH_SECRET",
        ]);
    });

    it("email과 password hash가 일치할 때만 검증 통과", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@example.com");
        vi.stubEnv("NEXTAUTH_SECRET", "secret");
        vi.stubEnv(
            "AUTH_ADMIN_PASSWORD_HASH",
            createPasswordHash("correct-password")
        );

        expect(
            verifyAdminCredentials("admin@example.com", "correct-password")
        ).toBe(true);
        expect(
            verifyAdminCredentials("admin@example.com", "wrong-password")
        ).toBe(false);
        expect(
            verifyAdminCredentials("user@example.com", "correct-password")
        ).toBe(false);
    });
});
