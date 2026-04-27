import { defineConfig, devices } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import dotenv from "dotenv";
import path from "path";

// .env.local에서 E2E_EMAIL, E2E_PASSWORD 등 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const authFile = ".auth/user.json";
const e2eServerMode =
    process.env.E2E_SERVER_MODE ?? (process.env.CI ? "start" : "dev");

if (e2eServerMode === "start" && !process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = randomBytes(32).toString("hex");
}

if (!process.env.AUTH_ADMIN_EMAIL && process.env.E2E_EMAIL) {
    process.env.AUTH_ADMIN_EMAIL = process.env.E2E_EMAIL;
}

if (!process.env.AUTH_ADMIN_PASSWORD_HASH && process.env.E2E_PASSWORD) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(process.env.E2E_PASSWORD, salt, 64).toString("hex");
    process.env.AUTH_ADMIN_PASSWORD_HASH = `scrypt$${salt}$${hash}`;
}

const baseURL =
    process.env.BASE_URL ||
    (e2eServerMode === "start"
        ? "http://127.0.0.1:3100"
        : "http://localhost:3000");
const webServerCommand =
    e2eServerMode === "start"
        ? "pnpm exec next start -H 127.0.0.1 -p 3100"
        : "pnpm dev";

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
        url: baseURL,
        reuseExistingServer: e2eServerMode !== "start",
        timeout: 120_000,
    },
});
