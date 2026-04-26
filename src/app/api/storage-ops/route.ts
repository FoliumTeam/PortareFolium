import { NextRequest, NextResponse } from "next/server";
import {
    ListObjectsV2Command,
    CopyObjectCommand,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { assertSafeAdminMutationRequest } from "@/lib/admin-mutation-origin";
import { requireAdminSession } from "@/lib/server-admin";
import { r2Client, R2_BUCKET } from "@/lib/r2";
import {
    R2PathPolicyError,
    assertSafeR2Key,
    assertSafeR2Prefix,
} from "@/lib/r2-path-policy";

// policy 위반 시 400 응답 헬퍼
function policyErrorResponse(err: unknown) {
    const message =
        err instanceof R2PathPolicyError ? err.message : "잘못된 경로";
    return NextResponse.json({ error: message }, { status: 400 });
}

// R2 prefix 하위 파일 목록
async function listFiles(prefix: string): Promise<string[]> {
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const result = await r2Client.send(
        new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: normalizedPrefix,
        })
    );
    return (result.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
}

// 폴더 이동 (copy + delete)
async function moveFolder(oldPrefix: string, newPrefix: string) {
    const files = await listFiles(oldPrefix);
    if (files.length === 0) return;

    for (const key of files) {
        const fileName = key.split("/").pop()!;
        const newKey = `${newPrefix}/${fileName}`;
        await r2Client.send(
            new CopyObjectCommand({
                Bucket: R2_BUCKET,
                CopySource: `${R2_BUCKET}/${key}`,
                Key: newKey,
            })
        );
    }

    // copy 완료 후 원본 삭제
    await r2Client.send(
        new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
                Objects: files.map((key) => ({ Key: key })),
            },
        })
    );
}

// 폴더 삭제
async function deleteFolder(prefix: string) {
    const files = await listFiles(prefix);
    if (files.length === 0) return;

    await r2Client.send(
        new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
                Objects: files.map((key) => ({ Key: key })),
            },
        })
    );
}

export async function POST(req: NextRequest) {
    try {
        assertSafeAdminMutationRequest(req);
        await requireAdminSession();
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("mutation")) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    if (action === "list") {
        try {
            assertSafeR2Prefix(body.prefix, "prefix");
        } catch (err) {
            return policyErrorResponse(err);
        }
        const files = await listFiles(body.prefix);
        return NextResponse.json({ files });
    }

    if (action === "move") {
        try {
            assertSafeR2Prefix(body.oldPrefix, "oldPrefix");
            assertSafeR2Prefix(body.newPrefix, "newPrefix");
        } catch (err) {
            return policyErrorResponse(err);
        }
        await moveFolder(body.oldPrefix, body.newPrefix);
        return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
        try {
            assertSafeR2Prefix(body.prefix, "prefix");
        } catch (err) {
            return policyErrorResponse(err);
        }
        await deleteFolder(body.prefix);
        return NextResponse.json({ ok: true });
    }

    if (action === "delete-keys") {
        const keys = Array.isArray(body.keys)
            ? (body.keys as string[]).filter(
                  (k): k is string => typeof k === "string" && k.length > 0
              )
            : [];
        if (keys.length === 0) {
            return NextResponse.json({ ok: true, deleted: 0 });
        }
        try {
            for (const k of keys) assertSafeR2Key(k, "key");
        } catch (err) {
            return policyErrorResponse(err);
        }
        // S3 DeleteObjects 배치 한도 1000
        let deleted = 0;
        for (let i = 0; i < keys.length; i += 1000) {
            const chunk = keys.slice(i, i + 1000);
            await r2Client.send(
                new DeleteObjectsCommand({
                    Bucket: R2_BUCKET,
                    Delete: { Objects: chunk.map((Key) => ({ Key })) },
                })
            );
            deleted += chunk.length;
        }
        return NextResponse.json({ ok: true, deleted });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
