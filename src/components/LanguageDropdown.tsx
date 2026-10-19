"use client";

import { ChevronDown, Languages } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FLAG_FILES: Record<Locale, string> = {
    ko: "/flags/kr.svg",
    en: "/flags/us.svg",
    ja: "/flags/jp.svg",
};

export const LanguageFlag = ({
    locale,
    className,
}: {
    locale: Locale;
    className?: string;
}) => (
    <img
        src={FLAG_FILES[locale]}
        alt=""
        aria-hidden="true"
        width={24}
        height={16}
        className={cn("h-4 w-6 shrink-0 object-contain", className)}
    />
);

type LanguageDropdownProps = {
    value?: Locale;
    onValueChange: (locale: Locale) => void | Promise<void>;
    label: string;
    disabled?: boolean;
    locales?: readonly Locale[];
    placeholder?: string;
    compact?: boolean;
    descriptionId?: string;
};

export const LanguageDropdown = ({
    value,
    onValueChange,
    label,
    disabled = false,
    locales = LOCALES,
    placeholder = label,
    compact = false,
    descriptionId,
}: LanguageDropdownProps) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
            <button
                type="button"
                aria-label={label}
                aria-describedby={descriptionId}
                data-locale={value ?? ""}
                title={label}
                disabled={disabled}
                className={cn(
                    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-medium whitespace-nowrap text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                    compact && "tablet:px-3 px-2"
                )}
            >
                {value ? (
                    <LanguageFlag locale={value} />
                ) : (
                    <Languages className="size-5" aria-hidden="true" />
                )}
                <span className={cn(compact && "tablet:inline hidden")}>
                    {value ? LOCALE_LABELS[value] : placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        "size-3.5 text-(--color-muted)",
                        compact && "tablet:block hidden"
                    )}
                    aria-hidden="true"
                />
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={label}>
            <DropdownMenuRadioGroup value={value ?? ""}>
                {locales.map((locale) => (
                    <DropdownMenuRadioItem
                        key={locale}
                        value={locale}
                        disabled={disabled}
                        onSelect={() => {
                            if (!disabled) void onValueChange(locale);
                        }}
                    >
                        <LanguageFlag locale={locale} />
                        {LOCALE_LABELS[locale]}
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuContent>
    </DropdownMenu>
);

export default LanguageDropdown;
