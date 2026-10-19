import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    REFUGE_DIR,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
} from "../src/lib/refuge/paths";
import {
    buildReplayPlan,
    applyJournal,
    readReplaySnapshot,
} from "../src/lib/refuge/replay";
import {
    getRefugeJournalHeadHash,
    readRefugeJournal,
} from "../src/lib/refuge/store";
import { type RefugeManifest } from "../src/lib/refuge/schema";

function hasArg(name: string): boolean {
    return process.argv.includes(name);
}

function getClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    return createClient(url, key);
}

async function snapshotSupabase(client: SupabaseClient): Promise<string> {
    const tables = await readReplaySnapshot(client);
    const filePath = path.join(
        REFUGE_DIR,
        `pre-push-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            { createdAt: new Date().toISOString(), tables },
            null,
            2
        ),
        "utf8"
    );
    return filePath;
}

async function main(): Promise<void> {
    if (!fs.existsSync(REFUGE_MODE_PATH)) throw new Error("mode.json missing");
    if (!fs.existsSync(REFUGE_MANIFEST_PATH))
        throw new Error("manifest.json missing");
    const mode = JSON.parse(fs.readFileSync(REFUGE_MODE_PATH, "utf8")) as {
        mode?: string;
    };
    if (mode.mode !== "sqlite-refuge")
        throw new Error("sqlite-refuge mode is not active");
    const manifest = JSON.parse(
        fs.readFileSync(REFUGE_MANIFEST_PATH, "utf8")
    ) as RefugeManifest;
    const journal = fs.existsSync(REFUGE_JOURNAL_PATH)
        ? readRefugeJournal()
        : [];
    const apply = hasArg("--apply");
    const checkRemote = hasArg("--check-remote");
    const localWins = hasArg("--local-wins");
    const client = apply || checkRemote ? getClient() : null;
    const snapshotPath =
        apply && client ? await snapshotSupabase(client) : null;
    const replay = await buildReplayPlan(client, journal, { localWins });
    const plan = {
        ok: replay.conflicts.length === 0,
        apply,
        checkRemote,
        localWins,
        manifestCreatedAt: manifest.createdAt,
        journalEntries: journal.length,
        journalHeadHash: getRefugeJournalHeadHash(journal),
        touchedTables: replay.touchedTables,
        operationCount: replay.operationCount,
        conflicts: replay.conflicts,
        overrides: replay.overrides,
        skippedLocalOnly: replay.skippedLocalOnly,
        policy: {
            order: apply
                ? "snapshot -> conflict-detect -> apply"
                : checkRemote
                  ? "remote conflict-detect replay-plan only"
                  : "local replay-plan only",
            defaultConflict: localWins
                ? "local SQLite row wins for refuge replay tables"
                : "reject",
            deletes: "journal-only for refuge supported tables",
            localOnlyTables:
                "admin_login_attempts stays local and is not replayed",
            storage: "excluded",
        },
    };
    const planPath = path.join(REFUGE_DIR, "replay-plan.json");
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf8");
    if (!apply) {
        console.log(
            JSON.stringify({ ...plan, planPath, applied: false }, null, 2)
        );
        return;
    }
    if (!client || !snapshotPath) throw new Error("Supabase client missing");
    if (replay.conflicts.length > 0) {
        throw new Error(`conflict detected: ${planPath}`);
    }
    await applyJournal(client, journal, { localWins });
    console.log(
        JSON.stringify(
            { ...plan, planPath, snapshotPath, applied: true },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error(`[refuge-push::main] ${(error as Error).message}`);
    process.exit(1);
});
