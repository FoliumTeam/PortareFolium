import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
    key_hash: string;
    count: number;
    first_attempt_at: string;
    blocked_until: string | null;
};

const store = new Map<string, Row>();

// Supabase mock — admin_login_attempts 테이블 흉내
function createTableQuery() {
    return {
        select() {
            return {
                eq(_col: string, value: string) {
                    return {
                        async maybeSingle() {
                            const row = store.get(value);
                            return { data: row ?? null, error: null };
                        },
                    };
                },
            };
        },
        async upsert(payload: Row) {
            store.set(payload.key_hash, payload);
            return { error: null };
        },
        delete() {
            return {
                async eq(_col: string, value: string) {
                    store.delete(value);
                    return { error: null };
                },
            };
        },
    };
}

vi.mock("@/lib/supabase", () => ({
    serverClient: {
        from() {
            return createTableQuery();
        },
    },
}));

import {
    clearAdminLoginFailures,
    getAdminLoginRateLimitKeys,
    getAdminLoginRateLimitState,
    recordAdminLoginFailure,
} from "@/lib/admin-login-rate-limit";

describe("admin login rate limit", () => {
    const key = "ip:127.0.0.1:admin@example.com";

    beforeEach(() => {
        store.clear();
    });

    afterEach(async () => {
        await clearAdminLoginFailures(key);
        await clearAdminLoginFailures("account:admin@example.com");
        await clearAdminLoginFailures("ip:203.0.113.1:admin@example.com");
    });

    it("실패 횟수 초과 시 일시 차단", async () => {
        const now = Date.now();
        for (let i = 0; i < 9; i += 1) {
            await recordAdminLoginFailure(key, now + i);
        }

        expect((await getAdminLoginRateLimitState(key, now + 9)).blocked).toBe(
            false
        );

        await recordAdminLoginFailure(key, now + 10);

        const state = await getAdminLoginRateLimitState(key, now + 11);
        expect(state.blocked).toBe(true);
        expect(state.reason).toBe("rate-limit");
        expect(state.retryAfterMs).toBeLessThanOrEqual(10 * 60 * 1000);
        expect(state.retryAfterMs).toBeGreaterThan(9 * 60 * 1000);
    });

    it("성공 시 실패 기록 정리", async () => {
        await recordAdminLoginFailure(key, Date.now());
        await clearAdminLoginFailures(key);
        expect((await getAdminLoginRateLimitState(key)).blocked).toBe(false);
    });

    it("IP 변경과 무관한 account key 포함", () => {
        expect(
            getAdminLoginRateLimitKeys("203.0.113.1", " Admin@Example.com ")
        ).toEqual([
            "account:admin@example.com",
            "ip:203.0.113.1:admin@example.com",
        ]);
    });
});

describe("admin login rate limit — store unavailable", () => {
    it("serverClient 없거나 DB 에러 시 fail-closed", async () => {
        vi.resetModules();
        vi.doMock("@/lib/supabase", () => ({ serverClient: null }));
        const mod = await import("@/lib/admin-login-rate-limit");
        const state = await mod.getAdminLoginRateLimitState("ip:1.2.3.4:x");
        expect(state.blocked).toBe(true);
        expect(state.reason).toBe("store-unavailable");
        vi.doUnmock("@/lib/supabase");
        vi.resetModules();
    });
});
