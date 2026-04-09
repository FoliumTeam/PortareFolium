// 컬러 스킴 정의 — global.css와 동기화

export const ALL_SCHEME_IDS = [
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
] as const;

export type ColorScheme = (typeof ALL_SCHEME_IDS)[number];

export interface ColorSchemeOption {
    value: ColorScheme;
    label: string;
    desc: string;
    swatch: string;
}

// 스킴별 메타데이터 (UI 드롭다운용)
export const COLOR_SCHEMES: ColorSchemeOption[] = [
    { value: "red", label: "Red", desc: "레드", swatch: "#ef4444" },
    { value: "orange", label: "Orange", desc: "오렌지", swatch: "#f97316" },
    { value: "amber", label: "Amber", desc: "앰버", swatch: "#f59e0b" },
    { value: "yellow", label: "Yellow", desc: "옐로", swatch: "#eab308" },
    { value: "lime", label: "Lime", desc: "라임", swatch: "#84cc16" },
    { value: "green", label: "Green", desc: "그린", swatch: "#22c55e" },
    { value: "emerald", label: "Emerald", desc: "에메랄드", swatch: "#10b981" },
    { value: "teal", label: "Teal", desc: "틸", swatch: "#14b8a6" },
    { value: "cyan", label: "Cyan", desc: "시안", swatch: "#06b6d4" },
    { value: "sky", label: "Sky", desc: "스카이", swatch: "#0ea5e9" },
    { value: "blue", label: "Blue", desc: "블루", swatch: "#3b82f6" },
    { value: "indigo", label: "Indigo", desc: "인디고", swatch: "#6366f1" },
    { value: "violet", label: "Violet", desc: "바이올렛", swatch: "#8b5cf6" },
    { value: "purple", label: "Purple", desc: "퍼플", swatch: "#a855f7" },
    { value: "fuchsia", label: "Fuchsia", desc: "푸시아", swatch: "#d946ef" },
    { value: "pink", label: "Pink", desc: "핑크", swatch: "#ec4899" },
    { value: "rose", label: "Rose", desc: "로즈", swatch: "#f43f5e" },
];

// PDF 전용 중립 흑백 스킴
export const NEUTRAL_SCHEME = {
    value: "neutral" as const,
    label: "Black & White",
    desc: "중립 흑백",
    swatch: "#404040",
};

export type PdfColorScheme = ColorScheme | "neutral";

// PDF 드롭다운용 (neutral 포함)
export const PDF_COLOR_SCHEMES: (ColorSchemeOption | typeof NEUTRAL_SCHEME)[] =
    [NEUTRAL_SCHEME, ...COLOR_SCHEMES];
