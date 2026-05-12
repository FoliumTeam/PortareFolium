import { createHash } from "node:crypto";
import { serverClient } from "@/lib/supabase";

export type PostContentStorageMode = "inline" | "chunked";

export type PostContentReadResult = {
    content: string;
    storageMode: PostContentStorageMode;
};

type PostContentRevisionRow = {
    id: string;
    post_id: string;
    content_hash: string;
    content_size: number;
    chunk_size: number;
    chunk_count: number;
    active: boolean;
    status: string;
    created_at: string;
    committed_at: string | null;
};

type PostContentChunkRow = {
    revision_id: string;
    chunk_index: number;
    content: string;
    checksum: string;
    created_at: string;
};

export function sha256Hex(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function readPostContentById(
    postId: string,
    fallbackContent = ""
): Promise<PostContentReadResult> {
    if (!serverClient)
        return { content: fallbackContent, storageMode: "inline" };

    const { data: revision } = await serverClient
        .from("post_content_revisions")
        .select(
            "id, post_id, content_hash, content_size, chunk_size, chunk_count, active, status, created_at, committed_at"
        )
        .eq("post_id", postId)
        .eq("active", true)
        .eq("status", "committed")
        .order("committed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const activeRevision = revision as PostContentRevisionRow | null;
    if (!activeRevision) {
        return { content: fallbackContent, storageMode: "inline" };
    }

    const { data: chunks, error } = await serverClient
        .from("post_content_chunks")
        .select("revision_id, chunk_index, content, checksum, created_at")
        .eq("revision_id", activeRevision.id)
        .order("chunk_index", { ascending: true });

    if (error || !chunks) {
        console.error(
            `[post-content-chunks.ts::readPostContentById] ${error?.message ?? "chunk 조회 실패"}`
        );
        return { content: fallbackContent, storageMode: "inline" };
    }

    const rows = chunks as PostContentChunkRow[];
    if (rows.length !== activeRevision.chunk_count) {
        console.error(
            `[post-content-chunks.ts::readPostContentById] chunk count mismatch: ${rows.length}/${activeRevision.chunk_count}`
        );
        return { content: fallbackContent, storageMode: "inline" };
    }

    const content = rows.map((chunk) => chunk.content).join("");
    if (sha256Hex(content) !== activeRevision.content_hash) {
        console.error(
            "[post-content-chunks.ts::readPostContentById] content hash mismatch"
        );
        return { content: fallbackContent, storageMode: "inline" };
    }

    return { content, storageMode: "chunked" };
}
