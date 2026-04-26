import { createHash } from "node:crypto";

// 관리자 auth 설정 버전 fingerprint 계산
export function getAdminAuthVersion(): string {
    const adminEmail = (process.env.AUTH_ADMIN_EMAIL ?? "")
        .trim()
        .toLowerCase();
    const passwordHash = (process.env.AUTH_ADMIN_PASSWORD_HASH ?? "").trim();
    return createHash("sha256")
        .update(`${adminEmail}:${passwordHash}`)
        .digest("hex");
}
