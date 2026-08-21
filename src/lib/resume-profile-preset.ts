import type { ResumeProfile, ResumeProfilePreset } from "@/types/resume";

type ProfileBrand = {
    preset: ResumeProfilePreset;
    label: string;
    backgroundColor: string;
    foregroundColor: "#000000" | "#ffffff";
};

const PROFILE_BRAND_COLORS: Record<ResumeProfilePreset, string> = {
    github: "#24292f",
    gitlab: "#fc6d26",
    linkedin: "#0a66c2",
    figma: "#f24e1e",
    npm: "#cb3837",
    custom: "#64748b",
};

const PROFILE_LABELS: Record<ResumeProfilePreset, string> = {
    github: "GitHub",
    gitlab: "GitLab",
    linkedin: "LinkedIn",
    figma: "Figma",
    npm: "npm",
    custom: "Custom",
};

function parseHexColor(value: string): [number, number, number] {
    const normalized = value.replace("#", "");
    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
    ];
}

function toLinearColor(value: number): number {
    const normalized = value / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function getProfileContrastColor(
    backgroundColor: string
): "#000000" | "#ffffff" {
    const [red, green, blue] =
        parseHexColor(backgroundColor).map(toLinearColor);
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const whiteContrast = 1.05 / (luminance + 0.05);
    const blackContrast = (luminance + 0.05) / 0.05;
    return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

export function inferResumeProfilePreset(
    profile: Pick<ResumeProfile, "network" | "preset">
): ResumeProfilePreset {
    if (
        profile.preset === "github" ||
        profile.preset === "gitlab" ||
        profile.preset === "linkedin" ||
        profile.preset === "figma" ||
        profile.preset === "npm"
    ) {
        return profile.preset;
    }
    const network = profile.network?.trim().toLowerCase();
    if (network === "github") return "github";
    if (network === "gitlab") return "gitlab";
    if (network === "linkedin") return "linkedin";
    if (network === "figma") return "figma";
    if (network === "npm") return "npm";
    return "custom";
}

export function getResumeProfileBrand(
    profile: Pick<ResumeProfile, "network" | "preset">
): ProfileBrand {
    const preset = inferResumeProfilePreset(profile);
    const backgroundColor = PROFILE_BRAND_COLORS[preset];
    return {
        preset,
        label: PROFILE_LABELS[preset],
        backgroundColor,
        foregroundColor: getProfileContrastColor(backgroundColor),
    };
}

export function getResumeProfileUrl(
    profiles: ResumeProfile[] | undefined,
    preset: ResumeProfilePreset
): string {
    return (
        profiles
            ?.find(
                (profile) =>
                    inferResumeProfilePreset(profile) === preset &&
                    Boolean(profile.url?.trim())
            )
            ?.url?.trim() ?? ""
    );
}
