import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminSession } from "@/lib/server-admin";
import { unscopedServerClient } from "@/lib/supabase";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { assertSafeR2Key } from "@/lib/r2-path-policy";
import {
    buildOrirekiExport,
    ORIREKI_TABLES,
    type ExportRow,
} from "@/lib/orireki-export";
import { version } from "../../../../package.json";

export const runtime = "nodejs";

// 관리자 세션과 읽기 전용 조회를 통한 이전 ZIP 응답
export const GET = async () => {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { error: "관리자 인증 필요" },
            { status: 401 }
        );
    }
    if (!unscopedServerClient)
        return NextResponse.json({ error: "DB 연결 필요" }, { status: 503 });
    const client = unscopedServerClient;
    try {
        const tables: Record<string, ExportRow[]> = {};
        // 복합 식별자 순서 고정으로 언어별 행의 페이지 누락 방지
        const readRows = async (table: string): Promise<ExportRow[]> => {
            const rows: ExportRow[] = [];
            const baseTable = table.replace(/_i18n$/, "");
            for (let offset = 0; ; offset += 500) {
                let query = client.from(table).select("*");
                if (table.endsWith("_i18n") || table === "resume_data")
                    query = query.order("lang");
                if (baseTable === "post_content_chunks") {
                    query = query.order("revision_id").order("chunk_index");
                } else {
                    query = query.order(
                        baseTable === "tags"
                            ? "slug"
                            : baseTable === "post_categories"
                              ? "name"
                              : baseTable === "site_config"
                                ? "key"
                                : "id"
                    );
                }
                const { data, error } = await query.range(offset, offset + 499);
                if (error) throw new Error(`${table} 조회 실패`);
                rows.push(...(data ?? []));
                if (!data || data.length < 500) break;
                if (rows.length >= 10000)
                    throw new Error(`${table} 10000행 제한 초과`);
            }
            return rows;
        };
        for (const table of ORIREKI_TABLES) {
            tables[table] = await readRows(table);
        }
        const config = [
            ...(await readRows("site_config")),
            ...(await readRows("site_config_i18n")),
        ];
        const mediaByKey = new Map<
            string,
            Promise<{ bytes: Uint8Array; mimeType: string }>
        >();
        const bytes = await buildOrirekiExport(
            tables,
            config,
            async (url) => {
                if (!R2_PUBLIC_URL) return null;
                const source = new URL(url);
                const allowed = new URL(
                    R2_PUBLIC_URL.endsWith("/")
                        ? R2_PUBLIC_URL
                        : `${R2_PUBLIC_URL}/`
                );
                if (
                    source.origin !== allowed.origin ||
                    !source.pathname.startsWith(allowed.pathname)
                )
                    return null;
                const key = decodeURIComponent(
                    source.pathname.slice(allowed.pathname.length)
                );
                assertSafeR2Key(key, "export");
                if (!mediaByKey.has(key)) {
                    mediaByKey.set(
                        key,
                        (async () => {
                            const result = await r2Client.send(
                                new GetObjectCommand({
                                    Bucket: R2_BUCKET,
                                    Key: key,
                                }),
                                { abortSignal: AbortSignal.timeout(15000) }
                            );
                            if (
                                (result.ContentLength ?? Infinity) >
                                    20 * 1024 * 1024 ||
                                !result.Body
                            )
                                throw new Error("파일 크기 제한");
                            return {
                                bytes: await result.Body.transformToByteArray(),
                                mimeType:
                                    result.ContentType ??
                                    "application/octet-stream",
                            };
                        })()
                    );
                }
                return (await mediaByKey.get(key)) ?? null;
            },
            version
        );
        return new Response(new Uint8Array(bytes), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition":
                    'attachment; filename="portarefolium-orireki.zip"',
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error(
            "[orireki-export::GET]",
            error instanceof Error ? error.message : "내보내기 실패"
        );
        return NextResponse.json(
            {
                error: "이전 파일 생성 실패. 서버 로그에서 실패한 자료 확인 필요.",
            },
            { status: 500 }
        );
    }
};
