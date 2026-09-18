import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
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
});
