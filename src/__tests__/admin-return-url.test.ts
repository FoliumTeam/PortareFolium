import { describe, expect, it } from "vitest";
import { getSafeAdminReturnUrl } from "@/lib/admin-return-url";

describe("admin returnUrl sanitizer", () => {
    it("admin relative path만 허용", () => {
        expect(getSafeAdminReturnUrl("/admin")).toBe("/admin");
        expect(getSafeAdminReturnUrl("/admin?tab=posts")).toBe(
            "/admin?tab=posts"
        );
        expect(getSafeAdminReturnUrl("/admin/editor#draft")).toBe(
            "/admin/editor#draft"
        );
    });

    it("외부 URL과 protocol-relative URL 차단", () => {
        expect(getSafeAdminReturnUrl("https://evil.example/admin")).toBe(
            "/admin"
        );
        expect(getSafeAdminReturnUrl("//evil.example/admin")).toBe("/admin");
        expect(getSafeAdminReturnUrl("/portfolio")).toBe("/admin");
    });
});
