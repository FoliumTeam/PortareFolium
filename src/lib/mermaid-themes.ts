/**
 * Mermaid theme configuration.
 * Colors are aligned with src/styles/global.css color scheme variables.
 * Keep in sync when updating site themes.
 */

export type ColorScheme = "blue" | "gray" | "beige" | "blackwhite";

export interface MermaidThemeVars {
    primaryColor: string;
    primaryTextColor: string;
    primaryBorderColor: string;
    lineColor: string;
    secondaryColor: string;
    secondaryTextColor: string;
    secondaryBorderColor: string;
    tertiaryColor: string;
    tertiaryTextColor: string;
    tertiaryBorderColor: string;
    background: string;
    mainBkg: string;
    textColor: string;
    noteBkgColor: string;
    noteTextColor: string;
}

/** Theme colors per scheme (light/dark), matching global.css */
export const MERMAID_THEMES: Record<
    ColorScheme,
    { light: MermaidThemeVars; dark: MermaidThemeVars }
> = {
    blackwhite: {
        light: {
            primaryColor: "#f5f5f5",
            primaryTextColor: "#000000",
            primaryBorderColor: "#e5e5e5",
            lineColor: "#525252",
            secondaryColor: "#e5e5e5",
            secondaryTextColor: "#000000",
            secondaryBorderColor: "#e5e5e5",
            tertiaryColor: "#ffffff",
            tertiaryTextColor: "#000000",
            tertiaryBorderColor: "#e5e5e5",
            background: "#ffffff",
            mainBkg: "#f5f5f5",
            textColor: "#000000",
            noteBkgColor: "#fefce8",
            noteTextColor: "#000000",
        },
        dark: {
            primaryColor: "#171717",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#262626",
            lineColor: "#a3a3a3",
            secondaryColor: "#262626",
            secondaryTextColor: "#ffffff",
            secondaryBorderColor: "#262626",
            tertiaryColor: "#000000",
            tertiaryTextColor: "#ffffff",
            tertiaryBorderColor: "#262626",
            background: "#000000",
            mainBkg: "#171717",
            textColor: "#ffffff",
            noteBkgColor: "#171717",
            noteTextColor: "#ffffff",
        },
    },
    gray: {
        light: {
            primaryColor: "#f5f5f5",
            primaryTextColor: "#171717",
            primaryBorderColor: "#e5e5e5",
            lineColor: "#525252",
            secondaryColor: "#f0f0f0",
            secondaryTextColor: "#171717",
            secondaryBorderColor: "#e5e5e5",
            tertiaryColor: "#fafafa",
            tertiaryTextColor: "#171717",
            tertiaryBorderColor: "#e5e5e5",
            background: "#fafafa",
            mainBkg: "#f5f5f5",
            textColor: "#171717",
            noteBkgColor: "#fefce8",
            noteTextColor: "#171717",
        },
        dark: {
            primaryColor: "#262626",
            primaryTextColor: "#fafafa",
            primaryBorderColor: "#404040",
            lineColor: "#a3a3a3",
            secondaryColor: "#404040",
            secondaryTextColor: "#fafafa",
            secondaryBorderColor: "#404040",
            tertiaryColor: "#171717",
            tertiaryTextColor: "#fafafa",
            tertiaryBorderColor: "#404040",
            background: "#171717",
            mainBkg: "#262626",
            textColor: "#fafafa",
            noteBkgColor: "#262626",
            noteTextColor: "#fafafa",
        },
    },
    blue: {
        light: {
            primaryColor: "#e2e8f0",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#cbd5e1",
            lineColor: "#475569",
            secondaryColor: "#e0e7ff",
            secondaryTextColor: "#1e293b",
            secondaryBorderColor: "#cbd5e1",
            tertiaryColor: "#f1f5f9",
            tertiaryTextColor: "#1e293b",
            tertiaryBorderColor: "#cbd5e1",
            background: "#f1f5f9",
            mainBkg: "#e2e8f0",
            textColor: "#1e293b",
            noteBkgColor: "#fef3c7",
            noteTextColor: "#1e293b",
        },
        dark: {
            primaryColor: "#1e293b",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#334155",
            lineColor: "#94a3b8",
            secondaryColor: "#334155",
            secondaryTextColor: "#e2e8f0",
            secondaryBorderColor: "#334155",
            tertiaryColor: "#0f172a",
            tertiaryTextColor: "#e2e8f0",
            tertiaryBorderColor: "#334155",
            background: "#0f172a",
            mainBkg: "#1e293b",
            textColor: "#e2e8f0",
            noteBkgColor: "#1e3a5f",
            noteTextColor: "#e2e8f0",
        },
    },
    beige: {
        light: {
            primaryColor: "#f5f5f4",
            primaryTextColor: "#292524",
            primaryBorderColor: "#e7e5e4",
            lineColor: "#78716c",
            secondaryColor: "#fefce8",
            secondaryTextColor: "#292524",
            secondaryBorderColor: "#e7e5e4",
            tertiaryColor: "#fafaf9",
            tertiaryTextColor: "#292524",
            tertiaryBorderColor: "#e7e5e4",
            background: "#fafaf9",
            mainBkg: "#f5f5f4",
            textColor: "#292524",
            noteBkgColor: "#fef3c7",
            noteTextColor: "#292524",
        },
        dark: {
            primaryColor: "#292524",
            primaryTextColor: "#fafaf9",
            primaryBorderColor: "#44403c",
            lineColor: "#a8a29e",
            secondaryColor: "#44403c",
            secondaryTextColor: "#fafaf9",
            secondaryBorderColor: "#44403c",
            tertiaryColor: "#1c1917",
            tertiaryTextColor: "#fafaf9",
            tertiaryBorderColor: "#44403c",
            background: "#1c1917",
            mainBkg: "#292524",
            textColor: "#fafaf9",
            noteBkgColor: "#451a03",
            noteTextColor: "#fafaf9",
        },
    },
};

/** Build Mermaid initialize config from current scheme and dark mode */
export function getMermaidConfig(
    scheme: string | null,
    isDark: boolean
): {
    theme: string;
    themeVariables: Record<string, string | number | boolean>;
} {
    const validScheme: ColorScheme =
        scheme && scheme in MERMAID_THEMES ? (scheme as ColorScheme) : "gray";
    const schemeThemes = MERMAID_THEMES[validScheme];
    const themeVars = isDark ? schemeThemes.dark : schemeThemes.light;
    return {
        theme: "base",
        themeVariables: {
            ...themeVars,
            fontSize: "18px",
            fontFamily: "inherit",
            darkMode: isDark,
        },
    };
}
