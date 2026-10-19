import { LocalizedElement } from "@/components/LocalizedText";
import * as simpleIcons from "simple-icons";
import Image from "next/image";
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

type SkillIconProps = {
    name: string;
    slug?: string;
    iconUrl?: string;
    color?: string;
    className?: string;
};

export const SkillIcon = ({
    name,
    slug,
    iconUrl,
    color,
    className = "h-3 w-3",
}: SkillIconProps) => {
    if (iconUrl) {
        return (
            <LocalizedElement
                as={Image}
                messageProps={{ alt: { text: "{0} 로고", values: [name] } }}
                src={iconUrl}
                alt={`${name} 로고`}
                width={16}
                height={16}
                className={`${className} shrink-0 object-contain`}
            />
        );
    }

    const icon = getSimpleIcon(slug || name);
    if (!icon) return null;

    return (
        <LocalizedElement
            as="svg"
            messageProps={{
                "aria-label": { text: "{0} 로고", values: [name] },
            }}
            role="img"
            aria-label={`${name} 로고`}
            viewBox="0 0 24 24"
            fill={color || `#${icon.hex}`}
            className={`${className} shrink-0`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d={icon.path} />
        </LocalizedElement>
    );
};

type SkillBadgeProps = {
    name: string;
    overrideSlug?: string;
    overrideColor?: string;
    iconUrl?: string;
    level?: string;
};

// 스킬 뱃지 컴포넌트
export function SkillBadge({
    name,
    overrideSlug,
    overrideColor,
    iconUrl,
    level,
}: SkillBadgeProps) {
    const slug = overrideSlug || name;
    const icon = getSimpleIcon(slug);

    const bgColor = overrideColor || (icon ? `#${icon.hex}` : undefined);
    const hasBgColor = !!(overrideColor || icon);
    const textColor =
        bgColor && getLuminance(bgColor) > 0.5
            ? "#000000"
            : bgColor
              ? "#ffffff"
              : "var(--color-on-accent)";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.7rem] font-bold tracking-wider uppercase ${
                hasBgColor ? "" : "bg-(--color-accent)"
            }`}
            style={{
                backgroundColor: bgColor,
                color: textColor,
            }}
        >
            <SkillIcon
                name={name}
                slug={slug}
                iconUrl={iconUrl}
                color="currentColor"
            />
            {name}
            {level ? (
                <LocalizedElement
                    as="span"
                    messageProps={{
                        "aria-label": { text: "숙련도 {0}", values: [level] },
                    }}
                    className="border-l border-current/30 pl-1.5 text-[0.65rem] font-semibold tracking-normal"
                    aria-label={`숙련도 ${level}`}
                >
                    {level}
                </LocalizedElement>
            ) : null}
        </span>
    );
}
