import { describe, it, expect } from "vitest";
import { tailwindToHex, isLightBackground } from "@/lib/tailwind-colors";

describe("tailwindToHex", () => {
    it("shade 없는 기본 색상명 → 500 값 반환", () => {
        expect(tailwindToHex("blue")).toBe("#3b82f6");
    });

    it("대소문자 무관 처리", () => {
        expect(tailwindToHex("BLUE-500")).toBe("#3b82f6");
    });

    it("앞뒤 공백 제거", () => {
        expect(tailwindToHex("  red-500  ")).toBe("#ef4444");
    });

    it("알 수 없는 색상명 → 빈 문자열", () => {
        expect(tailwindToHex("nonexistent-color")).toBe("");
    });

    it("빈 문자열 → 빈 문자열", () => {
        expect(tailwindToHex("")).toBe("");
    });
});

describe("isLightBackground", () => {
    it("shade 400 → true (경계값)", () => {
        expect(isLightBackground("slate-400")).toBe(true);
    });

    it("shade 500 → false (경계값)", () => {
        expect(isLightBackground("blue-500")).toBe(false);
    });

    it("shade 없는 색상명 → true", () => {
        expect(isLightBackground("blue")).toBe(true);
    });

    it("빈 문자열 → true", () => {
        expect(isLightBackground("")).toBe(true);
    });
});
