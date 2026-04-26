import fs from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { REFUGE_MODE_PATH } from "@/lib/refuge/paths";
import type { RefugeModeState } from "@/lib/refuge/schema";

type EnvLike = Partial<Record<string, string | undefined>>;

// SQLite refuge data-plane은 local/dev runtime에서만 활성화한다.
export function isSqliteRefugeRuntimeAllowed(
    env: EnvLike = process.env
): boolean {
    return (
        env.NODE_ENV !== "production" &&
        env.VERCEL !== "1" &&
        env.VERCEL_ENV !== "production" &&
        env.VERCEL_ENV !== "preview"
    );
}

export function readRefugeModeState(): RefugeModeState | null {
    try {
        if (!fs.existsSync(REFUGE_MODE_PATH)) return null;
        return JSON.parse(
            fs.readFileSync(REFUGE_MODE_PATH, "utf8")
        ) as RefugeModeState;
    } catch (error) {
        console.error(
            `[refuge-mode::readRefugeModeState] ${(error as Error).message}`
        );
        return null;
    }
}

export function isSqliteRefugeMode(): boolean {
    return (
        isSqliteRefugeRuntimeAllowed() &&
        readRefugeModeState()?.mode === "sqlite-refuge"
    );
}

// 기존 mode.json에 local-only secret이 없으면 local/dev에서만 보강한다.
export function ensureRefugeModeLocalSecret(): string {
    if (!isSqliteRefugeRuntimeAllowed()) return "";
    const state = readRefugeModeState();
    if (state?.mode !== "sqlite-refuge") return "";
    if (state.localAuthSecret) return state.localAuthSecret;

    const localAuthSecret = randomBytes(32).toString("hex");
    const nextState: RefugeModeState = {
        ...state,
        localAuthSecret,
    };
    fs.writeFileSync(REFUGE_MODE_PATH, JSON.stringify(nextState, null, 2), {
        encoding: "utf8",
        mode: 0o600,
    });
    return localAuthSecret;
}

export function stableJson(value: unknown): string {
    return JSON.stringify(value, (_key, nested) => {
        if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
            return nested;
        }
        return Object.fromEntries(
            Object.entries(nested as Record<string, unknown>).sort(([a], [b]) =>
                a.localeCompare(b)
            )
        );
    });
}

export function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}
