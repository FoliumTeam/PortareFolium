import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";

const PLACEHOLDER_VALUES = new Set([
    "admin@example.com",
    "your-auth-secret",
    "your_admin@example.com",
    "change-me",
    "changeme",
    "secret",
    "local-dev",
]);

function isPlaceholder(value) {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return (
        PLACEHOLDER_VALUES.has(normalized) ||
        normalized.includes("your_") ||
        normalized.includes("your-")
    );
}

function isValidEmail(value) {
    if (!value || isPlaceholder(value)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidAuthSecret(value) {
    if (!value || isPlaceholder(value)) return false;
    return !/\s/.test(value) && value.length >= 32;
}

function createPasswordHash(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

function escapeDollarForNextEnv(value) {
    return value.replace(/\$/g, "\\$");
}

function createE2ePassword() {
    return `E2e-${randomBytes(18).toString("base64url")}!Aa1`;
}

function getE2eAdminEmail(env) {
    if (isValidEmail(env.E2E_EMAIL)) return env.E2E_EMAIL;
    if (isValidEmail(env.AUTH_ADMIN_EMAIL)) return env.AUTH_ADMIN_EMAIL;
    return "e2e-admin@example.test";
}

function run(command, args, env) {
    const result = spawnSync(
        process.platform === "win32" ? "cmd.exe" : command,
        process.platform === "win32"
            ? ["/d", "/s", "/c", command, ...args]
            : args,
        {
            env,
            stdio: "inherit",
        }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const env = Object.fromEntries(
    Object.entries(process.env).filter((entry) => entry[1] !== undefined)
);
const password = env.E2E_RUNTIME_PASSWORD || createE2ePassword();

env.AUTH_ADMIN_EMAIL = getE2eAdminEmail(env);
env.E2E_RUNTIME_PASSWORD = password;
const passwordHash = createPasswordHash(password);
env.AUTH_ADMIN_PASSWORD_HASH = escapeDollarForNextEnv(passwordHash);
env.AUTH_SECRET = isValidAuthSecret(env.AUTH_SECRET)
    ? env.AUTH_SECRET
    : randomBytes(32).toString("hex");
env.BASE_URL = env.BASE_URL || "http://127.0.0.1:3100";
env.E2E_SERVER_MODE = "start";

console.log("[e2e-gate] generated runtime auth env in memory");
mkdirSync(".auth", { recursive: true });
writeFileSync(
    ".auth/e2e-env.json",
    JSON.stringify(
        {
            AUTH_ADMIN_EMAIL: env.AUTH_ADMIN_EMAIL,
            AUTH_ADMIN_PASSWORD_HASH: passwordHash,
            AUTH_SECRET: env.AUTH_SECRET,
        },
        null,
        2
    )
);
rmSync(".next", { recursive: true, force: true });
run(pnpm, ["build"], env);
run(
    pnpm,
    [
        "exec",
        "playwright",
        "test",
        "--project=chromium",
        "--project=authenticated-chromium",
    ],
    env
);
