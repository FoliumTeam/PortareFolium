"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = ({
    className,
    sideOffset = 6,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            data-slot="dropdown-menu-content"
            sideOffset={sideOffset}
            className={cn(
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-[160] min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface) p-1 text-(--color-foreground) shadow-md outline-none",
                className
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
);

const DropdownMenuRadioItem = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) => (
    <DropdownMenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
        className={cn(
            "relative flex min-h-11 cursor-default items-center gap-3 rounded-md py-2 pr-9 pl-3 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-(--color-surface-subtle) data-[state=checked]:bg-(--color-accent)/10 data-[state=checked]:font-semibold data-[state=checked]:text-(--color-accent)",
            className
        )}
        {...props}
    >
        {children}
        <span className="absolute right-3 flex size-4 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="size-4" aria-hidden="true" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
    </DropdownMenuPrimitive.RadioItem>
);

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
};
