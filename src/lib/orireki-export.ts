import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";

export type ExportRow = Record<string, unknown>;
export const ORIREKI_TABLES = [
    "about_data",
    "resume_data",
    "posts",
    "portfolio_items",
    "books",
    "tags",
    "post_categories",
    "gantt_chart_archives",
] as const;
export const ORIREKI_CONFIG_KEYS = [
    "header_name",
    "color_scheme",
    "theme_mode",
    "site_name",
    "seo_config",
    "plain_mode",
    "job_fields",
    "resume_layout",
    "resume_sections",
    "footer_config",
    "navigation_config",
];
type Media = { bytes: Uint8Array; mimeType: string };

// 인증·운영 테이블을 제외한 사용자 자료의 버전별 이전 묶음 생성
export const buildOrirekiExport = async (
    tables: Record<string, ExportRow[]>,
    config: ExportRow[],
    loadMedia: (url: string) => Promise<Media | null>,
    sourceVersion: string
) => {
    const contents: Record<string, unknown>[] = [];
    const preserved: Record<string, unknown> = {};
    const warnings: string[] = [];
    const files: Record<string, Uint8Array> = {};
    const kinds: Record<string, string> = {
        about_data: "about",
        resume_data: "resume",
        posts: "blog",
        portfolio_items: "portfolio",
    };
    for (const table of ORIREKI_TABLES) {
        const rows = tables[table] ?? [];
        preserved[table] = rows;
        if (!kinds[table]) continue;
        rows.forEach((row, index) => {
            contents.push({
                sourceId: String(row.id ?? `${table}-${index}`),
                kind: kinds[table],
                title: String(
                    row.title ??
                        row.name ??
                        (table === "resume_data"
                            ? "이전한 이력서"
                            : "이전한 소개")
                ),
                slug: String(row.slug ?? `${kinds[table]}-${index}`),
                description: String(row.description ?? ""),
                body: row.content ?? row.data ?? "",
                contentFormat:
                    typeof row.content === "string"
                        ? "mdx"
                        : "portarefolium-json",
                original: row,
            });
        });
    }
    const settings = Object.fromEntries(
        config
            .filter((row) => ORIREKI_CONFIG_KEYS.includes(String(row.key)))
            .map((row) => [String(row.key), row.value])
    );
    const text = JSON.stringify({ contents, preserved, settings });
    if (Buffer.byteLength(text) > 15 * 1024 * 1024)
        throw new Error("본문이 15MB를 초과하여 파일을 나누어 이전 필요");
    const urls = [...new Set(text.match(/https?:\/\/[^\s"<>\\)]+/g) ?? [])];
    const assets: {
        path: string;
        sourceUrl: string;
        mimeType: string;
        sha256: string;
    }[] = [];
    let total = 0;
    for (const url of urls) {
        try {
            const media = await loadMedia(url);
            if (!media) {
                if (/\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i.test(url))
                    warnings.push(`외부 이미지 파일 미포함, 링크 보존: ${url}`);
                continue;
            }
            total += media.bytes.length;
            if (total > 75 * 1024 * 1024)
                throw new Error("미디어 합계 75MB 제한");
            const digest = createHash("sha256")
                .update(media.bytes)
                .digest("hex");
            const path = `assets/${digest}`;
            files[path] = media.bytes;
            assets.push({
                path,
                sourceUrl: url,
                mimeType: media.mimeType,
                sha256: digest,
            });
        } catch {
            warnings.push(`파일 포함 실패: ${url}`);
        }
    }
    warnings.push(
        "외부 링크·영상은 링크 유지. 특수 MDX·도서·간트 원본 보존, 새 서비스 지원 범위에서 변환."
    );
    const manifest = {
        format: "orireki-transfer",
        version: 1,
        sourceVersion,
        exportedAt: new Date().toISOString(),
        contents,
        settings,
        assets,
        warnings,
        preserved,
    };
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    return zipSync(files, { level: 3 });
};
