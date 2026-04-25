import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ serverClient: null }));

import {
    clearAdminLoginFailures,
    getAdminLoginRateLimitKeys,
    getAdminLoginRateLimitState,
    recordAdminLoginFailure,
} from "@/lib/admin-login-rate-limit";

describe("admin login rate limit", () => {
    const key = "ip:127.0.0.1:admin@example.com";

    afterEach(async () => {
        await clearAdminLoginFailures(key);
        await clearAdminLoginFailures("account:admin@example.com");
        await clearAdminLoginFailures("ip:203.0.113.1:admin@example.com");
    });

    it("실패 횟수 초과 시 일시 차단", async () => {
        const now = Date.now();
        for (let i = 0; i < 5; i += 1) {
            await recordAdminLoginFailure(key, now + i);
        }

        const state = await getAdminLoginRateLimitState(key, now + 5);
        expect(state.blocked).toBe(true);
        expect(state.retryAfterMs).toBeGreaterThan(0);
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
