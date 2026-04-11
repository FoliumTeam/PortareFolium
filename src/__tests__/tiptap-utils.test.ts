import { describe, it, expect } from "vitest";
import {
    formatShortcutKey,
    isValidPosition,
    clamp,
    isAllowedUri,
    sanitizeUrl,
} from "@/lib/tiptap-utils";

describe("formatShortcutKey", () => {
    it("Mac: mod → ⌘, 비-Mac: capitalize 처리", () => {
        expect(formatShortcutKey("mod", true)).toBe("⌘");
        expect(formatShortcutKey("mod", false)).toBe("Mod");
    });

    it("매핑 없는 키는 대문자 반환, capitalize=false 시 원본", () => {
        expect(formatShortcutKey("b", true)).toBe("B");
        expect(formatShortcutKey("b", true, false)).toBe("b");
    });
});

describe("isValidPosition", () => {
    it("양수/0 → true, 음수/null/NaN → false", () => {
        expect(isValidPosition(5)).toBe(true);
        expect(isValidPosition(0)).toBe(true);
        expect(isValidPosition(-1)).toBe(false);
        expect(isValidPosition(null)).toBe(false);
        expect(isValidPosition(NaN)).toBe(false);
    });
});

describe("clamp", () => {
    it("범위 내 → 그대로, 미만 → min, 초과 → max", () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });
});

describe("isAllowedUri", () => {
    it("https/http/mailto/tel → 허용", () => {
        expect(isAllowedUri("https://example.com")).toBeTruthy();
        expect(isAllowedUri("http://example.com")).toBeTruthy();
        expect(isAllowedUri("mailto:test@example.com")).toBeTruthy();
        expect(isAllowedUri("tel:+821012345678")).toBeTruthy();
    });

    it("javascript:/data: → 차단 (XSS 방지)", () => {
        expect(isAllowedUri("javascript:alert(1)")).toBeFalsy();
        expect(
            isAllowedUri("data:text/html,<script>alert(1)</script>")
        ).toBeFalsy();
    });

    it("상대 경로 허용", () => {
        expect(isAllowedUri("/path/to/page")).toBeTruthy();
    });

    it("커스텀 프로토콜 추가 시 허용", () => {
        expect(
            isAllowedUri("myapp://open", [{ scheme: "myapp" }])
        ).toBeTruthy();
    });
});

describe("sanitizeUrl", () => {
    const BASE = "https://example.com";

    it("유효한 URL → 정규화 반환", () => {
        expect(sanitizeUrl("https://example.com/page", BASE)).toBe(
            "https://example.com/page"
        );
    });

    it("상대 URL → 베이스 기준 절대 URL", () => {
        expect(sanitizeUrl("/about", BASE)).toBe("https://example.com/about");
    });

    it("javascript: → '#' (XSS 방지)", () => {
        expect(sanitizeUrl("javascript:alert(1)", BASE)).toBe("#");
    });
});
