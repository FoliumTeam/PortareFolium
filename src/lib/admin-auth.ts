import type { Session } from "next-auth";

const getAdminEmails = () =>
    (process.env.AUTH_ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

// 관리자 이메일 허용 여부 확인
export function isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) return false;
    return adminEmails.includes(email.trim().toLowerCase());
}

// 세션의 관리자 권한 여부 확인
export function isAdminSession(
    session: Pick<Session, "user"> | null | undefined
): boolean {
    return session?.user?.isAdmin === true;
}
