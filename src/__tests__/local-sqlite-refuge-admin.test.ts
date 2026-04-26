import { describe, expect, it } from "vitest";
import {
    isLocalSqliteRefugeAdminBypassAllowed,
    isLocalSqliteRefugeRuntimeAllowed,
    isLocalhostRequestHost,
} from "@/lib/local-sqlite-refuge-admin";

const localEnv = {
    SQLITE_REFUGE_ADMIN_BYPASS: "local-dev-only",
    NODE_ENV: "development",
    VERCEL: undefined,
    VERCEL_ENV: undefined,
};

describe("local sqlite refuge admin bypass gate", () => {
    it("allows only explicit local development runtime", () => {
        expect(isLocalSqliteRefugeRuntimeAllowed(localEnv)).toBe(true);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                SQLITE_REFUGE_ADMIN_BYPASS: undefined,
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                NODE_ENV: "production",
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                NODE_ENV: "production",
                SQLITE_REFUGE_ALLOW_LOCAL_START: "local-dev-only",
            })
        ).toBe(true);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({ ...localEnv, VERCEL: "1" })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                NODE_ENV: "production",
                SQLITE_REFUGE_ALLOW_LOCAL_START: "local-dev-only",
                VERCEL: "1",
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                VERCEL_ENV: "production",
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeRuntimeAllowed({
                ...localEnv,
                VERCEL_ENV: "preview",
            })
        ).toBe(false);
    });

    it("allows only localhost request hosts", () => {
        expect(isLocalhostRequestHost("localhost:3000")).toBe(true);
        expect(isLocalhostRequestHost("127.0.0.1:3000")).toBe(true);
        expect(isLocalhostRequestHost("[::1]:3000")).toBe(true);
        expect(isLocalhostRequestHost("preview.example.vercel.app")).toBe(
            false
        );
    });

    it("requires explicit env, localhost, and active sqlite refuge mode", () => {
        expect(
            isLocalSqliteRefugeAdminBypassAllowed({
                host: "localhost:3000",
                sqliteRefugeMode: true,
                env: localEnv,
            })
        ).toBe(true);
        expect(
            isLocalSqliteRefugeAdminBypassAllowed({
                host: "localhost:3000",
                sqliteRefugeMode: false,
                env: localEnv,
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeAdminBypassAllowed({
                host: "feature.example.vercel.app",
                sqliteRefugeMode: true,
                env: localEnv,
            })
        ).toBe(false);
        expect(
            isLocalSqliteRefugeAdminBypassAllowed({
                host: "localhost:3000",
                sqliteRefugeMode: true,
                env: { ...localEnv, VERCEL: "1" },
            })
        ).toBe(false);
    });
});
