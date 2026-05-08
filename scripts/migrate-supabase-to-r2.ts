// Supabase Storage → Cloudflare R2 파일 마이그레이션
// 실행: pnpm tsx scripts/migrate-supabase-to-r2.ts
// .env.local에 Supabase + R2 환경변수 필요

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const BUCKET = "images";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET = process.env.R2_BUCKET ?? "gvm1229-portfolio-images";

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase URL 또는 secret key 환경변수 누락");
    process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("R2 환경변수 누락");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// Supabase Storage 재귀 탐색
async function listAllFiles(prefix: string = ""): Promise<string[]> {
    const paths: string[] = [];
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: 1000,
    });
    if (error) {
        console.error(`[list] ${prefix}: ${error.message}`);
        return paths;
    }
    for (const item of data ?? []) {
        if (item.name.startsWith(".")) continue;
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        // metadata가 null이면 폴더
        if (!item.metadata) {
            const sub = await listAllFiles(fullPath);
            paths.push(...sub);
        } else {
            paths.push(fullPath);
        }
    }
    return paths;
}

// content-type 추론
function inferContentType(path: string): string {
    if (path.endsWith(".webp")) return "image/webp";
    if (path.endsWith(".gif")) return "image/gif";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
}

async function migrate() {
    console.log("Supabase Storage 파일 목록 조회 중...");
    const files = await listAllFiles();
    console.log(`총 ${files.length}개 파일 발견\n`);

    if (files.length === 0) {
        console.log("마이그레이션할 파일 없음");
        return;
    }

    const failed: string[] = [];
    let done = 0;

    for (const filePath of files) {
        try {
            // Supabase에서 다운로드
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .download(filePath);
            if (error || !data) {
                throw new Error(error?.message ?? "다운로드 실패");
            }

            // R2에 업로드
            const buffer = Buffer.from(await data.arrayBuffer());
            await r2.send(
                new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: filePath,
                    Body: buffer,
                    ContentType: inferContentType(filePath),
                })
            );

            done++;
            console.log(`[${done}/${files.length}] ${filePath}`);
        } catch (err) {
            failed.push(filePath);
            console.error(
                `[FAIL] ${filePath}: ${err instanceof Error ? err.message : err}`
            );
        }
    }

    console.log(`\n완료: ${done}/${files.length} 성공`);
    if (failed.length > 0) {
        console.error(
            `실패 목록:\n${failed.map((f) => `  - ${f}`).join("\n")}`
        );
    }
}

migrate().catch(console.error);
