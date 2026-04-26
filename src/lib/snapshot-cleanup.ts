// editor_states snapshot 조회 + snapshot 삭제 후 true-orphan cleanup helper
import {
    countEditorSnapshots,
    listEditorSnapshotContents,
} from "@/app/admin/actions/editor-states";
import { cleanupTrueOrphans, type CleanupArgs } from "@/lib/orphan-cleanup";

// 해당 entity의 모든 snapshot content 로드 (Initial + Auto-save + Bookmark)
export async function loadSnapshotsContent(
    entityType: string,
    entitySlug: string
): Promise<string[]> {
    try {
        return await listEditorSnapshotContents(entityType, entitySlug);
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

// 에디터 open 시 editor_states.count 확인 → 0이면 full cleanup (Trigger 3 안전망)
export async function maybeCleanupOnOpen(
    entityType: string,
    entitySlug: string,
    args: CleanupArgs
): Promise<void> {
    try {
        const count = await countEditorSnapshots(entityType, entitySlug);
        if (count && count > 0) return;
        triggerSnapshotCleanup(args);
    } catch {
        // best-effort
    }
}
