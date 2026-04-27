import { createHash } from "node:crypto";
import { readRuntimeEnv, readRuntimePasswordHashEnv } from "@/lib/runtime-env";

// 관리자 auth 설정 버전 fingerprint 계산
export function getAdminAuthVersion(): string {
    const adminEmail = readRuntimeEnv("AUTH_ADMIN_EMAIL").trim().toLowerCase();
    const passwordHash = readRuntimePasswordHashEnv().trim();
    return createHash("sha256")
        .update(`${adminEmail}:${passwordHash}`)
        .digest("hex");
}
