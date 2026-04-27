import { defineConfig, devices } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import path from "path";

// .env.local에서 E2E_EMAIL 등 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const authFile = ".auth/user.json";
const e2eServerMode =
    process.env.E2E_SERVER_MODE ?? (process.env.CI ? "start" : "dev");

const PLACEHOLDER_VALUES = new Set([
    "admin@example.com",
    "your-auth-secret",
    "your_admin@example.com",
    "change-me",
    "changeme",
    "secret",
    "local-dev",
]);

function isPlaceholder(value: string | undefined): boolean {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return (
        PLACEHOLDER_VALUES.has(normalized) ||
        normalized.includes("your_") ||
        normalized.includes("your-")
    );
}

function isValidEmail(value: string | undefined): boolean {
    if (!value || isPlaceholder(value)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidAuthSecret(value: string | undefined): boolean {
    if (!value || isPlaceholder(value)) return false;
    return !/\s/.test(value) && value.length >= 32;
}

function createPasswordHash(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

function createE2ePassword(): string {
    return `E2e-${randomBytes(18).toString("base64url")}!Aa1`;
}

function getE2eAdminEmail(): string {
    if (isValidEmail(process.env.E2E_EMAIL)) return process.env.E2E_EMAIL!;
    if (isValidEmail(process.env.AUTH_ADMIN_EMAIL)) {
        return process.env.AUTH_ADMIN_EMAIL!;
    }
    return "e2e-admin@example.test";
}

function getDefinedProcessEnv(): Record<string, string> {
    return Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined
        )
    );
}

if (!isValidAuthSecret(process.env.AUTH_SECRET)) {
    process.env.AUTH_SECRET = randomBytes(32).toString("hex");
}

process.env.AUTH_ADMIN_EMAIL = getE2eAdminEmail();
process.env.E2E_RUNTIME_PASSWORD =
    process.env.E2E_RUNTIME_PASSWORD || createE2ePassword();
process.env.AUTH_ADMIN_PASSWORD_HASH = createPasswordHash(
    process.env.E2E_RUNTIME_PASSWORD
);

if (e2eServerMode === "start") {
    mkdirSync(".auth", { recursive: true });
    writeFileSync(
        ".auth/e2e-env.json",
        JSON.stringify(
            {
                AUTH_ADMIN_EMAIL: process.env.AUTH_ADMIN_EMAIL,
                AUTH_ADMIN_PASSWORD_HASH: process.env.AUTH_ADMIN_PASSWORD_HASH,
                AUTH_SECRET: process.env.AUTH_SECRET,
            },
            null,
            2
        )
    );
}

const baseURL =
    process.env.BASE_URL ||
    (e2eServerMode === "start"
        ? "http://127.0.0.1:3100"
        : "http://localhost:3000");
const webServerCommand =
    e2eServerMode === "start" ? "node scripts/start-next-e2e.mjs" : "pnpm dev";

export default defineConfig({
    testDir: "./e2e",
    outputDir: "./e2e/.results",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "github" : "html",
    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [
        // 인증 setup (1회 실행, storageState 저장)
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
        },

        // 공개 페이지 테스트 (인증 불필요)
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: /authenticated\//,
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /authenticated\//,
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testIgnore: /authenticated\//,
        },
        {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] },
            testIgnore: /authenticated\//,
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 12"] },
            testIgnore: /authenticated\//,
        },

        // 인증 필요 테스트 (setup 의존)
        {
            name: "authenticated-chromium",
            use: {
                ...devices["Desktop Chrome"],
                storageState: authFile,
            },
            testMatch: /authenticated\/.+\.spec\.ts/,
            dependencies: ["setup"],
        },
        {
            name: "authenticated-firefox",
            use: {
                ...devices["Desktop Firefox"],
                storageState: authFile,
            },
            testMatch: /authenticated\/.+\.spec\.ts/,
            dependencies: ["setup"],
        },
        {
            name: "authenticated-webkit",
            use: {
                ...devices["Desktop Safari"],
                storageState: authFile,
            },
            testMatch: /authenticated\/.+\.spec\.ts/,
            dependencies: ["setup"],
        },
    ],
    webServer: {
        // push gate: build + start, 수동 로컬 실행: dev
        command: webServerCommand,
        env: getDefinedProcessEnv(),
        url: baseURL,
        reuseExistingServer: e2eServerMode !== "start",
        timeout: 120_000,
    },
});
