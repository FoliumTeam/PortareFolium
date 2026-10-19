"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";

const MAX_AUTO_SNAPSHOTS = 5;

type EditorSnapshotRow = {
    id: string;
    label: string;
    content: string;
    created_at: string;
};

type EditorSnapshot = {
    id: string;
    label: string;
    content: string;
    savedAt: string;
};

const mapSnapshot = (row: EditorSnapshotRow): EditorSnapshot => ({
    id: row.id,
    label: row.label,
    content: row.content,
    savedAt: row.created_at,
});

async function listSnapshots(
    entityType: string,
    entitySlug: string
): Promise<EditorSnapshot[]> {
    if (!serverClient) return [];
    const { data } = await serverClient
        .from("editor_states")
        .select("id, label, content, created_at")
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug)
        .order("created_at", { ascending: false });

    return ((data as EditorSnapshotRow[] | null) ?? []).map(mapSnapshot);
}

// snapshot content 목록 조회
async function listEditorSnapshotContentsInLocale(
    entityType: string,
    entitySlug: string
): Promise<string[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    const { data } = await serverClient
        .from("editor_states")
        .select("content")
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug);

    return ((data as { content: string | null }[] | null) ?? [])
        .map((row) => row.content)
        .filter((content): content is string => Boolean(content));
}

// entity snapshot 개수 조회
async function countEditorSnapshotsInLocale(
    entityType: string,
    entitySlug: string
): Promise<number> {
    await requireAdminSession();
    if (!serverClient) return 0;

    const { count } = await serverClient
        .from("editor_states")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug);

    return count ?? 0;
}

// editor_states 초기 정리 + Initial snapshot 보장
async function initializeEditorSnapshotsInLocale(
    entityType: string,
    entitySlug: string,
    currentContent: string
): Promise<EditorSnapshot[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await serverClient
        .from("editor_states")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug)
        .in("label", ["Initial", "Auto-save"])
        .lt("created_at", cutoff);

    if (currentContent) {
        await serverClient
            .from("editor_states")
            .delete()
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .eq("label", "Initial");

        await serverClient.from("editor_states").insert({
            entity_type: entityType,
            entity_slug: entitySlug,
            label: "Initial",
            content: currentContent,
        });
    }

    return listSnapshots(entityType, entitySlug);
}

// editor_states 단건 추가
async function createEditorSnapshotInLocale(
    entityType: string,
    entitySlug: string,
    label: "Auto-save" | "Bookmark" | "Initial",
    content: string
): Promise<EditorSnapshot[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    await serverClient.from("editor_states").insert({
        entity_type: entityType,
        entity_slug: entitySlug,
        label,
        content,
    });

    if (label === "Auto-save") {
        const { data } = await serverClient
            .from("editor_states")
            .select("id")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug)
            .eq("label", "Auto-save")
            .order("created_at", { ascending: true });

        const ids = ((data as { id: string }[] | null) ?? []).map(
            (row) => row.id
        );
        const overflow = ids.slice(
            0,
            Math.max(0, ids.length - MAX_AUTO_SNAPSHOTS)
        );
        for (const id of overflow) {
            await serverClient.from("editor_states").delete().eq("id", id);
        }
    }

    return listSnapshots(entityType, entitySlug);
}

// editor_states 단건 삭제
async function deleteEditorSnapshotInLocale(
    entityType: string,
    entitySlug: string,
    id: string
): Promise<EditorSnapshot[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    await serverClient.from("editor_states").delete().eq("id", id);
    return listSnapshots(entityType, entitySlug);
}

// editor_states label 기준 bulk delete
async function deleteEditorSnapshotsByLabelInLocale(
    entityType: string,
    entitySlug: string,
    label: "Auto-save" | "Bookmark"
): Promise<EditorSnapshot[]> {
    await requireAdminSession();
    if (!serverClient) return [];

    await serverClient
        .from("editor_states")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug)
        .eq("label", label);

    return listSnapshots(entityType, entitySlug);
}

// slug rename 시 snapshot content folder prefix 치환
async function rewriteEditorSnapshotUrlsInLocale(
    entityType: string,
    entitySlug: string,
    oldFolder: string,
    newFolder: string
): Promise<void> {
    await requireAdminSession();
    if (!serverClient || oldFolder === newFolder) return;

    const { data } = await serverClient
        .from("editor_states")
        .select("id, content")
        .eq("entity_type", entityType)
        .eq("entity_slug", entitySlug);

    const needle = `/${oldFolder}/`;
    const replacement = `/${newFolder}/`;
    const updates = ((data as { id: string; content: string }[] | null) ?? [])
        .filter(
            (row) =>
                typeof row.content === "string" && row.content.includes(needle)
        )
        .map((row) => ({
            id: row.id,
            content: row.content.replaceAll(needle, replacement),
        }));

    for (const update of updates) {
        await serverClient
            .from("editor_states")
            .update({ content: update.content })
            .eq("id", update.id);
    }
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function listEditorSnapshotContents(
    ...args: [
        ...Parameters<typeof listEditorSnapshotContentsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof listEditorSnapshotContentsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof listEditorSnapshotContentsInLocale>;
    return withContentLocale(locale, () =>
        listEditorSnapshotContentsInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function countEditorSnapshots(
    ...args: [
        ...Parameters<typeof countEditorSnapshotsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof countEditorSnapshotsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof countEditorSnapshotsInLocale>;
    return withContentLocale(locale, () =>
        countEditorSnapshotsInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function initializeEditorSnapshots(
    ...args: [
        ...Parameters<typeof initializeEditorSnapshotsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof initializeEditorSnapshotsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof initializeEditorSnapshotsInLocale>;
    return withContentLocale(locale, () =>
        initializeEditorSnapshotsInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function createEditorSnapshot(
    ...args: [
        ...Parameters<typeof createEditorSnapshotInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof createEditorSnapshotInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof createEditorSnapshotInLocale>;
    return withContentLocale(locale, () =>
        createEditorSnapshotInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deleteEditorSnapshot(
    ...args: [
        ...Parameters<typeof deleteEditorSnapshotInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof deleteEditorSnapshotInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deleteEditorSnapshotInLocale>;
    return withContentLocale(locale, () =>
        deleteEditorSnapshotInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deleteEditorSnapshotsByLabel(
    ...args: [
        ...Parameters<typeof deleteEditorSnapshotsByLabelInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof deleteEditorSnapshotsByLabelInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deleteEditorSnapshotsByLabelInLocale>;
    return withContentLocale(locale, () =>
        deleteEditorSnapshotsByLabelInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function rewriteEditorSnapshotUrls(
    ...args: [
        ...Parameters<typeof rewriteEditorSnapshotUrlsInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof rewriteEditorSnapshotUrlsInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof rewriteEditorSnapshotUrlsInLocale>;
    return withContentLocale(locale, () =>
        rewriteEditorSnapshotUrlsInLocale(...values)
    );
}
