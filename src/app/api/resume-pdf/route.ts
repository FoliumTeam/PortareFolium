import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminSession } from "@/lib/server-admin";
import { unscopedServerClient } from "@/lib/supabase";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { assertSafeR2Key } from "@/lib/r2-path-policy";
import { generateResumePdf, todayInSeoul } from "@/lib/resume-pdf/generate";
import { loadJobFieldSource, loadProfileSource } from "@/lib/resume-pdf/load";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import type { PdfLang, PdfVariant } from "@/types/resume-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// 같은 관리자 연속 요청 대기 (Vercel 무료 CPU 보호)
const COOLDOWN_MS = 10_000;
const MAX_BODY_BYTES = 64 * 1024;
const lastRequest = new Map<string, number>();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
    sourceKind: "job_field" | "application_profile";
    jobField?: string;
    applicationProfileId?: string;
    lang: PdfLang;
    variant: PdfVariant;
    options?: unknown;
};

const parseBody = (raw: unknown): Body | null => {
    if (!raw || typeof raw !== "object") return null;
    const b = raw as Record<string, unknown>;
    if (b.lang !== "ko" && b.lang !== "ja") return null;
    if (b.variant !== "C" && b.variant !== "F") return null;
    if (b.sourceKind === "job_field") {
        if (
            typeof b.jobField !== "string" ||
            !/^[A-Za-z0-9_-]{1,64}$/.test(b.jobField)
        )
            return null;
    } else if (b.sourceKind === "application_profile") {
        if (
            typeof b.applicationProfileId !== "string" ||
            !UUID.test(b.applicationProfileId)
        )
            return null;
    } else return null;
    return b as unknown as Body;
};

const json = (body: unknown, status: number) =>
    NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "private, no-store" },
    });

// R2 저장소 직접 읽기 (공개 주소 아래 key만)
const readR2 = async (key: string) => {
    assertSafeR2Key(key, "export");
    const result = await r2Client.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        {
            abortSignal: AbortSignal.timeout(10_000),
        }
    );
    if (!result.Body || (result.ContentLength ?? Infinity) > 10 * 1024 * 1024)
        return null;
    return {
        bytes: await result.Body.transformToByteArray(),
        mimeType: result.ContentType ?? "application/octet-stream",
    };
};

// 관리자 전용 이력서 PDF 생성
export const POST = async (request: Request) => {
    let session;
    try {
        session = await requireAdminSession();
    } catch {
        return json({ error: "관리자 인증 필요" }, 401);
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES)
        return json({ error: "요청이 너무 큼" }, 413);
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return json({ error: "잘못된 요청" }, 400);
    }
    const body = parseBody(raw);
    if (!body) return json({ error: "잘못된 요청" }, 400);
    if (!unscopedServerClient) return json({ error: "DB 연결 필요" }, 503);

    const who = session?.user?.email ?? "admin";
    const now = Date.now();
    const last = lastRequest.get(who) ?? 0;
    if (now - last < COOLDOWN_MS) {
        const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
        return NextResponse.json(
            { error: `${wait}초 뒤 다시 시도` },
            {
                status: 429,
                headers: {
                    "Retry-After": String(wait),
                    "Cache-Control": "private, no-store",
                },
            }
        );
    }
    lastRequest.set(who, now);

    try {
        const loaded =
            body.sourceKind === "job_field"
                ? await loadJobFieldSource(
                      unscopedServerClient,
                      body.lang,
                      body.jobField!
                  )
                : await loadProfileSource(
                      unscopedServerClient,
                      body.lang,
                      body.applicationProfileId!
                  );
        if (!loaded) return json({ error: "지원 프로필 없음" }, 404);
        const result = await generateResumePdf({
            source: loaded.source,
            options: normalizePdfOptions(body.options),
            variant: body.variant,
            asOf: todayInSeoul(),
            koName: loaded.koName,
            r2PublicUrl: R2_PUBLIC_URL,
            readR2,
        });
        if (!result.ok)
            return json(
                {
                    error: "PDF 검사 실패",
                    failures: result.failures,
                    warnings: result.warnings,
                },
                422
            );
        return new Response(result.pdf.slice().buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="resume-${body.lang}-${body.variant.toLowerCase()}.pdf"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "X-Resume-Pdf-Pages": String(result.pages),
                "X-Resume-Pdf-Warnings": encodeURIComponent(
                    JSON.stringify(result.warnings)
                ),
            },
        });
    } catch (error) {
        console.error(
            "[resume-pdf::POST]",
            error instanceof Error ? error.message : "생성 실패"
        );
        return json({ error: "PDF 생성 실패. 서버 로그 확인 필요." }, 500);
    }
};
