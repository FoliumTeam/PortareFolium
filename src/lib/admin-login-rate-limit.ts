type LoginAttemptState = {
    count: number;
    firstAttemptAt: number;
    blockedUntil: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const attemptStore = new Map<string, LoginAttemptState>();

// 로그인 제한 key 생성
export function getAdminLoginRateLimitKeys(
    ip: string,
    email: string
): string[] {
    const normalizedEmail = email.trim().toLowerCase();
    return [`account:${normalizedEmail}`, `ip:${ip}:${normalizedEmail}`];
}

function pruneExpiredState(now: number) {
    for (const [key, value] of attemptStore.entries()) {
        const expiredWindow = now - value.firstAttemptAt > WINDOW_MS;
        const expiredBlock =
            value.blockedUntil !== 0 && value.blockedUntil <= now;
        if (expiredWindow && (value.blockedUntil === 0 || expiredBlock)) {
            attemptStore.delete(key);
        }
    }
}

// 로그인 시도 제한 상태 확인
export function getAdminLoginRateLimitState(key: string, now = Date.now()) {
    pruneExpiredState(now);
    const state = attemptStore.get(key);
    if (!state) {
        return { blocked: false, retryAfterMs: 0 };
    }

    if (state.blockedUntil > now) {
        return {
            blocked: true,
            retryAfterMs: state.blockedUntil - now,
        };
    }

    if (now - state.firstAttemptAt > WINDOW_MS) {
        attemptStore.delete(key);
        return { blocked: false, retryAfterMs: 0 };
    }

    return { blocked: false, retryAfterMs: 0 };
}

// 로그인 실패 기록
export function recordAdminLoginFailure(key: string, now = Date.now()) {
    pruneExpiredState(now);
    const current = attemptStore.get(key);

    if (!current || now - current.firstAttemptAt > WINDOW_MS) {
        attemptStore.set(key, {
            count: 1,
            firstAttemptAt: now,
            blockedUntil: 0,
        });
        return;
    }

    const nextCount = current.count + 1;
    attemptStore.set(key, {
        count: nextCount,
        firstAttemptAt: current.firstAttemptAt,
        blockedUntil: nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : 0,
    });
}

// 로그인 성공 시 실패 기록 정리
export function clearAdminLoginFailures(key: string) {
    attemptStore.delete(key);
}
