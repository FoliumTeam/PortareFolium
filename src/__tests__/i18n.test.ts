import { describe, expect, it } from "vitest";
import {
    getBrowserLocale,
    normalizeLocale,
    getParentContentPath,
} from "@/lib/i18n";

describe("언어 선택", () => {
    it.each([
        ["ko-KR,ko;q=0.9,en;q=0.7", "ko"],
        ["ja-JP,en;q=0.8", "ja"],
        ["fr-FR,ja;q=0.8,en;q=0.5", "ja"],
        ["fr-FR,de;q=0.9", "en"],
        ["ko;q=0,ja;q=0.8", "ja"],
        [null, "en"],
    ])("%s → %s", (header, expected) => {
        expect(getBrowserLocale(header)).toBe(expected);
    });

    it("지원하지 않는 저장 값은 영어로 정규화", () => {
        expect(normalizeLocale("fr")).toBe("en");
        expect(normalizeLocale("ko")).toBe("ko");
    });

    it.each([
        ["/web/portfolio/example", "/web/portfolio"],
        ["/token/blog/example", "/token/blog"],
        ["/portfolio/example", "/portfolio"],
    ])("누락 상세의 같은 범위 목록 유지", (path, parent) => {
        expect(getParentContentPath(path)).toBe(parent);
    });
});
