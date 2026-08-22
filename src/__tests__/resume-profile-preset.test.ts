import { describe, expect, it } from "vitest";
import {
    getProfileContrastColor,
    getResumeProfileBrand,
    getResumeProfileUrl,
    inferResumeProfilePreset,
} from "@/lib/resume-profile-preset";

describe("resume profile presets", () => {
    it("기존 network 값에서 GitHub와 LinkedIn preset 추론", () => {
        expect(inferResumeProfilePreset({ network: "GitHub" })).toBe("github");
        expect(inferResumeProfilePreset({ network: "linkedin" })).toBe(
            "linkedin"
        );
        expect(inferResumeProfilePreset({ network: "GitLab" })).toBe("gitlab");
        expect(inferResumeProfilePreset({ network: "Figma" })).toBe("figma");
        expect(inferResumeProfilePreset({ network: "npm" })).toBe("npm");
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
        expect(getResumeProfileBrand({ preset: "gitlab" })).toMatchObject({
            label: "GitLab",
            backgroundColor: "#fc6d26",
        });
        expect(getResumeProfileBrand({ preset: "figma" })).toMatchObject({
            label: "Figma",
            backgroundColor: "#f24e1e",
        });
        expect(getResumeProfileBrand({ preset: "npm" })).toMatchObject({
            label: "npm",
            backgroundColor: "#cb3837",
        });
    });

    it("Resume basics의 플랫폼 profile URL을 단일 공개 source로 사용", () => {
        const profiles = [
            { preset: "linkedin" as const, url: "https://linkedin.example" },
            { network: "GitHub", url: "https://github.example" },
        ];

        expect(getResumeProfileUrl(profiles, "github")).toBe(
            "https://github.example"
        );
        expect(getResumeProfileUrl(profiles, "npm")).toBe("");
    });
});
