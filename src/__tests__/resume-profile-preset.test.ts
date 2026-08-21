import { describe, expect, it } from "vitest";
import {
    getProfileContrastColor,
    getResumeProfileBrand,
    inferResumeProfilePreset,
} from "@/lib/resume-profile-preset";

describe("resume profile presets", () => {
    it("기존 network 값에서 GitHub와 LinkedIn preset 추론", () => {
        expect(inferResumeProfilePreset({ network: "GitHub" })).toBe("github");
        expect(inferResumeProfilePreset({ network: "linkedin" })).toBe(
            "linkedin"
        );
        expect(inferResumeProfilePreset({ network: "Website" })).toBe("custom");
    });

    it("brand background에 가장 높은 흑백 대비 적용", () => {
        expect(getProfileContrastColor("#ffffff")).toBe("#000000");
        expect(getProfileContrastColor("#000000")).toBe("#ffffff");
        expect(getResumeProfileBrand({ preset: "github" })).toMatchObject({
            label: "GitHub",
            backgroundColor: "#24292f",
            foregroundColor: "#ffffff",
        });
        expect(getResumeProfileBrand({ preset: "linkedin" })).toMatchObject({
            label: "LinkedIn",
            backgroundColor: "#0a66c2",
            foregroundColor: "#ffffff",
        });
    });
});
