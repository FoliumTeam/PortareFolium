import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireAdminSession: vi.fn(),
    loadJobFieldSource: vi.fn(),
    loadProfileSource: vi.fn(),
    generateResumePdf: vi.fn(),
}));

vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: mocks.requireAdminSession,
}));
vi.mock("@/lib/supabase", () => ({ unscopedServerClient: {} }));
vi.mock("@/lib/r2", () => ({
    r2Client: { send: vi.fn() },
    R2_BUCKET: "b",
    R2_PUBLIC_URL: "",
}));
vi.mock("@/lib/resume-pdf/load", () => ({
    loadJobFieldSource: mocks.loadJobFieldSource,
    loadProfileSource: mocks.loadProfileSource,
}));
vi.mock("@/lib/resume-pdf/generate", () => ({
    generateResumePdf: mocks.generateResumePdf,
    todayInSeoul: () => "2026-11-25",
}));

const post = (body: unknown) =>
    new Request("http://localhost/api/resume-pdf", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

const valid = {
    sourceKind: "job_field",
    jobField: "web",
    lang: "ja",
    variant: "F",
    options: {},
};
let user = 0;

beforeEach(() => {
    vi.clearAllMocks();
    // 대기 시간 분리: 시험마다 다른 관리자
    user += 1;
    mocks.requireAdminSession.mockResolvedValue({
        user: { email: `admin${user}@example.test` },
    });
    mocks.loadJobFieldSource.mockResolvedValue({
        source: { lang: "ja" },
        koName: "x",
    });
    mocks.generateResumePdf.mockResolvedValue({
        ok: true,
        pdf: new Uint8Array([37, 80, 68, 70]),
        pages: 5,
        warnings: [{ code: "missing-introduction", detail: "web" }],
    });
});

const { POST } = await import("@/app/api/resume-pdf/route");

describe("이력서 PDF route", () => {
    it("비관리자 401, 생성 안 함", async () => {
        mocks.requireAdminSession.mockRejectedValue(new Error("no"));
        expect((await POST(post(valid))).status).toBe(401);
        expect(mocks.generateResumePdf).not.toHaveBeenCalled();
    });

    it("잘못된 입력 400", async () => {
        for (const body of [
            "not json",
            { ...valid, lang: "en" },
            { ...valid, variant: "X" },
            { ...valid, jobField: "../x" },
            {
                sourceKind: "application_profile",
                applicationProfileId: "x",
                lang: "ko",
                variant: "C",
            },
            { ...valid, sourceKind: "other" },
        ]) {
            user += 1;
            mocks.requireAdminSession.mockResolvedValue({
                user: { email: `admin${user}@example.test` },
            });
            expect((await POST(post(body))).status).toBe(400);
        }
        expect(mocks.generateResumePdf).not.toHaveBeenCalled();
    });

    it("PDF 응답 헤더와 경고", async () => {
        const res = await POST(post(valid));
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/pdf");
        expect(res.headers.get("Cache-Control")).toBe("private, no-store");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(res.headers.get("X-Resume-Pdf-Pages")).toBe("5");
        expect(
            JSON.parse(
                decodeURIComponent(res.headers.get("X-Resume-Pdf-Warnings")!)
            )
        ).toEqual([{ code: "missing-introduction", detail: "web" }]);
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(
            new Uint8Array([37, 80, 68, 70])
        );
    });

    it("같은 관리자 연속 요청 429", async () => {
        expect((await POST(post(valid))).status).toBe(200);
        const again = await POST(post(valid));
        expect(again.status).toBe(429);
        expect(Number(again.headers.get("Retry-After"))).toBeGreaterThan(0);
    });

    it("관문 실패 422, PDF 없음", async () => {
        mocks.generateResumePdf.mockResolvedValue({
            ok: false,
            failures: [{ gate: "V3", detail: "x" }],
            warnings: [],
        });
        const res = await POST(post(valid));
        expect(res.status).toBe(422);
        expect((await res.json()).failures).toEqual([
            { gate: "V3", detail: "x" },
        ]);
    });

    it("지원 프로필 없음 404, 내부 오류 500", async () => {
        mocks.loadProfileSource.mockResolvedValue(null);
        const profile = {
            sourceKind: "application_profile",
            applicationProfileId: "11111111-1111-4111-8111-111111111111",
            lang: "ko",
            variant: "C",
        };
        expect((await POST(post(profile))).status).toBe(404);
        user += 1;
        mocks.requireAdminSession.mockResolvedValue({
            user: { email: `admin${user}@example.test` },
        });
        mocks.generateResumePdf.mockRejectedValue(new Error("chromium"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect((await POST(post(valid))).status).toBe(500);
    });
});
