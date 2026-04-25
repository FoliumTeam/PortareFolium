import { scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";

type AdminCredentialSetup = {
    missingEnvKeys: string[];
};

// AUTH_SECRET 우선, NEXTAUTH_SECRET fallback
export function getAuthSecret(): string {
    return (
        (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "") as string
    ).trim();
}

function getAdminCredentialEnv() {
    const adminEmail = (process.env.AUTH_ADMIN_EMAIL ?? "").trim();
    const passwordHash = (process.env.AUTH_ADMIN_PASSWORD_HASH ?? "").trim();
    const authSecret = getAuthSecret();

    return { adminEmail, passwordHash, authSecret };
}

// admin auth env 상태 수집
export function getAdminCredentialSetup(): AdminCredentialSetup {
    const { adminEmail, passwordHash, authSecret } = getAdminCredentialEnv();
    const missingEnvKeys = [
        !adminEmail ? "AUTH_ADMIN_EMAIL" : null,
        !passwordHash ? "AUTH_ADMIN_PASSWORD_HASH" : null,
        !authSecret ? "AUTH_SECRET" : null,
    ].filter((value): value is string => value !== null);

    return { missingEnvKeys };
}

// admin auth env 준비 여부 판별
export function isAdminCredentialSetupComplete(): boolean {
    return getAdminCredentialSetup().missingEnvKeys.length === 0;
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
