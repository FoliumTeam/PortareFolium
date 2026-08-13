import { describe, expect, it } from "vitest";
import { normalizeThemeMode } from "@/lib/theme-mode";

describe("normalizeThemeMode", () => {
    it("지원하는 화면 모드만 유지한다", () => {
        expect(normalizeThemeMode("light")).toBe("light");
        expect(normalizeThemeMode("dark")).toBe("dark");
        expect(normalizeThemeMode("system")).toBe("system");
    });

    it("저장값이 없거나 잘못되면 시스템 모드를 기본값으로 사용한다", () => {
        expect(normalizeThemeMode(undefined)).toBe("system");
        expect(normalizeThemeMode("auto")).toBe("system");
    });
});
