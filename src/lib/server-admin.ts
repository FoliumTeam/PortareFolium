import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";

// server action / route 관리자 인증 확인
export async function requireAdminSession() {
    const session = await auth();
    if (!isAdminSession(session)) {
        throw new Error("관리자 인증 필요");
    }
    return session;
}
