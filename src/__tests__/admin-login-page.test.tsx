import { describe, expect, it, vi } from "vitest";

const { getEffectiveAdminSessionMock } = vi.hoisted(() => ({
    getEffectiveAdminSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
    isAdminSession: vi.fn(() => false),
}));

vi.mock("@/lib/admin-credentials", () => ({
    getAdminCredentialSetup: vi.fn(() => ({
        missingEnvKeys: ["AUTH_SECRET"],
        invalidEnvKeys: [],
    })),
}));

vi.mock("@/lib/server-admin", () => ({
    getEffectiveAdminSession: getEffectiveAdminSessionMock,
}));

vi.mock("@/lib/supabase", () => ({
    serverClient: null,
}));

describe("AdminLoginPage setup gate", () => {
    it("auth secret이 없으면 Auth.js session 조회 전에 setup guide를 렌더링", async () => {
        const { default: AdminLoginPage } =
            await import("@/app/admin/login/page");

        const element = (await AdminLoginPage({
            searchParams: Promise.resolve({}),
        })) as { props: { setupState: { missingEnvKeys: string[] } } };

        expect(getEffectiveAdminSessionMock).not.toHaveBeenCalled();
        expect(element.props.setupState.missingEnvKeys).toEqual([
            "AUTH_SECRET",
        ]);
    });
});
