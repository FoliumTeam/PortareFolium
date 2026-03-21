"use client";

/**
 * CategorySelect
 *
 * Headless UI Combobox 기반 카테고리 선택.
 * 기존 카테고리 선택 또는 새로 입력 가능.
 */
import {
    Combobox,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from "@headlessui/react";
import { useState, useMemo } from "react";

interface CategorySelectProps {
    value: string;
    onChange: (value: string) => void;
    /** 기존 포스트에서 추출한 카테고리 목록 */
    options: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function CategorySelect({
    value,
    onChange,
    options,
    placeholder = "선택 또는 입력",
    className = "",
    disabled = false,
}: CategorySelectProps) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [...options].sort((a, b) => a.localeCompare(b));
        const matched = options.filter((c) => c.toLowerCase().includes(q));
        return matched.sort((a, b) => a.localeCompare(b));
    }, [options, query]);

    const showCreateOption =
        query.trim() !== "" &&
        !options.some((c) => c.toLowerCase() === query.trim().toLowerCase());

    const displayOptions = showCreateOption
        ? [query.trim(), ...filtered]
        : filtered;

    return (
        <Combobox
            value={value || null}
            onChange={(v) => onChange(v ?? "")}
            onClose={() => setQuery("")}
            disabled={disabled}
        >
            <div className={`relative ${className}`}>
                <ComboboxInput
                    displayValue={(v: string | null) => v ?? query}
                    onChange={(e) => {
                        const next = e.target.value;
                        setQuery(next);
                        if (next === "") onChange("");
                    }}
                    onBlur={() => {
                        if (query.trim() && value !== query.trim()) {
                            onChange(query.trim());
                        }
                    }}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-base text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    autoComplete="off"
                />
                <ComboboxOptions
                    anchor="bottom"
                    className="tablet:min-w-96 z-50 mt-1 max-h-48 min-w-48 overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg empty:invisible"
                >
                    {displayOptions.length === 0 && !showCreateOption ? (
                        <div className="px-3 py-2 text-base text-(--color-muted)">
                            카테고리가 없습니다. 입력 후 Enter로 추가하세요.
                        </div>
                    ) : (
                        displayOptions.map((opt, idx) => (
                            <ComboboxOption
                                key={idx}
                                value={opt}
                                className="group cursor-pointer px-3 py-2 text-base text-(--color-foreground) data-focus:bg-(--color-accent)/10 data-selected:bg-(--color-accent)/20"
                            >
                                {idx === 0 && showCreateOption ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-(--color-muted)">
                                            ➕
                                        </span>
                                        <span className="font-medium">
                                            {opt}
                                        </span>
                                        <span className="text-sm text-(--color-muted)">
                                            (새로 만들기)
                                        </span>
                                    </span>
                                ) : (
                                    opt
                                )}
                            </ComboboxOption>
                        ))
                    )}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
}
