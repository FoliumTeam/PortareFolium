import { randomUUID } from "node:crypto";

export const REFUGE_SUPPORTED_TABLES = [
    "site_config",
    "about_data",
    "resume_data",
    "posts",
    "portfolio_items",
    "tags",
    "post_categories",
    "post_content_revisions",
    "post_content_chunks",
    "books",
    "editor_states",
    "gantt_chart_archives",
    "database_snapshots",
    "admin_login_attempts",
    "application_profiles",
    "about_data_i18n",
    "posts_i18n",
    "portfolio_items_i18n",
    "books_i18n",
    "editor_states_i18n",
    "post_content_revisions_i18n",
    "post_content_chunks_i18n",
    "tags_i18n",
    "post_categories_i18n",
    "application_profiles_i18n",
    "site_config_i18n",
] as const;

export const REFUGE_LOCAL_ONLY_TABLES = ["admin_login_attempts"] as const;

export const REFUGE_EXCLUDED_TABLES = ["ai_agent_tokens"] as const;

export const REFUGE_REPLAY_TABLES = REFUGE_SUPPORTED_TABLES.filter(
    (table) => !REFUGE_LOCAL_ONLY_TABLES.includes(table as never)
);

export type RefugeSupportedTable = (typeof REFUGE_SUPPORTED_TABLES)[number];
export type RefugeMode = "supabase-primary" | "sqlite-refuge";
export type RefugeRow = Record<string, unknown>;

const REFUGE_TABLE_COLUMNS: Record<string, readonly string[]> = {
    site_config: ["key", "value", "updated_at"],
    about_data: ["id", "data", "published", "updated_at"],
    resume_data: ["id", "lang", "data", "published", "updated_at"],
    posts: [
        "id",
        "slug",
        "title",
        "description",
        "pub_date",
        "category",
        "tags",
        "job_field",
        "thumbnail",
        "content",
        "published",
        "meta_title",
        "meta_description",
        "og_image",
        "created_at",
        "updated_at",
    ],
    portfolio_items: [
        "id",
        "slug",
        "title",
        "description",
        "tags",
        "job_field",
        "thumbnail",
        "content",
        "data",
        "featured",
        "order_idx",
        "published",
        "meta_title",
        "meta_description",
        "og_image",
        "created_at",
        "updated_at",
    ],
    tags: ["slug", "name", "color", "created_at"],
    post_categories: ["name", "created_at"],
    post_content_revisions: [
        "id",
        "post_id",
        "content_hash",
        "content_size",
        "chunk_size",
        "chunk_count",
        "active",
        "status",
        "created_at",
        "committed_at",
    ],
    post_content_chunks: [
        "revision_id",
        "chunk_index",
        "content",
        "checksum",
        "created_at",
    ],
    books: [
        "id",
        "slug",
        "title",
        "author",
        "cover_url",
        "description",
        "content",
        "rating",
        "tags",
        "job_field",
        "published",
        "featured",
        "order_idx",
        "data",
        "meta_title",
        "meta_description",
        "og_image",
        "created_at",
        "updated_at",
    ],
    editor_states: [
        "id",
        "entity_type",
        "entity_slug",
        "label",
        "content",
        "created_at",
    ],
    gantt_chart_archives: [
        "id",
        "title",
        "source_filename",
        "csv_content",
        "tasks",
        "color_scheme",
        "bar_style",
        "category_colors",
        "created_at",
        "updated_at",
    ],
    database_snapshots: ["id", "filename", "data", "table_names", "created_at"],
    application_profiles: [
        "id",
        "name",
        "public_token",
        "parent_job_field",
        "job_description",
        "status",
        "version",
        "base_snapshot",
        "overrides",
        "public_snapshot",
        "published_at",
        "created_at",
        "updated_at",
    ],
};

export function refugeTableHasColumn(table: string, column: string): boolean {
    return (
        (table.endsWith("_i18n") && column === "lang") ||
        (REFUGE_TABLE_COLUMNS[table.replace(/_i18n$/, "")]?.includes(column) ??
            true)
    );
}

export function sanitizeRefugeRowForReplay(
    table: string,
    row: RefugeRow | null | undefined
): RefugeRow | null | undefined {
    if (!row) return row;
    const base = table.endsWith("_i18n") ? table.slice(0, -5) : table;
    const columns = REFUGE_TABLE_COLUMNS[base];
    if (!columns) return row;
    const allowed = new Set([
        ...columns,
        ...(table.endsWith("_i18n") ? ["lang"] : []),
    ]);
    return Object.fromEntries(
        Object.entries(row).filter(
            ([key]) => allowed.has(key) && key !== "content_mode"
        )
    );
}

export type RefugeModeState = {
    mode: RefugeMode;
    activatedAt?: string;
    deactivatedAt?: string;
    dbPath: string;
    manifestPath: string;
    journalPath: string;
};

export type RefugeManifest = {
    schemaVersion: number;
    createdAt: string;
    source: string;
    sourceHash: string;
    dbPath: string;
    modePath: string;
    journalPath: string;
    tables: Record<string, { rowCount: number; checksum: string }>;
    excludedTables: string[];
};

export type RefugeJournalEntry = {
    id: string;
    at: string;
    table: string;
    operation: "insert" | "update" | "upsert" | "delete";
    identity: string;
    before?: RefugeRow | null;
    after?: RefugeRow | null;
    prevHash?: string;
    hash?: string;
};

const TABLE_IDENTITY_KEYS: Record<string, string[]> = {
    site_config: ["key"],
    about_data: ["id"],
    resume_data: ["lang"],
    posts: ["slug"],
    portfolio_items: ["slug"],
    tags: ["slug"],
    post_categories: ["name"],
    post_content_revisions: ["id"],
    post_content_chunks: ["revision_id", "chunk_index"],
    books: ["slug"],
    editor_states: ["id"],
    gantt_chart_archives: ["id"],
    database_snapshots: ["id"],
    application_profiles: ["id"],
    admin_login_attempts: ["key_hash"],
};

export function getRefugeIdentity(table: string, row: RefugeRow): string {
    const localized = table.endsWith("_i18n");
    const base = localized ? table.slice(0, -5) : table;
    const keys = [
        ...(localized ? ["lang"] : []),
        ...(TABLE_IDENTITY_KEYS[base] ?? ["id"]),
    ];
    const parts = keys.map((key) => row[key]);
    if (parts.every((value) => value != null && value !== "")) {
        return parts.map((value) => String(value)).join("::");
    }
    const id = row.id ?? randomUUID();
    row.id = id;
    return String(id);
}

export function isRefugeSupportedTable(table: string): boolean {
    return REFUGE_SUPPORTED_TABLES.includes(table as RefugeSupportedTable);
}

export function isRefugeQueryableTable(table: string): boolean {
    return isRefugeSupportedTable(table);
}
