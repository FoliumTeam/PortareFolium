import type { Session } from "next-auth";
import {
    ensureRefugeModeLocalSecret,
    isSqliteRefugeMode,
    isSqliteRefugeRuntimeAllowed,
} from "@/lib/refuge/mode";

const LOCAL_REFUGE_ADMIN_BYPASS_VALUE = "local-dev-only";

type EnvLike = Partial<Record<string, string | undefined>>;

type BypassInput = {
    host?: string | null;
    sqliteRefugeMode?: boolean;
    env?: EnvLike;
};

// Vercel 배포 환경에서는 preview라도 refuge admin bypass를 절대 허용하지 않는다.
export function isLocalSqliteRefugeRuntimeAllowed(
    env: EnvLike = process.env
): boolean {
    return (
        env.SQLITE_REFUGE_ADMIN_BYPASS === LOCAL_REFUGE_ADMIN_BYPASS_VALUE &&
        isSqliteRefugeRuntimeAllowed(env)
    );
}

function normalizeHost(host: string): string {
    const trimmed = host.trim().toLowerCase();
    if (trimmed.startsWith("[::1]")) return "::1";
    if (trimmed === "::1") return "::1";
    return trimmed.split(":")[0] ?? "";
}

// localhost 요청인지 확인해 tunnel/preview URL에서 자동 admin이 열리지 않게 한다.
export function isLocalhostRequestHost(host?: string | null): boolean {
    if (!host) return false;
    const normalized = normalizeHost(host);
    return (
        normalized === "localhost" ||
        normalized === "127.0.0.1" ||
        normalized === "::1"
    );
}

// SQLite refuge admin bypass는 local dev + explicit opt-in + localhost + active refuge에서만 허용한다.
export function isLocalSqliteRefugeAdminBypassAllowed({
    host,
    sqliteRefugeMode = isSqliteRefugeMode(),
    env = process.env,
}: BypassInput): boolean {
    return (
        isLocalSqliteRefugeRuntimeAllowed(env) &&
        isLocalhostRequestHost(host) &&
        sqliteRefugeMode
    );
}

// Auth.js MissingSecret 방지용 local-only fallback. admin bypass 자체는 host gate를 별도로 통과해야 한다.
export function getLocalSqliteRefugeAuthSecret(
    env: EnvLike = process.env
): string {
    if (!isLocalSqliteRefugeRuntimeAllowed(env)) return "";
    if (!isSqliteRefugeMode()) return "";
    return ensureRefugeModeLocalSecret();
}

export function createLocalSqliteRefugeAdminSession(): Session {
    return {
        user: {
            id: "sqlite-refuge-admin",
            email: "sqlite-refuge-admin@localhost",
            name: "SQLite Refuge Admin",
            isAdmin: true,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
}
