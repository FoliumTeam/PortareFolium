import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { assertSafeAdminMutationRequest } from "@/lib/admin-mutation-origin";
import { requireAdminSession } from "@/lib/server-admin";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import {
    MAX_UPLOAD_BYTES,
    R2PathPolicyError,
    assertSafeR2Key,
    resolveImageContentType,
} from "@/lib/r2-path-policy";

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
        return NextResponse.json({ error: "file, path 필수" }, { status: 400 });
    }

    try {
        assertSafeR2Key(path, "path");
    } catch (err) {
        const message =
            err instanceof R2PathPolicyError ? err.message : "잘못된 경로";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
            { error: `파일 크기 한도 초과 (${MAX_UPLOAD_BYTES} bytes)` },
            { status: 413 }
        );
    }

    const contentType = resolveImageContentType(path);
    if (!contentType) {
        return NextResponse.json(
            { error: "허용되지 않은 파일 확장자" },
            { status: 400 }
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // UUID 파일명 = immutable asset으로 1년 cache + immutable directive
    // Cloudflare edge cache hit ratio 최상향 → R2 Class B op 호출 회수 최소화
    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: path,
            Body: buffer,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    );

    return NextResponse.json({ url: `${R2_PUBLIC_URL}/${path}` });
}
