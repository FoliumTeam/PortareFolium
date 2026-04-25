import { afterEach, describe, expect, it } from "vitest";
import {
    clearAdminLoginFailures,
    getAdminLoginRateLimitKeys,
    getAdminLoginRateLimitState,
    recordAdminLoginFailure,
} from "@/lib/admin-login-rate-limit";

describe("admin login rate limit", () => {
    const key = "ip:127.0.0.1:admin@example.com";

    afterEach(() => {
        clearAdminLoginFailures(key);
        clearAdminLoginFailures("account:admin@example.com");
        clearAdminLoginFailures("ip:203.0.113.1:admin@example.com");
    });

    it("실패 횟수 초과 시 일시 차단", () => {
        const now = Date.now();
        for (let i = 0; i < 5; i += 1) {
            recordAdminLoginFailure(key, now + i);
        }

        const state = getAdminLoginRateLimitState(key, now + 5);
        expect(state.blocked).toBe(true);
        expect(state.retryAfterMs).toBeGreaterThan(0);
    });

    it("성공 시 실패 기록 정리", () => {
        recordAdminLoginFailure(key, Date.now());
        clearAdminLoginFailures(key);
        expect(getAdminLoginRateLimitState(key).blocked).toBe(false);
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
