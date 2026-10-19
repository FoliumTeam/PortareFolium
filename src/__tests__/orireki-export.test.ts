import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8, strToU8 } from "fflate";
import { buildOrirekiExport } from "@/lib/orireki-export";

describe("Orireki 이전 파일", () => {
    it("사용자 자료 보존과 비밀 설정·운영 테이블 제외", async () => {
        const bytes = await buildOrirekiExport(
            {
                posts: [{ id: "one", title: "한글 기록", content: "본문" }],
                books: [{ title: "원본 책" }],
                ai_agent_tokens: [{ token: "must-not-export" }],
            },
            [
                { key: "site_name", value: "나의 사이트" },
                { key: "secret", value: "must-not-export" },
            ],
            async () => null,
            "test"
        );
        const manifest = strFromU8(unzipSync(bytes)["manifest.json"]);
        expect(manifest).toContain("한글 기록");
        expect(manifest).toContain("원본 책");
        expect(manifest).not.toContain("must-not-export");
    });
    it("미디어 실패를 경고로 보존", async () => {
        const bytes = await buildOrirekiExport(
            { posts: [{ content: "https://example.com/file.png" }] },
            [],
            async () => {
                throw new Error("missing");
            },
            "test"
        );
        const manifest = JSON.parse(
            strFromU8(unzipSync(bytes)["manifest.json"])
        );
        expect(manifest.warnings[0]).toContain("파일 포함 실패");
    });

    it("같은 slug의 언어별 본문·공개 상태·수정 이력과 허용 설정 보존", async () => {
        const translations = [
            { lang: "en", body: "English content" },
            { lang: "ja", body: "日本語本文" },
        ];
        const bytes = await buildOrirekiExport(
            {
                posts: [
                    {
                        id: "shared",
                        slug: "same-slug",
                        content: "한국어 본문",
                        published: false,
                    },
                ],
                posts_i18n: translations.map(({ lang }) => ({
                    id: "shared",
                    lang,
                    slug: "same-slug",
                    content: "",
                    published: lang === "en",
                })),
                resume_data: ["ko", "en", "ja"].map((lang) => ({
                    id: "resume",
                    lang,
                    data: { name: lang },
                    published: false,
                })),
                post_content_revisions_i18n: translations.map(
                    ({ lang, body }) => ({
                        id: "same-revision",
                        post_id: "shared",
                        lang,
                        active: true,
                        status: "committed",
                        chunk_count: 2,
                        content_hash: createHash("sha256")
                            .update(body)
                            .digest("hex"),
                    })
                ),
                post_content_chunks_i18n: translations.flatMap(
                    ({ lang, body }) =>
                        [body.slice(0, 3), body.slice(3)].map(
                            (content, chunk_index) => ({
                                revision_id: "same-revision",
                                lang,
                                chunk_index,
                                content,
                            })
                        )
                ),
                editor_states_i18n: [
                    { id: "draft", lang: "ja", content: "編集中" },
                ],
            },
            [
                { key: "site_name", value: "한국어 설정" },
                { key: "site_name", lang: "en", value: "English setting" },
                { key: "site_name", lang: "ja", value: "日本語設定" },
                { key: "secret", lang: "en", value: "must-not-export" },
            ],
            async () => null,
            "test"
        );
        const manifest = JSON.parse(
            strFromU8(unzipSync(bytes)["manifest.json"])
        );
        expect(manifest.version).toBe(1);
        expect(
            manifest.contents.filter(
                (row: { kind: string }) => row.kind === "blog"
            )
        ).toEqual([
            expect.objectContaining({
                sourceId: "shared",
                lang: "ko",
                slug: "same-slug",
                body: "한국어 본문",
                original: expect.objectContaining({ published: false }),
            }),
            expect.objectContaining({
                sourceId: "en:shared",
                lang: "en",
                slug: "same-slug",
                body: "English content",
                original: expect.objectContaining({
                    published: true,
                    content: "",
                }),
            }),
            expect.objectContaining({
                sourceId: "ja:shared",
                lang: "ja",
                slug: "same-slug",
                body: "日本語本文",
                original: expect.objectContaining({ published: false }),
            }),
        ]);
        expect(
            manifest.contents.filter(
                (row: { kind: string }) => row.kind === "resume"
            )
        ).toHaveLength(3);
        expect(manifest.preserved.post_content_revisions_i18n).toHaveLength(2);
        expect(manifest.preserved.post_content_chunks_i18n).toHaveLength(4);
        expect(manifest.preserved.editor_states_i18n[0].content).toBe("編集中");
        expect(manifest.settings.site_name).toBe("한국어 설정");
        expect(manifest.settingsByLanguage.en.site_name).toBe(
            "English setting"
        );
        expect(manifest.settingsByLanguage.ja.site_name).toBe("日本語設定");
        expect(JSON.stringify(manifest)).not.toContain("must-not-export");
    });

    it("손상된 번역 본문은 경고와 원본 조각 보존", async () => {
        const chunks = [
            {
                revision_id: "revision",
                lang: "en",
                chunk_index: 0,
                content: "broken",
            },
        ];
        const bytes = await buildOrirekiExport(
            {
                posts_i18n: [{ id: "post", lang: "en", content: "fallback" }],
                post_content_revisions_i18n: [
                    {
                        id: "revision",
                        post_id: "post",
                        lang: "en",
                        active: true,
                        status: "committed",
                        chunk_count: 1,
                        content_hash: "invalid",
                    },
                ],
                post_content_chunks_i18n: chunks,
            },
            [],
            async () => null,
            "test"
        );
        const manifest = JSON.parse(
            strFromU8(unzipSync(bytes)["manifest.json"])
        );
        expect(manifest.contents[0].body).toBe("fallback");
        expect(manifest.warnings[0]).toContain("분할 본문 검증 실패");
        expect(manifest.preserved.post_content_chunks_i18n).toEqual(chunks);
    });

    it("언어별로 공유하는 미디어는 한 번 읽고 모든 원본 주소 보존", async () => {
        const loadMedia = vi.fn(async () => ({
            bytes: strToU8("image"),
            mimeType: "image/png",
        }));
        const bytes = await buildOrirekiExport(
            {
                posts: [{ content: "https://media.example/blog/image.png#ko" }],
                posts_i18n: [
                    {
                        lang: "en",
                        content: "https://media.example/blog/image.png#en",
                    },
                ],
            },
            [],
            loadMedia,
            "test"
        );
        const files = unzipSync(bytes);
        const manifest = JSON.parse(strFromU8(files["manifest.json"]));
        expect(loadMedia).toHaveBeenCalledOnce();
        expect(manifest.assets).toHaveLength(2);
        expect(
            new Set(
                manifest.assets.map((asset: { path: string }) => asset.path)
            ).size
        ).toBe(1);
        expect(
            Object.keys(files).filter((path) => path.startsWith("assets/"))
        ).toHaveLength(1);
    });
});
