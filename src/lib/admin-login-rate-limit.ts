import { createHash } from "node:crypto";
import { serverClient } from "@/lib/supabase";

type LoginAttemptState = {
    count: number;
    firstAttemptAt: number;
    blockedUntil: number;
};

export type LoginRateLimitState = {
    blocked: boolean;
    retryAfterMs: number;
    reason?: "rate-limit" | "store-unavailable";
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const BLOCK_MS = 10 * 60 * 1000;

type DbLoginAttemptRow = {
    count: number;
    first_attempt_at: string;
    blocked_until: string | null;
};

// 로그인 제한 key 생성
export function getAdminLoginRateLimitKeys(
    ip: string,
    email: string
): string[] {
    const normalizedEmail = email.trim().toLowerCase();
    return [`account:${normalizedEmail}`, `ip:${ip}:${normalizedEmail}`];
}

function hashRateLimitKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
}

// store unavailable sentinel
function storeUnavailableState(): LoginRateLimitState {
    return {
        blocked: true,
        retryAfterMs: 0,
        reason: "store-unavailable",
    };
}

async function getDbLoginAttempt(
    key: string
): Promise<LoginAttemptState | null | undefined> {
    if (!serverClient) return undefined;

    const { data, error } = await serverClient
        .from("admin_login_attempts")
        .select("count, first_attempt_at, blocked_until")
        .eq("key_hash", hashRateLimitKey(key))
        .maybeSingle();

    if (error) return undefined;
    if (!data) return null;

    const row = data as DbLoginAttemptRow;
    return {
        count: row.count,
        firstAttemptAt: new Date(row.first_attempt_at).getTime(),
        blockedUntil: row.blocked_until
            ? new Date(row.blocked_until).getTime()
            : 0,
    };
}

async function saveDbLoginAttempt(
    key: string,
    state: LoginAttemptState
): Promise<boolean> {
    if (!serverClient) return false;

    const { error } = await serverClient.from("admin_login_attempts").upsert({
        key_hash: hashRateLimitKey(key),
        count: state.count,
        first_attempt_at: new Date(state.firstAttemptAt).toISOString(),
        blocked_until:
            state.blockedUntil === 0
                ? null
                : new Date(state.blockedUntil).toISOString(),
    });

    return !error;
}

async function deleteDbLoginAttempt(key: string): Promise<boolean> {
    if (!serverClient) return false;

    const { error } = await serverClient
        .from("admin_login_attempts")
        .delete()
        .eq("key_hash", hashRateLimitKey(key));

    return !error;
}

// 로그인 시도 제한 상태 확인 — DB 없으면 fail-closed
export async function getAdminLoginRateLimitState(
    key: string,
    now = Date.now()
): Promise<LoginRateLimitState> {
    const dbState = await getDbLoginAttempt(key);
    if (dbState === undefined) {
        return storeUnavailableState();
    }

    if (!dbState) {
        return { blocked: false, retryAfterMs: 0 };
    }

    if (dbState.blockedUntil > now) {
        return {
            blocked: true,
            retryAfterMs: dbState.blockedUntil - now,
            reason: "rate-limit",
        };
    }

    if (now - dbState.firstAttemptAt > WINDOW_MS) {
        await deleteDbLoginAttempt(key);
    }

    return { blocked: false, retryAfterMs: 0 };
}

function getNextFailureState(
    current: LoginAttemptState | null,
    now: number
): LoginAttemptState {
    if (!current || now - current.firstAttemptAt > WINDOW_MS) {
        return {
            count: 1,
            firstAttemptAt: now,
            blockedUntil: 0,
        };
    }

    const nextCount = current.count + 1;
    return {
        count: nextCount,
        firstAttemptAt: current.firstAttemptAt,
        blockedUntil: nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : 0,
    };
}

// 로그인 실패 기록 — DB 없으면 noop (fail-closed가 이미 차단)
export async function recordAdminLoginFailure(
    key: string,
    now = Date.now()
): Promise<void> {
    const dbState = await getDbLoginAttempt(key);
    if (dbState === undefined) return;
    await saveDbLoginAttempt(key, getNextFailureState(dbState, now));
}

// 로그인 성공 시 실패 기록 정리
export async function clearAdminLoginFailures(key: string): Promise<void> {
    await deleteDbLoginAttempt(key);
}
