// 본문/snapshot에서 참조되지 않는 R2 key 제거
// sidecar (.thumb.webp / .poster.webp)는 base가 살아있으면 함께 보존
import { listStorageFiles, deleteStorageKeys } from "@/lib/image-upload";
import { loadSnapshotsContent } from "@/lib/snapshot-cleanup";

// CleanupArgs — true-orphan 판정에 필요한 모든 reference source
export type CleanupArgs = {
    folderPath: string;
    entityType: "post" | "portfolio";
    entitySlug: string;
    currentContent: string;
    thumbnail: string;
    candidates?: string[];
};

// sidecar suffix와 확장자를 떼어 base stem만 남김
export function baseKey(k: string): string {
    return k.replace(/\.(thumb|poster)\.webp$/, "").replace(/\.[^./]+$/, "");
}

// content/thumbnail/snapshot text에서 folderPath 하위 R2 key 추출
export function extractKeysFromText(
    text: string,
    folderPath: string
): string[] {
    if (!text) return [];
    const escaped = folderPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`/${escaped}/([^\\s)"'?#<>]+)`, "g");
    const keys: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        keys.push(`${folderPath}/${m[1]}`);
    }
    return keys;
}

// content + thumbnail + 모든 snapshot 합집합에서 referenced base set 구성
export async function gatherReferencedBases(
    args: CleanupArgs
): Promise<Set<string>> {
    const refs = new Set<string>();
    for (const k of extractKeysFromText(args.currentContent, args.folderPath)) {
        refs.add(baseKey(k));
    }
    for (const k of extractKeysFromText(args.thumbnail, args.folderPath)) {
        refs.add(baseKey(k));
    }
    const snaps = await loadSnapshotsContent(args.entityType, args.entitySlug);
    for (const snap of snaps) {
        for (const k of extractKeysFromText(snap, args.folderPath)) {
            refs.add(baseKey(k));
        }
    }
    return refs;
}

// true-orphan 정리 — listed에서 referenced에 없는 key 삭제
// candidates 지정 시 그 key들로만 범위 한정 (T1 단일 삭제용)
export async function cleanupTrueOrphans(args: CleanupArgs): Promise<void> {
    let listed: string[];
    try {
        listed = await listStorageFiles(args.folderPath);
    } catch (e) {
        console.error(
            `[orphan-cleanup::cleanupTrueOrphans] list 실패: ${args.folderPath}`,
            e
        );
        return;
    }
    if (listed.length === 0) return;

    const referencedBases = await gatherReferencedBases(args);
    if (referencedBases.size === 0 && args.currentContent.trim()) {
        return;
    }

    const targets = args.candidates
        ? listed.filter((k) => args.candidates!.includes(baseKey(k)))
        : listed;
    const toDelete = targets.filter((k) => !referencedBases.has(baseKey(k)));
    if (toDelete.length === 0) return;

    if (process.env.NODE_ENV === "development") {
        console.log(
            `[orphan-cleanup::cleanupTrueOrphans] folder=${args.folderPath} delete=${toDelete.length}`,
            toDelete
        );
    }
    try {
        await deleteStorageKeys(toDelete);
    } catch (e) {
        console.error(
            `[orphan-cleanup::cleanupTrueOrphans] delete 실패: ${args.folderPath}`,
            e
        );
    }
}

// 단일 base key의 true-orphan 정리 (Trigger 1 전용)
export async function cleanupSingleKey(
    args: Omit<CleanupArgs, "candidates">,
    base: string
): Promise<void> {
    return cleanupTrueOrphans({ ...args, candidates: [base] });
}
