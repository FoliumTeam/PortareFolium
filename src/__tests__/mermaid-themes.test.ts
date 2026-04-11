import { describe, it, expect } from "vitest";
import { getMermaidConfig } from "@/lib/mermaid-themes";

describe("getMermaidConfig", () => {
    it("알 수 없는 스킴 → blue 폴백", () => {
        const unknown = getMermaidConfig("unknown-scheme", false);
        const blue = getMermaidConfig("blue", false);
        expect(unknown.themeVariables.primaryColor).toBe(
            blue.themeVariables.primaryColor
        );
    });

    it("null 스킴 → blue 폴백", () => {
        const nullScheme = getMermaidConfig(null, false);
        const blue = getMermaidConfig("blue", false);
        expect(nullScheme.themeVariables.primaryColor).toBe(
            blue.themeVariables.primaryColor
        );
    });

    it("light/dark 모드에 따라 다른 primaryColor 반환", () => {
        const light = getMermaidConfig("blue", false);
        const dark = getMermaidConfig("blue", true);
        expect(light.themeVariables.primaryColor).not.toBe(
            dark.themeVariables.primaryColor
        );
    });
});
