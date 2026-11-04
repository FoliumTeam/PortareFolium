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
    fallbackContent = "",
    options?: { strict?: boolean }
): Promise<PostContentReadResult> {
    if (!serverClient) {
        if (options?.strict) {
            throw new Error(
                "[post-content-chunks.ts::readPostContentById] serverClient 없음"
            );
        }
        return { content: fallbackContent, storageMode: "inline" };
    }

    // 복사 경로의 오류 전달과 공개 화면의 기존 본문 유지
    const handleReadError = (message: string): PostContentReadResult => {
        const errorMessage = `[post-content-chunks.ts::readPostContentById] ${message}`;
        if (options?.strict) throw new Error(errorMessage);
        console.error(errorMessage);
        return { content: fallbackContent, storageMode: "inline" };
    };

    const { data: revision, error: revisionError } = await serverClient
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

    if (revisionError && options?.strict) {
        return handleReadError(revisionError.message);
    }

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
        return handleReadError(error?.message ?? "chunk 조회 실패");
    }

    const rows = chunks as PostContentChunkRow[];
    if (rows.length !== activeRevision.chunk_count) {
        return handleReadError(
            `chunk count mismatch: ${rows.length}/${activeRevision.chunk_count}`
        );
    }

    if (options?.strict) {
        for (let index = 0; index < rows.length; index += 1) {
            const chunk = rows[index];
            if (chunk.chunk_index !== index) {
                return handleReadError("chunk index mismatch");
            }
            if (sha256Hex(chunk.content) !== chunk.checksum) {
                return handleReadError("chunk checksum mismatch");
            }
        }
    }

    const content = rows.map((chunk) => chunk.content).join("");
    if (sha256Hex(content) !== activeRevision.content_hash) {
        return handleReadError("content hash mismatch");
    }

    return { content, storageMode: "chunked" };
}
