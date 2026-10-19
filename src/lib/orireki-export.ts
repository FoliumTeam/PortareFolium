import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n";

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
    "editor_states",
    "post_content_revisions",
    "post_content_chunks",
    "about_data_i18n",
    "posts_i18n",
    "portfolio_items_i18n",
    "books_i18n",
    "tags_i18n",
    "post_categories_i18n",
    "editor_states_i18n",
    "post_content_revisions_i18n",
    "post_content_chunks_i18n",
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

// 같은 식별자를 가진 번역의 수정 이력과 조각 분리
const readExportPostContent = (
    tables: Record<string, ExportRow[]>,
    table: string,
    row: ExportRow,
    lang: Locale,
    warnings: string[]
): string => {
    const fallback = typeof row.content === "string" ? row.content : "";
    const suffix = table.endsWith("_i18n") ? "_i18n" : "";
    const revision = (tables[`post_content_revisions${suffix}`] ?? [])
        .filter(
            (candidate) =>
                candidate.post_id === row.id &&
                candidate.active === true &&
                candidate.status === "committed" &&
                (!suffix || candidate.lang === lang)
        )
        .sort((a, b) =>
            String(b.committed_at ?? "").localeCompare(
                String(a.committed_at ?? "")
            )
        )[0];
    if (!revision) return fallback;
    const chunks = (tables[`post_content_chunks${suffix}`] ?? [])
        .filter(
            (chunk) =>
                chunk.revision_id === revision.id &&
                (!suffix || chunk.lang === lang)
        )
        .sort((a, b) => Number(a.chunk_index) - Number(b.chunk_index));
    const content = chunks.map((chunk) => String(chunk.content ?? "")).join("");
    if (
        chunks.length !== revision.chunk_count ||
        chunks.some((chunk, index) => chunk.chunk_index !== index) ||
        createHash("sha256").update(content, "utf8").digest("hex") !==
            revision.content_hash
    ) {
        warnings.push(`분할 본문 검증 실패, 원본 조각 보존: ${lang}:${row.id}`);
        return fallback;
    }
    return content;
};

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
        const baseTable = table.replace(/_i18n$/, "");
        if (!kinds[baseTable]) continue;
        rows.forEach((row, index) => {
            const lang = isLocale(row.lang) ? row.lang : "ko";
            const sourceId = String(row.id ?? `${baseTable}-${index}`);
            contents.push({
                sourceId: lang === "ko" ? sourceId : `${lang}:${sourceId}`,
                lang,
                kind: kinds[baseTable],
                title: String(
                    row.title ??
                        row.name ??
                        (baseTable === "resume_data"
                            ? "이전한 이력서"
                            : "이전한 소개")
                ),
                slug: String(row.slug ?? `${kinds[baseTable]}-${index}`),
                description: String(row.description ?? ""),
                body:
                    baseTable === "posts"
                        ? readExportPostContent(
                              tables,
                              table,
                              row,
                              lang,
                              warnings
                          )
                        : (row.content ?? row.data ?? ""),
                contentFormat:
                    typeof row.content === "string"
                        ? "mdx"
                        : "portarefolium-json",
                original: row,
            });
        });
    }
    const settingsByLanguage = Object.fromEntries(
        LOCALES.map((lang) => [
            lang,
            Object.fromEntries(
                config
                    .filter(
                        (row) =>
                            (row.lang ?? "ko") === lang &&
                            ORIREKI_CONFIG_KEYS.includes(String(row.key))
                    )
                    .map((row) => [String(row.key), row.value])
            ),
        ])
    );
    const settings = settingsByLanguage.ko;
    // 언어·비공개 상태를 버리는 구형 가져오기의 잘못된 공개 방지
    const requiresLanguageAwareImport =
        Object.entries(tables).some(
            ([table, rows]) =>
                ORIREKI_TABLES.includes(
                    table as (typeof ORIREKI_TABLES)[number]
                ) &&
                rows.some(
                    (row) =>
                        table.endsWith("_i18n") ||
                        (isLocale(row.lang) && row.lang !== "ko") ||
                        row.published === false
                )
        ) || config.some((row) => isLocale(row.lang) && row.lang !== "ko");
    const text = JSON.stringify({
        contents,
        preserved,
        settings,
        settingsByLanguage,
    });
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
    const mediaByUrl = new Map<string, Promise<Media | null>>();
    for (const url of urls) {
        try {
            const source = new URL(url);
            source.hash = "";
            const mediaUrl = source.toString();
            if (!mediaByUrl.has(mediaUrl))
                mediaByUrl.set(mediaUrl, loadMedia(mediaUrl));
            const media = await mediaByUrl.get(mediaUrl);
            if (!media) {
                if (/\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i.test(url))
                    warnings.push(`외부 이미지 파일 미포함, 링크 보존: ${url}`);
                continue;
            }
            const digest = createHash("sha256")
                .update(media.bytes)
                .digest("hex");
            const path = `assets/${digest}`;
            if (!files[path]) {
                if (total + media.bytes.length > 75 * 1024 * 1024)
                    throw new Error("미디어 합계 75MB 제한");
                total += media.bytes.length;
                files[path] = media.bytes;
            }
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
    if (requiresLanguageAwareImport)
        warnings.push(
            "형식 2: 언어·비공개 상태 보존 지원 도구에서만 가져오기 가능. 구형 Orireki 형식 1 가져오기 미지원."
        );
    const manifest = {
        format: "orireki-transfer",
        version: requiresLanguageAwareImport ? 2 : 1,
        sourceVersion,
        exportedAt: new Date().toISOString(),
        contents,
        settings,
        settingsByLanguage,
        assets,
        warnings,
        preserved,
    };
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    return zipSync(files, { level: 3 });
};
