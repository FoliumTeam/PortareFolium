import * as simpleIcons from "simple-icons";
import React from "react";

// 커스텀 뱃지 및 색상 조회
export function getSimpleIcon(slug: string) {
    const normalized = slug
        .toLowerCase()
        .replace(/\+/g, "plus")
        .replace(/#/g, "sharp")
        .replace(/\./g, "dot")
        .replace(/[^a-z0-9]/g, "");
    for (const [key, iconObj] of Object.entries(simpleIcons)) {
        if (
            typeof iconObj === "object" &&
            iconObj !== null &&
            "title" in iconObj &&
            key.toLowerCase() === `si${normalized}`
        ) {
            return iconObj as {
                title: string;
                slug: string;
                hex: string;
                path: string;
            };
        }
    }
    return null;
}

// 배경색 대비 계산 (Luminance)
export function getLuminance(hexcode: string) {
    const hex = hexcode.replace(/^#/, "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface SkillBadgeProps {
    name: string;
    overrideSlug?: string;
    overrideColor?: string;
}

// 스킬 뱃지 컴포넌트
export function SkillBadge({
    name,
    overrideSlug,
    overrideColor,
}: SkillBadgeProps) {
    const slug = overrideSlug || name;
    const icon = getSimpleIcon(slug);

    const bgColor =
        overrideColor ||
        (icon ? `#${icon.hex}` : "var(--color-surface-subtle)");
    const hasBgColor = !!(overrideColor || icon);
    const textColor =
        hasBgColor && getLuminance(bgColor) > 0.5
            ? "#000000"
            : hasBgColor
              ? "#ffffff"
              : "var(--color-foreground)";

    return (
        <span
            className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[0.7rem] font-bold tracking-wider uppercase"
            style={{
                backgroundColor: bgColor,
                color: textColor,
                border: hasBgColor ? "none" : "1px solid var(--color-border)",
            }}
        >
            {icon && (
                <svg
                    role="img"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <title>{icon.title}</title>
                    <path d={icon.path} />
                </svg>
            )}
            {name}
        </span>
    );
}
