import type { Session } from "next-auth";
import { readRuntimeEnv } from "@/lib/runtime-env";

const getAdminEmail = () =>
    readRuntimeEnv("AUTH_ADMIN_EMAIL").trim().toLowerCase();

// 관리자 이메일 허용 여부 확인
export function isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const adminEmail = getAdminEmail();
    if (!adminEmail) return false;
    return adminEmail === email.trim().toLowerCase();
}

// 세션의 관리자 권한 여부 확인
export function isAdminSession(
    session: Pick<Session, "user"> | null | undefined
): boolean {
    return session?.user?.isAdmin === true;
}
