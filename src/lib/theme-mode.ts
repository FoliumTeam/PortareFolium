export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

// 저장된 표시 모드 정규화
export function normalizeThemeMode(value: unknown): ThemeMode {
    if (typeof value === "string" && THEME_MODES.includes(value as ThemeMode)) {
        return value as ThemeMode;
    }

    return "system";
}
