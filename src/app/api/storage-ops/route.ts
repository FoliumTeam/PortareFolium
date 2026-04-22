import { NextRequest, NextResponse } from "next/server";
import {
    ListObjectsV2Command,
    CopyObjectCommand,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { r2Client, R2_BUCKET } from "@/lib/r2";

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
    const session = await auth();
    if (!isAdminSession(session)) {
        return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    if (action === "list") {
        const files = await listFiles(body.prefix);
        return NextResponse.json({ files });
    }

    if (action === "move") {
        await moveFolder(body.oldPrefix, body.newPrefix);
        return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
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
