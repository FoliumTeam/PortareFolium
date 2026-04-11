import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// .env.local에서 E2E_EMAIL, E2E_PASSWORD 등 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const authFile = ".auth/user.json";

export default defineConfig({
    testDir: "./e2e",
    outputDir: "./e2e/.results",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "github" : "html",
    use: {
        baseURL: process.env.BASE_URL || "http://localhost:3000",
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
        // CI: 빌드 결과물 서빙 (빠름), 로컬: dev 서버
        command: process.env.CI ? "pnpm start" : "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
