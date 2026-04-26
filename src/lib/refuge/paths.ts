import path from "node:path";

export const REFUGE_DIR = path.join(process.cwd(), ".local", "refuge");
export const REFUGE_DB_PATH = path.join(REFUGE_DIR, "refuge.db");
export const REFUGE_MODE_PATH = path.join(REFUGE_DIR, "mode.json");
export const REFUGE_MANIFEST_PATH = path.join(REFUGE_DIR, "manifest.json");
export const REFUGE_JOURNAL_PATH = path.join(REFUGE_DIR, "journal.ndjson");
export const DEFAULT_REFUGE_BACKUP_PATH = path.join(
    process.cwd(),
    "backup",
    "supabase-backups",
    "public-schema-backup-20260421-172728.json"
);
export const REFUGE_UNSUPPORTED_REPORT_PATH = path.join(
    REFUGE_DIR,
    "unsupported-surfaces.json"
);
