import fs from "node:fs";
import path from "node:path";
import {
    REFUGE_DB_PATH,
    REFUGE_JOURNAL_PATH,
    REFUGE_MANIFEST_PATH,
    REFUGE_MODE_PATH,
} from "../src/lib/refuge/paths";
import type { RefugeModeState } from "../src/lib/refuge/schema";

fs.mkdirSync(path.dirname(REFUGE_MODE_PATH), { recursive: true });
const state: RefugeModeState = {
    mode: "supabase-primary",
    deactivatedAt: new Date().toISOString(),
    dbPath: REFUGE_DB_PATH,
    manifestPath: REFUGE_MANIFEST_PATH,
    journalPath: REFUGE_JOURNAL_PATH,
};
fs.writeFileSync(REFUGE_MODE_PATH, JSON.stringify(state, null, 2), "utf8");
console.log(
    JSON.stringify(
        { ok: true, mode: state.mode, modePath: REFUGE_MODE_PATH },
        null,
        2
    )
);
