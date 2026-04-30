import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
    createClientMock: vi.fn((url: string, key: string) => ({ key, url })),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: createClientMock,
}));

vi.mock("@/lib/refuge/mode", () => ({
    isSqliteRefugeMode: () => false,
}));

vi.mock("@/lib/refuge/server-client", () => ({
    createRoutingServerClient: (client: unknown) => client,
}));

describe("Supabase env key resolution", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        createClientMock.mockClear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("prefers modern publishable and secret keys", async () => {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
        vi.stubEnv(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "sb_publishable_new"
        );
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-anon");
        vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_new");
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-service-role");

        await import("@/lib/supabase");

        expect(createClientMock).toHaveBeenCalledWith(
            "https://project.supabase.co",
            "sb_secret_new"
        );
        expect(createClientMock).toHaveBeenCalledWith(
            "https://project.supabase.co",
            "sb_publishable_new"
        );
    });

    it("falls back to legacy anon and service_role env names", async () => {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-anon");
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-service-role");

        await import("@/lib/supabase");

        expect(createClientMock).toHaveBeenCalledWith(
            "https://project.supabase.co",
            "legacy-service-role"
        );
        expect(createClientMock).toHaveBeenCalledWith(
            "https://project.supabase.co",
            "legacy-anon"
        );
    });
});
