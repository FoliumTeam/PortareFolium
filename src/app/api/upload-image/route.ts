import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!isAdminSession(session)) {
        return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
        return NextResponse.json({ error: "file, path 필수" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // UUID 파일명 = immutable asset으로 1년 cache + immutable directive
    // Cloudflare edge cache hit ratio 최상향 → R2 Class B op 호출 회수 최소화
    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: path,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            CacheControl: "public, max-age=31536000, immutable",
        })
    );

    return NextResponse.json({ url: `${R2_PUBLIC_URL}/${path}` });
}
