"use client";

/**
 * CategorySelect
 *
 * shadcn Command + Popover 기반 카테고리 combobox.
 * 기존 카테고리 선택 또는 즉시 생성 가능.
 */
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
    value: string;
    onChange: (value: string) => void;
    /** registry와 기존 포스트에서 추출한 카테고리 목록 */
    options: string[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onCreate?: (value: string) => boolean | Promise<boolean>;
}

function normalizeCategory(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export default function CategorySelect({
    value,
    onChange,
    options,
    placeholder = "선택 또는 생성",
    className = "",
    disabled = false,
    onCreate,
}: CategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [creating, setCreating] = useState(false);

    const normalizedOptions = useMemo(
        () =>
            [...new Set(options.map(normalizeCategory).filter(Boolean))].sort(
                (a, b) => a.localeCompare(b)
            ),
        [options]
    );

    const createValue = normalizeCategory(query);
    const hasExactMatch = normalizedOptions.some(
        (category) => category.toLowerCase() === createValue.toLowerCase()
    );
    const canCreate = createValue !== "" && !hasExactMatch;

    const selectCategory = (next: string) => {
        onChange(next);
        setQuery("");
        setOpen(false);
    };

    const createCategory = async () => {
        if (!canCreate || creating) return;
        setCreating(true);
        const ok = onCreate ? await onCreate(createValue) : true;
        setCreating(false);
        if (!ok) return;
        selectCategory(createValue);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between border-(--color-border) bg-(--color-surface) px-3 py-2 text-left text-base font-normal text-(--color-foreground) hover:bg-(--color-surface-subtle)",
                        !value && "text-(--color-muted)",
                        className
                    )}
                >
                    <span className="min-w-0 truncate">
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) min-w-72 p-0"
            >
                <Command shouldFilter>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder="카테고리 검색 또는 생성"
                    />
                    <CommandList>
                        <CommandEmpty className="py-3 text-center text-sm text-(--color-muted)">
                            일치하는 카테고리가 없습니다.
                        </CommandEmpty>
                        <CommandGroup>
                            {canCreate && (
                                <CommandItem
                                    value={createValue}
                                    onSelect={() => void createCategory()}
                                    disabled={creating}
                                    className="font-medium"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="truncate">
                                        {creating
                                            ? "생성 중..."
                                            : `새 카테고리 생성: ${createValue}`}
                                    </span>
                                </CommandItem>
                            )}
                            {normalizedOptions.map((category) => (
                                <CommandItem
                                    key={category}
                                    value={category}
                                    onSelect={() => selectCategory(category)}
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4",
                                            value === category
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{category}</span>
                                </CommandItem>
                            ))}
                            {value && (
                                <CommandItem
                                    value="__clear_category__"
                                    onSelect={() => selectCategory("")}
                                    className="text-(--color-muted)"
                                >
                                    선택 해제
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
