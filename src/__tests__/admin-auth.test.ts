import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail, isAdminSession } from "@/lib/admin-auth";

describe("admin auth helpers", () => {
    const original = process.env.AUTH_ADMIN_EMAIL;

    afterEach(() => {
        process.env.AUTH_ADMIN_EMAIL = original;
        vi.unstubAllEnvs();
    });

    it("단일 관리자 이메일과 일치할 때만 관리자 권한 반환", () => {
        vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@example.com");

        expect(isAdminEmail("admin@example.com")).toBe(true);
        expect(isAdminEmail("ADMIN@example.com")).toBe(true);
        expect(isAdminEmail("user@example.com")).toBe(false);
    });

    it("세션의 isAdmin 플래그로 관리자 여부 판단", () => {
        expect(
            isAdminSession({
                user: {
                    id: "user-1",
                    isAdmin: true,
                    email: "admin@example.com",
                },
            })
        ).toBe(true);
        expect(
            isAdminSession({
                user: {
                    id: "user-2",
                    isAdmin: false,
                    email: "user@example.com",
                },
            })
        ).toBe(false);
    });
});
