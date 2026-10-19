import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, strToU8, unzipSync } from "fflate";
import { ORIREKI_TABLES, type ExportRow } from "@/lib/orireki-export";
const gate = vi.hoisted(() => ({ requireAdminSession: vi.fn() }));
const db = vi.hoisted(() => ({
    client: null as object | null,
    from: vi.fn(),
    scopedFrom: vi.fn(),
    media: vi.fn(),
}));
vi.mock("@/lib/server-admin", () => gate);
vi.mock("@/lib/supabase", () => ({
    get unscopedServerClient() {
        return db.client;
    },
    serverClient: { from: db.scopedFrom },
}));
vi.mock("@/lib/r2", () => ({
    r2Client: { send: db.media },
    R2_BUCKET: "test",
    R2_PUBLIC_URL: "https://media.example/",
}));
import { GET } from "@/app/api/orireki-export/route";

const connect = (tables: Record<string, ExportRow[]>) => {
    db.from.mockImplementation((table: string) => {
        const query = {
            select: vi.fn(() => query),
            order: vi.fn(() => query),
            range: vi.fn(async (start: number, end: number) => ({
                data: (tables[table] ?? []).slice(start, end + 1),
                error: null,
            })),
        };
        return query;
    });
    db.client = { from: db.from };
};

describe("이전 다운로드 권한", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.client = null;
        gate.requireAdminSession.mockResolvedValue({});
    });
    it("관리자 세션 없는 요청 거부", async () => {
        connect({});
        gate.requireAdminSession.mockRejectedValueOnce(new Error("denied"));
        const response = await GET();
        expect(response.status).toBe(401);
        expect(db.from).not.toHaveBeenCalled();
    });
    it("관리자 인증 뒤 DB 미설정을 별도 보고", async () => {
        gate.requireAdminSession.mockResolvedValueOnce({});
        const response = await GET();
        expect(response.status).toBe(503);
    });

    it("요청 언어 필터 없이 모든 언어와 허용 설정을 내보내고 R2 중복 읽기 방지", async () => {
        connect({
            posts: [
                {
                    id: "same",
                    slug: "same",
                    content: "https://media.example/blog/image.png?ko",
                },
            ],
            posts_i18n: [
                {
                    id: "same",
                    slug: "same",
                    lang: "en",
                    content: "https://media.example/blog/image.png?en",
                },
                { id: "same", slug: "same", lang: "ja", content: "日本語" },
            ],
            site_config: [{ key: "site_name", value: "한국어" }],
            site_config_i18n: [
                { key: "site_name", lang: "en", value: "English" },
                { key: "secret", lang: "ja", value: "must-not-export" },
            ],
        });
        db.media.mockResolvedValue({
            ContentLength: 5,
            ContentType: "image/png",
            Body: { transformToByteArray: async () => strToU8("image") },
        });
        const response = await GET();
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
        const manifest = JSON.parse(strFromU8(files["manifest.json"]));
        expect(
            manifest.contents.map((row: { lang: string }) => row.lang)
        ).toEqual(["ko", "en", "ja"]);
        expect(manifest.settings.site_name).toBe("한국어");
        expect(manifest.settingsByLanguage.en.site_name).toBe("English");
        expect(JSON.stringify(manifest)).not.toContain("must-not-export");
        expect(db.from.mock.calls.map(([table]) => table)).toEqual([
            ...ORIREKI_TABLES,
            "site_config",
            "site_config_i18n",
        ]);
        expect(db.scopedFrom).not.toHaveBeenCalled();
        expect(db.media).toHaveBeenCalledOnce();
        expect(manifest.assets).toHaveLength(2);
    });

    it("번역 테이블 조회 실패 시 부분 ZIP 반환 거부", async () => {
        connect({});
        const original = db.from.getMockImplementation()!;
        db.from.mockImplementation((table: string) => {
            if (table !== "posts_i18n") return original(table);
            const query = {
                select: () => query,
                order: () => query,
                range: async () => ({
                    data: null,
                    error: { message: "unavailable" },
                }),
            };
            return query;
        });
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            expect((await GET()).status).toBe(500);
            expect(db.media).not.toHaveBeenCalled();
        } finally {
            log.mockRestore();
        }
    });
});
