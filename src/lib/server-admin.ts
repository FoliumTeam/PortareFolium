import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import {
    createLocalSqliteRefugeAdminSession,
    isLocalSqliteRefugeAdminBypassAllowed,
} from "@/lib/local-sqlite-refuge-admin";

async function getRequestHost(): Promise<string | null> {
    const { headers } = await import("next/headers");
    return (await headers()).get("host");
}

// Auth.js session과 local-only SQLite refuge admin bypass를 합친 server-side 권한 source.
export async function getEffectiveAdminSession() {
    if (
        isLocalSqliteRefugeAdminBypassAllowed({
            host: await getRequestHost(),
        })
    ) {
        return createLocalSqliteRefugeAdminSession();
    }

    return auth();
}

// server action / route 관리자 인증 확인
export async function requireAdminSession() {
    const session = await getEffectiveAdminSession();
    if (!isAdminSession(session)) {
        throw new Error("관리자 인증 필요");
    }
    return session;
}
