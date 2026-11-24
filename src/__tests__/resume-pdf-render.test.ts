import { describe, expect, it } from "vitest";
import { buildResumePdfModel } from "@/lib/resume-pdf/model";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import { paginateScript } from "@/lib/resume-pdf/paginate";
import { renderResumePdf } from "@/lib/resume-pdf/render";
import { buildJobFieldSource } from "@/lib/resume-pdf/source";
import { safeHref } from "@/lib/resume-pdf/text";
import type { PdfLang } from "@/types/resume-pdf";
import {
    aboutRow,
    ASOF,
    configRows,
    portfolioRows,
    resumeRow,
} from "./resume-pdf-fixture";

const fonts = { regular: "file:///r.woff2", bold: "file:///b.woff2" };

const model = (raw: unknown = {}, lang: PdfLang = "ko", resume = resumeRow()) =>
    buildResumePdfModel(
        buildJobFieldSource({
            lang,
            jobField: "web",
            resume,
            about: aboutRow(),
            portfolio: portfolioRows(),
            config: configRows(),
        }),
        normalizePdfOptions(raw),
        ASOF
    );

describe("이력서 PDF 렌더", () => {
    it("외부 그림은 resolveImage가 준 값만 사용 (외부 요청 0)", () => {
        const html = renderResumePdf(model(), "C", { fonts });
        expect(html).not.toContain("img.example.test");
        const withImg = renderResumePdf(model(), "C", {
            fonts,
            resolveImage: (u) =>
                u.includes("me.png") ? "data:image/png;base64,AA" : undefined,
        });
        expect(withImg).toContain('src="data:image/png;base64,AA"');
        expect(withImg).not.toMatch(/src="https?:/);
    });

    it("사용자 글은 escape, 허용 밖 scheme은 링크로 만들지 않음 (F13)", () => {
        const r = resumeRow();
        r.basics!.name = '<script>alert(1)</script>"';
        r.basics!.profiles = [{ network: "X", url: "javascript:alert(1)" }];
        const html = renderResumePdf(model({}, "ko", r), "C", { fonts });
        expect(html).not.toContain("<script>alert");
        expect(html).not.toContain('href="javascript:');
        expect(html).toContain('content:"\\3c script>alert(1)\\3c /script>\\"');
        expect(safeHref("mailto:a@b.test")).toBe("mailto:a@b.test");
        expect(safeHref("data:text/html,x")).toBeUndefined();
    });

    it("C 섹션 순서는 사이트 설정 순서", () => {
        const html = renderResumePdf(model(), "C", { fonts });
        const at = (s: string) => html.indexOf(`<h2>${s}</h2>`);
        expect(at("핵심 역량")).toBeLessThan(at("경력"));
        expect(at("경력")).toBeLessThan(at("실무 프로젝트"));
        expect(at("기술")).toBeLessThan(at("학력"));
    });

    it("기획 단계 표시와 종류 미상 묶음", () => {
        const html = renderResumePdf(model(), "C", { fonts });
        expect(html).toContain(
            "AI 에이전트 · 개인 프로젝트 · 기획 단계 · 미구현"
        );
        expect(html).toContain("<h2>프로젝트</h2>");
    });

    it("F 履歴書: 재학 중·졸업 예정·전환·特になし", () => {
        const html = renderResumePdf(model({}, "ja"), "F", { fonts });
        expect(html).toContain("Night School 在学中");
        expect(html).toContain("Grad School 卒業見込");
        expect(html).toContain("Acme Full-time登用 — Engineer");
        expect(html).toContain("特になし");
        expect(html).toContain("現在に至る");
        expect(html).toContain('<html lang="ja">');
    });

    it("F 職務経歴書: 회사 프로젝트는 회사 표 안, 自己PR 블록 숨김 가능", () => {
        const html = renderResumePdf(model(), "F", { fonts });
        expect(html.indexOf("Shop Revamp")).toBeGreaterThan(
            html.indexOf('<div class="co">Acme')
        );
        expect(html).toContain("<h2>자기 PR</h2>");
        const hidden = renderResumePdf(
            model({ details: { shokumuSelfPr: false } }),
            "F",
            { fonts }
        );
        expect(hidden).not.toContain("<h2>자기 PR</h2>");
    });

    it("GPA 숨김은 C·F 모두 글자 0", () => {
        expect(renderResumePdf(model(), "C", { fonts })).toContain(
            "GPA 3.9 / 4"
        );
        const m = model({ details: { educationGpa: false } });
        for (const v of ["C", "F"] as const)
            expect(renderResumePdf(m, v, { fonts })).not.toContain("3.9 / 4");
    });

    it("ja 줄바꿈 CSS는 ja에만", () => {
        const ja = renderResumePdf(model({}, "ja"), "C", { fonts });
        const ko = renderResumePdf(model(), "C", { fonts });
        expect(ja).toContain("line-break:strict");
        expect(ko).not.toContain("line-break:strict");
        expect(ko).toContain("word-break:keep-all");
    });

    it("쪽 나눔 식: F만 履歴書 채우기 포함", () => {
        expect(paginateScript("F")).toContain("td.pr");
        expect(paginateScript("C")).not.toContain("td.pr");
        expect(
            () => new Function(`return ${paginateScript("F")}`)
        ).not.toThrow();
    });
});
