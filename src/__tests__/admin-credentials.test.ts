import { describe, expect, it, vi, afterEach } from "vitest";
import {
    getAdminCredentialSetup,
    getAuthSecret,
    verifyAdminCredentials,
} from "@/lib/admin-credentials";
import { randomBytes, scryptSync } from "node:crypto";

function createPasswordHash(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

const validAuthSecret = "a".repeat(64);

describe("admin credentials helpers", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("누락된 env key 목록 반환", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "");
        vi.stubEnv("AUTH_ADMIN_PASSWORD_HASH", "");
        vi.stubEnv("AUTH_SECRET", "");

        expect(getAdminCredentialSetup().missingEnvKeys).toEqual([
            "AUTH_ADMIN_EMAIL",
            "AUTH_ADMIN_PASSWORD_HASH",
            "AUTH_SECRET",
        ]);
        expect(getAdminCredentialSetup().invalidEnvKeys).toEqual([]);
    });

    it("SQLite refuge local secret fallback 없이 AUTH_SECRET만 사용", () => {
        vi.stubEnv("AUTH_SECRET", "");
        vi.stubEnv("SQLITE_REFUGE_ALLOW_LOCAL_START", "local-dev-only");

        expect(getAuthSecret()).toBe("");
        expect(getAdminCredentialSetup().missingEnvKeys).toContain(
            "AUTH_SECRET"
        );
    });

    it("placeholder와 잘못된 형식의 env를 invalid로 반환", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@example.com");
        vi.stubEnv("AUTH_ADMIN_PASSWORD_HASH", "plain-password");
        vi.stubEnv("AUTH_SECRET", "secret");

        expect(getAdminCredentialSetup().missingEnvKeys).toEqual([]);
        expect(getAdminCredentialSetup().invalidEnvKeys).toEqual([
            {
                key: "AUTH_ADMIN_EMAIL",
                reason: "예시 email 값입니다. 실제 관리자 email로 바꾸세요.",
            },
            {
                key: "AUTH_ADMIN_PASSWORD_HASH",
                reason: "scrypt$<saltHex>$<hashHex> 형식이 아닙니다.",
            },
            {
                key: "AUTH_SECRET",
                reason: "예시 secret 값입니다. 랜덤 secret으로 바꾸세요.",
            },
        ]);
    });

    it("email과 password hash가 일치할 때만 검증 통과", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@portfolio.test");
        vi.stubEnv("AUTH_SECRET", validAuthSecret);
        vi.stubEnv(
            "AUTH_ADMIN_PASSWORD_HASH",
            createPasswordHash("correct-password")
        );

        expect(
            verifyAdminCredentials("admin@portfolio.test", "correct-password")
        ).toBe(true);
        expect(
            verifyAdminCredentials("admin@portfolio.test", "wrong-password")
        ).toBe(false);
        expect(
            verifyAdminCredentials("user@example.com", "correct-password")
        ).toBe(false);
    });
});
