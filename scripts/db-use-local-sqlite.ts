import path from "node:path";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

function tsxCliPath(): string {
    return path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
}

const result = spawnSync(
    process.execPath,
    [
        tsxCliPath(),
        "scripts/refuge-pull.ts",
        "--activate",
        ...process.argv.slice(2),
    ],
    {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
    }
);

process.exit(result.status ?? 1);
