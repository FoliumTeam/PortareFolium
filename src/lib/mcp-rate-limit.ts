// MCP invalid token IP-based throttle (in-memory)

type Entry = {
    count: number;
    firstAt: number;
    blockedUntil: number;
};

const WINDOW_MS = 5 * 60 * 1000;
const MAX_INVALID = 30;
const BLOCK_MS = 5 * 60 * 1000;

const store = new Map<string, Entry>();

function pruneExpired(now: number) {
    for (const [ip, entry] of store.entries()) {
        const expiredWindow = now - entry.firstAt > WINDOW_MS;
        const expiredBlock =
            entry.blockedUntil !== 0 && entry.blockedUntil <= now;
        if (expiredWindow && (entry.blockedUntil === 0 || expiredBlock)) {
            store.delete(ip);
        }
    }
}

export type McpRateLimitState = {
    blocked: boolean;
    retryAfterMs: number;
};

export function getMcpRateLimitState(
    ip: string,
    now = Date.now()
): McpRateLimitState {
    pruneExpired(now);
    const entry = store.get(ip);
    if (!entry) return { blocked: false, retryAfterMs: 0 };
    if (entry.blockedUntil > now) {
        return {
            blocked: true,
            retryAfterMs: entry.blockedUntil - now,
        };
    }
    return { blocked: false, retryAfterMs: 0 };
}

export function recordMcpInvalidAttempt(ip: string, now = Date.now()): void {
    pruneExpired(now);
    const entry = store.get(ip);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
        store.set(ip, { count: 1, firstAt: now, blockedUntil: 0 });
        return;
    }
    const nextCount = entry.count + 1;
    store.set(ip, {
        count: nextCount,
        firstAt: entry.firstAt,
        blockedUntil: nextCount >= MAX_INVALID ? now + BLOCK_MS : 0,
    });
}

// 테스트 목적 store 초기화
export function __resetMcpRateLimit(): void {
    store.clear();
}
