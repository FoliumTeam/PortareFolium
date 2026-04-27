import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const envFile = ".auth/e2e-env.json";
const e2eEnv = JSON.parse(readFileSync(envFile, "utf8"));

function escapeDollarForNextEnv(value) {
    return value.replace(/\$/g, "\\$");
}

const env = {
    ...process.env,
    ...e2eEnv,
    AUTH_ADMIN_PASSWORD_HASH: escapeDollarForNextEnv(
        e2eEnv.AUTH_ADMIN_PASSWORD_HASH
    ),
    BASE_URL: process.env.BASE_URL || "http://127.0.0.1:3100",
    E2E_SERVER_MODE: "start",
};

const args = ["exec", "next", "start", "-H", "127.0.0.1", "-p", "3100"];
const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : pnpm,
    process.platform === "win32" ? ["/d", "/s", "/c", pnpm, ...args] : args,
    { env, stdio: "inherit" }
);

if (result.error) throw result.error;
process.exit(result.status ?? 0);
