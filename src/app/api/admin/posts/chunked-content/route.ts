import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import { revalidatePost } from "@/app/admin/actions/revalidate";
import { readPostContentById, sha256Hex } from "@/lib/post-content-chunks";

const POST_SELECT_FIELDS =
    "id, slug, title, description, pub_date, category, tags, job_field, thumbnail, content, published, updated_at, meta_title, meta_description, og_image";
const MAX_CHUNK_BYTES = 512 * 1024;

type PostPayload = {
    slug: string;
    title: string;
    description: string | null;
    pub_date: string;
    category: string | null;
    tags: string[];
    job_field: string[] | null;
    thumbnail: string | null;
    content: string;
    published: boolean;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type InitBody = {
    action: "init";
    payload: PostPayload;
    editTargetId?: string | null;
    contentHash: string;
    contentSize: number;
    chunkSize: number;
    chunkCount: number;
};

type ChunkBody = {
    action: "chunk";
    revisionId: string;
    chunkIndex: number;
    content: string;
    checksum: string;
};

type CommitBody = {
    action: "commit";
    revisionId: string;
};

type ChunkedContentBody = InitBody | ChunkBody | CommitBody;

type PostRow = PostPayload & {
    id: string;
    updated_at: string;
};

type RevisionRow = {
    id: string;
    post_id: string;
    content_hash: string;
    content_size: number;
    chunk_size: number;
    chunk_count: number;
    active: boolean;
    status: string;
};

function jsonError(message: string, status: number) {
    return NextResponse.json({ success: false, error: message }, { status });
}

async function assertAdmin() {
    try {
        await requireAdminSession();
        return null;
    } catch {
        return jsonError("인증 필요", 401);
    }
}

function validateInitBody(body: InitBody): string | null {
    if (!body.payload?.slug || !body.payload.title) return "title, slug 필수";
    if (!body.contentHash || body.contentHash.length !== 64) {
        return "contentHash 형식 오류";
    }
    if (!Number.isInteger(body.chunkCount) || body.chunkCount < 1) {
        return "chunkCount 형식 오류";
    }
    if (!Number.isInteger(body.chunkSize) || body.chunkSize > MAX_CHUNK_BYTES) {
        return "chunkSize 한도 초과";
    }
    return null;
}

async function handleInit(body: InitBody) {
    const validationError = validateInitBody(body);
    if (validationError) return jsonError(validationError, 400);
    if (!serverClient) return jsonError("serverClient 없음", 500);

    const { content: _content, ...metadataPayload } = body.payload;
    const payload = body.editTargetId
        ? metadataPayload
        : { ...metadataPayload, content: "" };

    if (body.editTargetId) {
        const { error } = await serverClient
            .from("posts")
            .update(payload)
            .eq("id", body.editTargetId);
        if (error) return jsonError(error.message, 500);
    } else {
        const { error } = await serverClient.from("posts").insert(payload);
        if (error) return jsonError(error.message, 500);
    }

    const { data: post, error: postError } = await serverClient
        .from("posts")
        .select(POST_SELECT_FIELDS)
        .eq("slug", body.payload.slug)
        .single();

    if (postError || !post) {
        return jsonError(postError?.message ?? "저장 후 포스트 조회 실패", 500);
    }

    const savedPost = post as PostRow;
    await serverClient
        .from("post_content_revisions")
        .delete()
        .eq("post_id", savedPost.id)
        .eq("status", "pending");

    const revisionId = randomUUID();
    const { error: revisionError } = await serverClient
        .from("post_content_revisions")
        .insert({
            id: revisionId,
            post_id: savedPost.id,
            content_hash: body.contentHash,
            content_size: body.contentSize,
            chunk_size: body.chunkSize,
            chunk_count: body.chunkCount,
            status: "pending",
            active: false,
        });

    if (revisionError) return jsonError(revisionError.message, 500);

    return NextResponse.json({
        success: true,
        revisionId,
        post: { ...savedPost, content: savedPost.content ?? "" },
    });
}

async function handleChunk(body: ChunkBody) {
    if (!serverClient) return jsonError("serverClient 없음", 500);
    if (!body.revisionId || !Number.isInteger(body.chunkIndex)) {
        return jsonError("revisionId, chunkIndex 필수", 400);
    }

    const contentSize = new Blob([body.content]).size;
    if (contentSize > MAX_CHUNK_BYTES) return jsonError("chunk 크기 초과", 413);
    if (sha256Hex(body.content) !== body.checksum) {
        return jsonError("chunk checksum 불일치", 400);
    }

    const { data: revision } = await serverClient
        .from("post_content_revisions")
        .select(
            "id, post_id, content_hash, content_size, chunk_size, chunk_count, active, status"
        )
        .eq("id", body.revisionId)
        .eq("status", "pending")
        .maybeSingle();

    const pendingRevision = revision as RevisionRow | null;
    if (!pendingRevision) return jsonError("pending revision 없음", 404);
    if (body.chunkIndex < 0 || body.chunkIndex >= pendingRevision.chunk_count) {
        return jsonError("chunkIndex 범위 오류", 400);
    }

    await serverClient
        .from("post_content_chunks")
        .delete()
        .eq("revision_id", body.revisionId)
        .eq("chunk_index", body.chunkIndex);

    const { error } = await serverClient.from("post_content_chunks").insert({
        revision_id: body.revisionId,
        chunk_index: body.chunkIndex,
        content: body.content,
        checksum: body.checksum,
    });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
}

async function handleCommit(body: CommitBody) {
    if (!serverClient) return jsonError("serverClient 없음", 500);
    if (!body.revisionId) return jsonError("revisionId 필수", 400);

    const { data: revision } = await serverClient
        .from("post_content_revisions")
        .select(
            "id, post_id, content_hash, content_size, chunk_size, chunk_count, active, status"
        )
        .eq("id", body.revisionId)
        .eq("status", "pending")
        .maybeSingle();

    const pendingRevision = revision as RevisionRow | null;
    if (!pendingRevision) return jsonError("pending revision 없음", 404);

    const { data: chunks } = await serverClient
        .from("post_content_chunks")
        .select("chunk_index, content, checksum")
        .eq("revision_id", body.revisionId)
        .order("chunk_index", { ascending: true });

    const rows =
        (chunks as
            | { chunk_index: number; content: string; checksum: string }[]
            | null) ?? [];
    if (rows.length !== pendingRevision.chunk_count) {
        return jsonError("chunk 누락", 409);
    }

    const content = rows.map((chunk) => chunk.content).join("");
    if (sha256Hex(content) !== pendingRevision.content_hash) {
        return jsonError("content checksum 불일치", 409);
    }

    const { error: commitError } = await serverClient
        .from("post_content_revisions")
        .update({
            status: "committed",
            active: true,
            committed_at: new Date().toISOString(),
        })
        .eq("id", body.revisionId);

    if (commitError) return jsonError(commitError.message, 500);

    const { error: deactivateError } = await serverClient
        .from("post_content_revisions")
        .update({ active: false })
        .eq("post_id", pendingRevision.post_id)
        .eq("active", true)
        .neq("id", body.revisionId);

    if (deactivateError) {
        console.error(
            `[chunked-content/route.ts::handleCommit] ${deactivateError.message}`
        );
    }

    const { data: post, error: postError } = await serverClient
        .from("posts")
        .select(POST_SELECT_FIELDS)
        .eq("id", pendingRevision.post_id)
        .single();

    if (postError || !post) {
        return jsonError(postError?.message ?? "포스트 조회 실패", 500);
    }

    const savedPost = post as PostRow;
    await revalidatePost(savedPost.slug);
    return NextResponse.json({
        success: true,
        post: { ...savedPost, content },
        storageMode: "chunked",
    });
}

export async function GET(req: NextRequest) {
    const authError = await assertAdmin();
    if (authError) return authError;
    if (!serverClient) return jsonError("serverClient 없음", 500);

    const postId = req.nextUrl.searchParams.get("postId");
    if (!postId) return jsonError("postId 필수", 400);

    const { data: post, error } = await serverClient
        .from("posts")
        .select("id, content")
        .eq("id", postId)
        .single();

    if (error || !post) return jsonError(error?.message ?? "post 없음", 404);

    const result = await readPostContentById(
        postId,
        typeof post.content === "string" ? post.content : ""
    );
    return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
    const authError = await assertAdmin();
    if (authError) return authError;

    const body = (await req.json()) as ChunkedContentBody;
    if (body.action === "init") return handleInit(body);
    if (body.action === "chunk") return handleChunk(body);
    if (body.action === "commit") return handleCommit(body);
    return jsonError("알 수 없는 action", 400);
}
