import { describe, expect, it } from "vitest";
import {
    collectImageUrls,
    loadImages,
    r2KeyFromUrl,
} from "@/lib/resume-pdf/assets";
import { buildResumePdfModel } from "@/lib/resume-pdf/model";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import { buildJobFieldSource } from "@/lib/resume-pdf/source";
import {
    otherFieldStrings,
    verifyPdf,
    type DomFacts,
} from "@/lib/resume-pdf/verify";
import type { PdfLang } from "@/types/resume-pdf";
import {
    aboutRow,
    ASOF,
    configRows,
    portfolioRows,
    resumeRow,
} from "./resume-pdf-fixture";

const source = (lang: PdfLang = "ko") =>
    buildJobFieldSource({
        lang,
        jobField: "web",
        resume: resumeRow(),
        about: aboutRow(),
        portfolio: portfolioRows(),
        config: configRows(),
    });
const model = (lang: PdfLang = "ko") =>
    buildResumePdfModel(source(lang), normalizePdfOptions({}), ASOF);

const dom: DomFacts = {
    headings: ["경력", "기간", "업무 내용", "역할 · 환경"],
    keepSpans: [{ first: "Acme Engineer", last: "Did B text" }],
};

const run = (
    pages: string[][],
    over: Partial<Parameters<typeof verifyPdf>[0]> = {}
) =>
    verifyPdf({
        pages: pages.map((lines) => ({ lines })),
        dom,
        model: model(),
        source: source(),
        ...over,
    }).map((f) => f.gate);

describe("이력서 PDF 관문", () => {
    it("정상 입력은 0건", () => {
        expect(
            run([
                ["Intro", "Acme Engineer", "Did B text"],
                ["경력", "body"],
            ])
        ).toEqual([]);
    });

    it("V1: 쪽 끝 제목·표 머리글 행", () => {
        expect(run([["Acme Engineer Did B text", "경력"], ["x"]])).toEqual([
            "V1",
        ]);
        expect(
            run([
                ["Acme Engineer Did B text", "기간  업무 내용  역할 · 환경"],
                ["x"],
            ])
        ).toEqual(["V1"]);
        // 마지막 쪽은 제외
        expect(run([["Acme Engineer Did B text"], ["경력"]])).toEqual([]);
    });

    it("V2: 한 쪽 이하 묶음이 두 쪽에 걸침, 찾지 못하면 검사 불가", () => {
        expect(run([["Acme Engineer"], ["Did B text"]])).toEqual(["V2"]);
        expect(run([["nothing"], ["here"]])).toEqual(["V2"]);
        // 같은 문구가 앞쪽에도 있으면 함께 있는 쪽 기준
        expect(
            run([["Acme Engineer"], ["Acme Engineer", "Did B text"]])
        ).toEqual([]);
    });

    it("V3: 다른 직무 전용 데이터, 현재 직무와 겹치는 글자는 제외", () => {
        const leaks = otherFieldStrings(source());
        expect(leaks).toContain("Globex");
        expect(leaks).toContain("game-only title");
        expect(leaks).not.toContain("Acme");
        expect(run([["Acme Engineer Did B text", "Globex"]])).toEqual(["V3"]);
    });

    it("V4: ja에 한글", () => {
        const ja = { model: model("ja"), source: source("ja") };
        expect(run([["Acme Engineer Did B text"]], ja)).toEqual([]);
        expect(run([["Acme Engineer Did B text 경력"]], ja)).toEqual(["V4"]);
    });

    it("V5: ko 이름이 한글이면 ja 이름에 한자 금지 (D19)", () => {
        const m = model("ja");
        const ja = {
            source: source("ja"),
            model: { ...m, basics: { ...m.basics, name: "鄭 太郎" } },
        };
        expect(
            run([["Acme Engineer Did B text"]], { ...ja, koName: "정테스트" })
        ).toEqual(["V5"]);
        expect(
            run([["Acme Engineer Did B text"]], { ...ja, koName: "山田太郎" })
        ).toEqual([]);
    });

    it("쪽이 없으면 실패", () => {
        expect(run([])).toEqual(["V1"]);
    });
});

describe("이력서 PDF 그림", () => {
    const base = "https://pub.example.test";

    it("R2 공개 주소 아래만 key로 변환", () => {
        expect(r2KeyFromUrl(`${base}/resume/me.png`, base)).toBe(
            "resume/me.png"
        );
        expect(r2KeyFromUrl(`${base}/resume/a%20b.png`, `${base}/`)).toBe(
            "resume/a b.png"
        );
        expect(
            r2KeyFromUrl("https://evil.test/resume/me.png", base)
        ).toBeNull();
        expect(
            r2KeyFromUrl(`${base}/img/%2e%2e/secret.png`, `${base}/img`)
        ).toBeNull();
        expect(r2KeyFromUrl(`${base}/x.png`, "")).toBeNull();
    });

    it("그림 주소 수집과 대상 밖·실패 생략", async () => {
        expect(collectImageUrls(model())).toEqual([
            "https://img.example.test/me.png",
        ]);
        const { images, skipped } = await loadImages(
            [
                `${base}/resume/a.png`,
                `${base}/resume/b.png`,
                "https://other.test/c.png",
            ],
            base,
            async (key) =>
                key === "resume/a.png"
                    ? {
                          bytes: new Uint8Array([1, 2, 3]),
                          mimeType: "image/png",
                      }
                    : null
        );
        expect(images.size).toBe(0);
        expect(skipped.sort()).toEqual([
            "https://other.test/c.png",
            `${base}/resume/a.png`,
            `${base}/resume/b.png`,
        ]);
    });
});
