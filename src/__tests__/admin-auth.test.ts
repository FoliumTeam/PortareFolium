import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail, isAdminSession } from "@/lib/admin-auth";

describe("admin auth helpers", () => {
    const original = process.env.AUTH_ADMIN_EMAILS;

    afterEach(() => {
        process.env.AUTH_ADMIN_EMAILS = original;
        vi.unstubAllEnvs();
    });

    it("allowlist에 포함된 이메일만 관리자 권한 반환", () => {
        vi.stubEnv(
            "AUTH_ADMIN_EMAILS",
            "admin@example.com, second@example.com"
        );

        expect(isAdminEmail("admin@example.com")).toBe(true);
        expect(isAdminEmail("SECOND@example.com")).toBe(true);
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
