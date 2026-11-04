// 기존 PostgreSQL 제약을 확인하는 실행 시점의 고유 키 목록
const TABLE_UNIQUE_KEYS: Record<string, string[][]> = {
    site_config: [["key"]],
    about_data: [["id"]],
    resume_data: [["lang"], ["id"]],
    posts: [["slug"], ["id"]],
    portfolio_items: [["slug"], ["id"]],
    tags: [["slug"]],
    post_categories: [["name"]],
    post_content_revisions: [["id"]],
    post_content_chunks: [["revision_id", "chunk_index"]],
    books: [["slug"], ["id"]],
    editor_states: [["id"]],
    gantt_chart_archives: [["id"]],
    database_snapshots: [["id"]],
    application_profiles: [["id"], ["public_token"]],
    admin_login_attempts: [["key_hash"]],
};

// PostgreSQL의 기본키와 추가 고유 키를 언어 범위에 맞게 적용
export function getRefugeUniqueKeys(table: string): string[][] {
    const localized = table.endsWith("_i18n");
    const base = localized ? table.slice(0, -5) : table;
    const groups = [...(TABLE_UNIQUE_KEYS[base] ?? [["id"]])];
    if (localized && base === "about_data") groups.push([]);
    return groups.map((keys) => [...(localized ? ["lang"] : []), ...keys]);
}
