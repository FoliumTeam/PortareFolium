import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import {
    REFUGE_DB_PATH,
    REFUGE_DIR,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
} from "../src/lib/refuge/paths";
import type { RefugeModeState } from "../src/lib/refuge/schema";

type ProcessInfo = {
    pid: number;
    ppid?: number;
    command: string;
};

type ReplayPlan = {
    ok: boolean;
    applied?: boolean;
    planPath?: string;
    snapshotPath?: string;
    journalEntries: number;
    journalHeadHash: string;
    touchedTables: string[];
    operationCount: number;
    conflicts: { table: string; identity: string; reason: string }[];
    overrides?: { table: string; identity: string; reason: string }[];
    skippedLocalOnly: unknown[];
};

const ENV_LOCAL_PATH = path.join(process.cwd(), ".env.local");
const BACKUP_ROOT = path.join(process.cwd(), ".local", "refuge-backups");
const REPLAY_PLAN_PATH = path.join(REFUGE_DIR, "replay-plan.json");

function fail(message: string): never {
    throw new Error(message);
}

function normalizeForMatch(value: string): string {
    return value.toLowerCase().replace(/\\/g, "/");
}

function getCurrentProcessIds(): Set<number> {
    const ids = new Set<number>();
    let pid: number | undefined = process.pid;
    const parentByPid = new Map<number, number | undefined>();
    for (const item of listProcesses()) {
        parentByPid.set(item.pid, item.ppid);
    }
    while (pid && !ids.has(pid)) {
        ids.add(pid);
        pid = parentByPid.get(pid);
    }
    return ids;
}

function listProcesses(): ProcessInfo[] {
    if (process.platform === "win32") {
        const result = spawnSync(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
            ],
            { encoding: "utf8" }
        );
        if (result.status !== 0 || !result.stdout.trim()) return [];
        const parsed = JSON.parse(result.stdout) as
            | {
                  ProcessId: number;
                  ParentProcessId?: number;
                  CommandLine?: string;
              }
            | {
                  ProcessId: number;
                  ParentProcessId?: number;
                  CommandLine?: string;
              }[];
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        return rows
            .filter((row) => row.CommandLine)
            .map((row) => ({
                pid: row.ProcessId,
                ppid: row.ParentProcessId,
                command: row.CommandLine ?? "",
            }));
    }

    const result = spawnSync("ps", ["-eo", "pid=,ppid=,args="], {
        encoding: "utf8",
    });
    if (result.status !== 0) return [];
    return result.stdout
        .split(/\r?\n/)
        .map((line): ProcessInfo | null => {
            const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
            if (!match) return null;
            return {
                pid: Number(match[1]),
                ppid: Number(match[2]),
                command: match[3],
            };
        })
        .filter((item): item is ProcessInfo => Boolean(item));
}

function isDevServerProcess(processInfo: ProcessInfo): boolean {
    const command = normalizeForMatch(processInfo.command);
    const repo = normalizeForMatch(process.cwd());
    const hasRepoPath = command.includes(repo);
    const hasPackageDevCommand =
        /\b(pnpm(?:\.cmd)?|npm(?:\.cmd)?|yarn(?:\.cmd)?)\s+(run\s+)?dev\b/.test(
            command
        );
    const hasNextDevCommand =
        /\bnext(?:\.cmd)?\s+dev\b/.test(command) ||
        (command.includes("next/dist/bin/next") && /\sdev\b/.test(command));

    return (hasRepoPath && hasPackageDevCommand) || hasNextDevCommand;
}

function findDevServers(): ProcessInfo[] {
    const currentProcessIds = getCurrentProcessIds();
    return listProcesses().filter(
        (item) => !currentProcessIds.has(item.pid) && isDevServerProcess(item)
    );
}

function assertNoDevServer(): void {
    const devServers = findDevServers();
    if (devServers.length === 0) return;
    const details = devServers
        .map((item) => `- pid ${item.pid}: ${item.command.slice(0, 180)}`)
        .join("\n");
    fail(
        [
            "Dev server is running. Stop it first, then rerun `pnpm db:restore-supabase`.",
            details,
        ].join("\n")
    );
}

function assertFileExists(filePath: string, label: string): void {
    if (!fs.existsSync(filePath)) fail(`${label} missing: ${filePath}`);
}

function readMode(): RefugeModeState {
    assertFileExists(REFUGE_MODE_PATH, "mode.json");
    return JSON.parse(
        fs.readFileSync(REFUGE_MODE_PATH, "utf8")
    ) as RefugeModeState;
}

function assertRefugeReady(): void {
    const mode = readMode();
    if (mode.mode !== "sqlite-refuge") {
        fail(`sqlite-refuge mode is not active: ${mode.mode}`);
    }
    assertFileExists(REFUGE_DB_PATH, "refuge.db");
    assertFileExists(REFUGE_JOURNAL_PATH, "journal.ndjson");
    assertFileExists(REFUGE_MANIFEST_PATH, "manifest.json");
}

function loadEnv(): void {
    config({ path: ENV_LOCAL_PATH, quiet: true });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secret = process.env.SUPABASE_SECRET_KEY;

    if (!url) fail("NEXT_PUBLIC_SUPABASE_URL missing");
    if (!publishable) fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing");
    if (!secret) fail("SUPABASE_SECRET_KEY missing");
    if (!publishable.startsWith("sb_publishable_")) {
        fail(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_"
        );
    }
    if (!secret.startsWith("sb_secret_")) {
        fail("SUPABASE_SECRET_KEY must start with sb_secret_");
    }
}

function timestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

function copyIfExists(source: string, targetDir: string): void {
    if (!fs.existsSync(source)) return;
    fs.copyFileSync(source, path.join(targetDir, path.basename(source)));
}

function createBackup(): string {
    const backupDir = path.join(BACKUP_ROOT, timestamp());
    fs.mkdirSync(backupDir, { recursive: true });
    copyIfExists(REFUGE_DB_PATH, backupDir);
    copyIfExists(REFUGE_JOURNAL_PATH, backupDir);
    copyIfExists(REFUGE_MANIFEST_PATH, backupDir);
    copyIfExists(REFUGE_MODE_PATH, backupDir);
    copyIfExists(REPLAY_PLAN_PATH, backupDir);
    copyIfExists(ENV_LOCAL_PATH, backupDir);
    return backupDir;
}

function tsxCliPath(): string {
    return path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
}

function runTsx(scriptPath: string, args: string[]): string {
    const result = spawnSync(
        process.execPath,
        [tsxCliPath(), scriptPath, ...args],
        {
            cwd: process.cwd(),
            env: process.env,
            encoding: "utf8",
        }
    );
    if (result.status !== 0) {
        const output = [result.error?.message, result.stdout, result.stderr]
            .filter(Boolean)
            .join("\n");
        fail(output || `${scriptPath} failed`);
    }
    if (result.stderr.trim()) process.stderr.write(result.stderr);
    return result.stdout;
}

function parseJsonOutput<T>(stdout: string): T {
    const trimmed = stdout.trim();
    try {
        return JSON.parse(trimmed) as T;
    } catch {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start < 0 || end < start)
            fail("Unable to parse script JSON output");
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
}

function runRemoteCheck(): ReplayPlan {
    const stdout = runTsx("scripts/refuge-push.ts", [
        "--check-remote",
        "--local-wins",
    ]);
    return parseJsonOutput<ReplayPlan>(stdout);
}

function runApply(): ReplayPlan {
    const stdout = runTsx("scripts/refuge-push.ts", [
        "--apply",
        "--local-wins",
    ]);
    return parseJsonOutput<ReplayPlan>(stdout);
}

function runDeactivate(): void {
    runTsx("scripts/refuge-deactivate.ts", []);
}

function runCleanseKeditorResidue(backupDir: string): void {
    const stdout = runTsx("scripts/cleanse-keditor-residue.ts", [
        "--apply",
        "--backup-dir",
        backupDir,
    ]);
    const result = parseJsonOutput<{
        ok: boolean;
        journalContentModeFieldsRemoved: number;
        journalNoopEntriesDropped: number;
        dbRowsCleaned: number;
    }>(stdout);
    if (!result.ok) fail("KEditor residue cleanse failed");
    const changed =
        result.journalContentModeFieldsRemoved +
        result.journalNoopEntriesDropped +
        result.dbRowsCleaned;
    if (changed > 0) {
        console.log(
            [
                "Abandoned KEditor residue cleansed before replay.",
                `content_mode fields removed: ${result.journalContentModeFieldsRemoved}`,
                `journal no-op entries dropped: ${result.journalNoopEntriesDropped}`,
                `refuge rows cleaned: ${result.dbRowsCleaned}`,
            ].join("\n")
        );
    }
}

function assertPlanSafe(plan: ReplayPlan): void {
    if (!plan.ok || plan.conflicts.length > 0) {
        const uniqueConflicts = [
            ...new Map(
                plan.conflicts.map((item) => [
                    `${item.table}:${item.identity}:${item.reason}`,
                    item,
                ])
            ).values(),
        ];
        const shownConflicts = uniqueConflicts.slice(0, 25);
        const details = shownConflicts
            .map((item) => `- ${item.table}:${item.identity} (${item.reason})`)
            .join("\n");
        const remaining =
            uniqueConflicts.length > shownConflicts.length
                ? `\n... ${uniqueConflicts.length - shownConflicts.length} more conflicts`
                : "";
        fail(`Supabase replay conflicts detected.\n${details}${remaining}`);
    }
}

function printPlanSummary(plan: ReplayPlan, backupDir: string): void {
    console.log("SQLite refuge -> Supabase restore is ready.");
    console.log(`Backup: ${backupDir}`);
    console.log(`Journal entries: ${plan.journalEntries}`);
    console.log(`Replay operations: ${plan.operationCount}`);
    console.log(`Touched tables: ${plan.touchedTables.join(", ") || "(none)"}`);
    console.log(`Local-wins overrides: ${plan.overrides?.length ?? 0}`);
    console.log(`Skipped local-only entries: ${plan.skippedLocalOnly.length}`);
    console.log(`Replay plan: ${plan.planPath ?? REPLAY_PLAN_PATH}`);
}

function askConfirmation(): Promise<boolean> {
    if (!process.stdin.isTTY) return Promise.resolve(false);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(
            "Proceed with Supabase apply and deactivate SQLite refuge mode? [y/N] ",
            (answer) => {
                rl.close();
                resolve(["y", "yes"].includes(answer.trim().toLowerCase()));
            }
        );
    });
}

function removeLocalStartOptIn(): void {
    if (!fs.existsSync(ENV_LOCAL_PATH)) return;
    const original = fs.readFileSync(ENV_LOCAL_PATH, "utf8");
    const next = original
        .split(/\r?\n/)
        .filter(
            (line) =>
                !line.trim().startsWith("SQLITE_REFUGE_ALLOW_LOCAL_START=")
        )
        .join("\n");
    if (next !== original) {
        fs.writeFileSync(
            ENV_LOCAL_PATH,
            `${next.replace(/\n*$/, "")}\n`,
            "utf8"
        );
    }
}

async function main(): Promise<void> {
    assertNoDevServer();
    assertRefugeReady();
    loadEnv();
    const backupDir = createBackup();
    runCleanseKeditorResidue(backupDir);
    const checkedPlan = runRemoteCheck();
    assertPlanSafe(checkedPlan);
    printPlanSummary(checkedPlan, backupDir);

    const confirmed = await askConfirmation();
    if (!confirmed) {
        console.log("Cancelled. No Supabase writes were performed.");
        return;
    }

    assertNoDevServer();
    const finalCheck = runRemoteCheck();
    assertPlanSafe(finalCheck);
    const applyPlan = runApply();
    if (!applyPlan.applied) fail("Supabase apply did not report applied: true");
    runDeactivate();
    const mode = readMode();
    if (mode.mode !== "supabase-primary") {
        fail(`Unexpected mode after deactivate: ${mode.mode}`);
    }
    removeLocalStartOptIn();
    console.log("Supabase restore complete.");
    console.log(`Snapshot: ${applyPlan.snapshotPath ?? "(unknown)"}`);
    console.log(`Backup: ${backupDir}`);
}

main().catch((error) => {
    console.error(`[db-restore-supabase::main] ${(error as Error).message}`);
    process.exit(1);
});
