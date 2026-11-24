import { describe, expect, it } from "vitest";
import {
    ageOn,
    educationStatus,
    endOf,
    startOf,
    tenureMonths,
    ym,
} from "@/lib/resume-pdf/dates";
import { PDF_LABELS } from "@/lib/resume-pdf/labels";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import {
    escapeCssString,
    escapeHtml,
    firstSentence,
    markdownToHtml,
} from "@/lib/resume-pdf/text";
import { hasTrunkPrefixAfterCountryCode } from "@/lib/resume-pdf/warnings";

describe("이력서 PDF 날짜", () => {
    it("정밀도별 시작·종료 정규화", () => {
        expect(startOf("2024")).toBe("2024-01-01");
        expect(startOf("2024-02")).toBe("2024-02-01");
        expect(endOf("2024-02")).toBe("2024-02-29");
        expect(endOf("2023")).toBe("2023-12-31");
        expect(ym("2024-02-15")).toBe("2024.02");
    });

    it("근속 = 완성 개월 + 남은 날 30일당 1개월 (D7)", () => {
        expect(tenureMonths("2023-01-01", "2023-06-30", "2026-01-01")).toBe(6);
        expect(tenureMonths("2023-01", "2023-06", "2026-01-01")).toBe(6);
        expect(tenureMonths("2023-01-15", "2023-03-14", "2026-01-01")).toBe(2);
        expect(tenureMonths("2023-01-15", "2023-03-13", "2026-01-01")).toBe(1);
        expect(tenureMonths("2026-11-01", undefined, "2026-11-25")).toBe(0);
        expect(tenureMonths("2026-12-01", undefined, "2026-11-25")).toBe(0);
    });

    it("만 나이와 학력 상태 (D18)", () => {
        expect(ageOn("2000-11-25", "2026-11-25")).toBe(26);
        expect(ageOn("2000-11-26", "2026-11-25")).toBe(25);
        expect(educationStatus(undefined, "2026-11-25")).toBe("enrolled");
        expect(educationStatus("2026-11", "2026-11-25")).toBe("expected");
        expect(educationStatus("2026-10", "2026-11-25")).toBe("graduated");
    });
});

describe("이력서 PDF 글 처리", () => {
    it("HTML·CSS escape (F14)", () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
            "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
        );
        expect(escapeCssString(`a"b\\c\n</style>`)).toBe(
            `a\\"b\\\\c \\3c /style>`
        );
    });

    it("Markdown 최소 변환: 목록·문단·굵게, 원문 HTML은 escape", () => {
        expect(
            markdownToHtml("Intro **bold**\n- one\n- <b>two</b>\n\nEnd")
        ).toBe(
            "<p>Intro <strong>bold</strong></p><ul><li>one</li><li>&lt;b&gt;two&lt;/b&gt;</li></ul><p>End</p>"
        );
        expect(markdownToHtml("**x**", false)).toBe("<p>x</p>");
    });

    it("첫 문장 추출 (ko·ja)", () => {
        expect(firstSentence("One. Two.")).toBe("One.");
        expect(firstSentence("一つ。二つ。")).toBe("一つ。二つ。");
        expect(firstSentence("一つ。 二つ。")).toBe("一つ。");
        expect(firstSentence("v1.2 shipped. Next")).toBe("v1.2 shipped.");
        expect(firstSentence("No stop")).toBe("No stop");
    });
});

describe("이력서 PDF 양식어", () => {
    it("ko·ja 같은 키 집합", () => {
        expect(Object.keys(PDF_LABELS.ja).sort()).toEqual(
            Object.keys(PDF_LABELS.ko).sort()
        );
    });

    it("기간·생년월일 문형", () => {
        expect(PDF_LABELS.ko.duration(14)).toBe("1년 2개월");
        expect(PDF_LABELS.ja.duration(12)).toBe("1年");
        expect(PDF_LABELS.ja.duration(5)).toBe("5か月");
        expect(PDF_LABELS.ja.birthFmt("1995-03-07", 31)).toBe(
            "1995年3月7日生（満31歳）"
        );
        expect(PDF_LABELS.ja.convertFmt("正社員")).toBe("正社員登用");
        expect(PDF_LABELS.ko.pr).toBe("자기 PR");
        expect(PDF_LABELS.ja.pr).toBe("自己PR");
    });
});

describe("이력서 PDF 옵션 정규화", () => {
    it("모르는 키 보존, 틀린 형식 제거", () => {
        const o = normalizePdfOptions({
            future: { a: 1 },
            sections: { work: false, skills: "no" },
            sectionOrder: "bad",
            basics: { phone: false, bogus: true },
            projects: {
                order: ["a", 3],
                hiddenSubsections: { a: ["T"], b: "x" },
                keep: 1,
            },
            details: { educationGpa: "no", skillLevel: false, extra: true },
        });
        expect(o).toEqual({
            version: 1,
            future: { a: 1 },
            sections: { work: false },
            basics: { phone: false },
            projects: {
                keep: 1,
                order: ["a"],
                hiddenSubsections: { a: ["T"] },
                compactPersonal: false,
            },
            details: { extra: true, skillLevel: false },
        });
    });

    it("빈 입력은 기본값", () => {
        expect(normalizePdfOptions(null)).toEqual({
            version: 1,
            sections: {},
            basics: {},
            projects: { hiddenSubsections: {}, compactPersonal: false },
            details: {},
        });
    });

    it("국제번호 뒤 0 판정", () => {
        expect(hasTrunkPrefixAfterCountryCode("+82 010-1111-2222")).toBe(true);
        expect(hasTrunkPrefixAfterCountryCode("+81-(0)90-1111-2222")).toBe(
            true
        );
        expect(hasTrunkPrefixAfterCountryCode("+82-10-1111-2222")).toBe(false);
        expect(hasTrunkPrefixAfterCountryCode("010-1111-2222")).toBe(false);
    });
});
