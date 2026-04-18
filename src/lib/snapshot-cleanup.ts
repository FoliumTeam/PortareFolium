// editor_states snapshot 조회 + snapshot 삭제 후 true-orphan cleanup helper
import { browserClient } from "@/lib/supabase";
import { cleanupTrueOrphans, type CleanupArgs } from "@/lib/orphan-cleanup";

// 해당 entity의 모든 snapshot content 로드 (Initial + Auto-save + Bookmark)
export async function loadSnapshotsContent(
    entityType: string,
    entitySlug: string
): Promise<string[]> {
    if (!browserClient) return [];
    try {
        const { data } = await browserClient
            .from("editor_states")
            .select("content")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug);
        return (data ?? [])
            .map((r) => r.content as string | null)
            .filter((c): c is string => typeof c === "string" && c.length > 0);
    } catch {
        return [];
    }
}

// snapshot 삭제 직후 호출 — true-orphan cleanup을 background에 fire-and-forget
export function triggerSnapshotCleanup(args: CleanupArgs): void {
    cleanupTrueOrphans(args).catch((e) => {
        console.error(
            `[snapshot-cleanup::triggerSnapshotCleanup] cleanup 실패`,
            e
        );
    });
}

// slug rename 시 entity의 모든 snapshot.content에서 folder prefix 치환
// (Initial + Auto-save + Bookmark 모두 포함)
export async function rewriteSnapshotUrls(
    entityType: string,
    entitySlug: string,
    oldFolder: string,
    newFolder: string
): Promise<void> {
    if (!browserClient || oldFolder === newFolder) return;
    try {
        const { data } = await browserClient
            .from("editor_states")
            .select("id, content")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug);
        if (!data || data.length === 0) return;
        const needle = `/${oldFolder}/`;
        const replacement = `/${newFolder}/`;
        const updates = data
            .filter(
                (row) =>
                    typeof row.content === "string" &&
                    row.content.includes(needle)
            )
            .map((row) => ({
                id: row.id as string,
                content: (row.content as string).replaceAll(
                    needle,
                    replacement
                ),
            }));
        for (const u of updates) {
            await browserClient
                .from("editor_states")
                .update({ content: u.content })
                .eq("id", u.id);
        }
    } catch (e) {
        console.error(`[snapshot-cleanup::rewriteSnapshotUrls] 실패`, e);
    }
}

// 에디터 open 시 editor_states.count 확인 → 0이면 full cleanup (Trigger 3 안전망)
export async function maybeCleanupOnOpen(
    entityType: string,
    entitySlug: string,
    args: CleanupArgs
): Promise<void> {
    if (!browserClient) return;
    try {
        const { count } = await browserClient
            .from("editor_states")
            .select("id", { count: "exact", head: true })
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug);
        if (count && count > 0) return;
        triggerSnapshotCleanup(args);
    } catch {
        // best-effort
    }
}
