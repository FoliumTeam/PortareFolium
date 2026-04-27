import { scryptSync, timingSafeEqual } from "node:crypto";
import { readRuntimeEnv, readRuntimePasswordHashEnv } from "@/lib/runtime-env";

const PASSWORD_HASH_PREFIX = "scrypt";

type AdminCredentialEnvKey =
    | "AUTH_ADMIN_EMAIL"
    | "AUTH_ADMIN_PASSWORD_HASH"
    | "AUTH_SECRET";

type AdminCredentialIssue = {
    key: AdminCredentialEnvKey;
    reason: string;
};

type AdminCredentialSetup = {
    missingEnvKeys: AdminCredentialEnvKey[];
    invalidEnvKeys: AdminCredentialIssue[];
};

const MIN_AUTH_SECRET_LENGTH = 32;
const MIN_SCRYPT_SALT_HEX_LENGTH = 32;
const MIN_SCRYPT_HASH_HEX_LENGTH = 128;
const PLACEHOLDER_VALUES = new Set([
    "your-auth-secret",
    "your_salt_hex",
    "your_hash_hex",
    "change-me",
    "changeme",
    "secret",
    "local-dev",
]);

// Auth.js session secret은 AUTH_SECRET만 사용한다.
export function getAuthSecret(): string {
    return readRuntimeEnv("AUTH_SECRET").trim();
}

function getAdminCredentialEnv() {
    const adminEmail = readRuntimeEnv("AUTH_ADMIN_EMAIL").trim();
    const passwordHash = readRuntimePasswordHashEnv().trim();
    const authSecret = getAuthSecret();

    return { adminEmail, passwordHash, authSecret };
}

function isPlaceholder(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
        PLACEHOLDER_VALUES.has(normalized) ||
        normalized.includes("your_") ||
        normalized.includes("your-")
    );
}

function validateAdminEmail(value: string): string | null {
    if (isPlaceholder(value) || value.toLowerCase() === "admin@example.com") {
        return "예시 email 값입니다. 실제 관리자 email로 바꾸세요.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "email 형식이 아닙니다.";
    }
    return null;
}

function validateAuthSecret(value: string): string | null {
    if (isPlaceholder(value)) {
        return "예시 secret 값입니다. 랜덤 secret으로 바꾸세요.";
    }
    if (/\s/.test(value)) {
        return "공백 없는 랜덤 문자열이어야 합니다.";
    }
    if (value.length < MIN_AUTH_SECRET_LENGTH) {
        return `최소 ${MIN_AUTH_SECRET_LENGTH}자 이상의 랜덤 문자열이어야 합니다.`;
    }
    return null;
}

function validatePasswordHash(value: string): string | null {
    if (isPlaceholder(value)) {
        return "예시 password hash 값입니다. 실제 비밀번호로 scrypt hash를 생성하세요.";
    }
    const parsed = parseScryptHash(value);
    if (!parsed) {
        return "scrypt$<saltHex>$<hashHex> 형식이 아닙니다.";
    }
    if (parsed.saltHex.length < MIN_SCRYPT_SALT_HEX_LENGTH) {
        return `salt는 최소 ${MIN_SCRYPT_SALT_HEX_LENGTH}자 hex여야 합니다.`;
    }
    if (parsed.hash.length * 2 < MIN_SCRYPT_HASH_HEX_LENGTH) {
        return `hash는 최소 ${MIN_SCRYPT_HASH_HEX_LENGTH}자 hex여야 합니다.`;
    }
    return null;
}

// admin auth env 상태 수집
export function getAdminCredentialSetup(): AdminCredentialSetup {
    const { adminEmail, passwordHash, authSecret } = getAdminCredentialEnv();
    const missingEnvKeys = [
        !adminEmail ? "AUTH_ADMIN_EMAIL" : null,
        !passwordHash ? "AUTH_ADMIN_PASSWORD_HASH" : null,
        !authSecret ? "AUTH_SECRET" : null,
    ].filter((value): value is AdminCredentialEnvKey => value !== null);

    const invalidEnvKeys: AdminCredentialIssue[] = [
        adminEmail
            ? {
                  key: "AUTH_ADMIN_EMAIL",
                  reason: validateAdminEmail(adminEmail),
              }
            : null,
        passwordHash
            ? {
                  key: "AUTH_ADMIN_PASSWORD_HASH",
                  reason: validatePasswordHash(passwordHash),
              }
            : null,
        authSecret
            ? { key: "AUTH_SECRET", reason: validateAuthSecret(authSecret) }
            : null,
    ].filter(
        (value): value is AdminCredentialIssue =>
            value !== null && value.reason !== null
    );

    return { missingEnvKeys, invalidEnvKeys };
}

// admin auth env 준비 여부 판별
export function isAdminCredentialSetupComplete(): boolean {
    const setup = getAdminCredentialSetup();
    return (
        setup.missingEnvKeys.length === 0 && setup.invalidEnvKeys.length === 0
    );
}

function parseScryptHash(
    value: string
): { saltHex: string; hash: Buffer } | null {
    const [prefix, saltHex, hashHex] = value.split("$");
    if (
        prefix !== PASSWORD_HASH_PREFIX ||
        !saltHex ||
        !hashHex ||
        !/^[0-9a-f]+$/i.test(saltHex) ||
        !/^[0-9a-f]+$/i.test(hashHex)
    ) {
        return null;
    }

    return {
        saltHex,
        hash: Buffer.from(hashHex, "hex"),
    };
}

// admin email/password 검증
export function verifyAdminCredentials(
    email: string,
    password: string
): boolean {
    const { adminEmail, passwordHash } = getAdminCredentialEnv();
    const { missingEnvKeys } = getAdminCredentialSetup();
    if (missingEnvKeys.length > 0) return false;

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
        return false;
    }

    const parsed = parseScryptHash(passwordHash);
    if (!parsed) return false;

    const derived = scryptSync(password, parsed.saltHex, parsed.hash.length);
    return timingSafeEqual(derived, parsed.hash);
}
