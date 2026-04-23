import { scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";

type AdminCredentialSetup = {
    adminEmail: string;
    passwordHash: string;
    nextAuthSecret: string;
    missingEnvKeys: string[];
};

// admin auth env 상태 수집
export function getAdminCredentialSetup(): AdminCredentialSetup {
    const adminEmail = (process.env.AUTH_ADMIN_EMAIL ?? "").trim();
    const passwordHash = (process.env.AUTH_ADMIN_PASSWORD_HASH ?? "").trim();
    const nextAuthSecret = (process.env.NEXTAUTH_SECRET ?? "").trim();

    const missingEnvKeys = [
        !adminEmail ? "AUTH_ADMIN_EMAIL" : null,
        !passwordHash ? "AUTH_ADMIN_PASSWORD_HASH" : null,
        !nextAuthSecret ? "NEXTAUTH_SECRET" : null,
    ].filter((value): value is string => value !== null);

    return {
        adminEmail,
        passwordHash,
        nextAuthSecret,
        missingEnvKeys,
    };
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
    const { adminEmail, passwordHash, missingEnvKeys } =
        getAdminCredentialSetup();
    if (missingEnvKeys.length > 0) return false;

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
        return false;
    }

    const parsed = parseScryptHash(passwordHash);
    if (!parsed) return false;

    const derived = scryptSync(password, parsed.saltHex, parsed.hash.length);
    return timingSafeEqual(derived, parsed.hash);
}
