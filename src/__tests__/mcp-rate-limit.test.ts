import { afterEach, describe, expect, it } from "vitest";
import {
    __resetMcpRateLimit,
    getMcpRateLimitState,
    recordMcpInvalidAttempt,
} from "@/lib/mcp-rate-limit";

describe("mcp invalid token throttle", () => {
    afterEach(() => {
        __resetMcpRateLimit();
    });

    it("초기 상태는 차단 없음", () => {
        expect(getMcpRateLimitState("1.2.3.4").blocked).toBe(false);
    });

    it("MAX_INVALID 회 초과 시 차단", () => {
        const ip = "203.0.113.10";
        const now = Date.now();
        for (let i = 0; i < 30; i += 1) {
            recordMcpInvalidAttempt(ip, now + i);
        }
        const state = getMcpRateLimitState(ip, now + 30);
        expect(state.blocked).toBe(true);
        expect(state.retryAfterMs).toBeGreaterThan(0);
        expect(state.retryAfterMs).toBeLessThanOrEqual(5 * 60 * 1000);
    });

    it("WINDOW 만료 후 카운터 리셋", () => {
        const ip = "203.0.113.20";
        const now = Date.now();
        for (let i = 0; i < 5; i += 1) {
            recordMcpInvalidAttempt(ip, now + i);
        }
        // window 초과 후 새 시도 — 다시 1로 리셋
        recordMcpInvalidAttempt(ip, now + 6 * 60 * 1000);
        expect(getMcpRateLimitState(ip, now + 6 * 60 * 1000).blocked).toBe(
            false
        );
    });
});
