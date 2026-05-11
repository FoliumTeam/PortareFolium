"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function CustomConfirmDialog({
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
    return (
        <AlertDialogPrimitive.Root
            data-slot="custom-confirm-dialog"
            {...props}
        />
    );
}

function CustomConfirmDialogPortal({
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
    return (
        <AlertDialogPrimitive.Portal
            data-slot="custom-confirm-dialog-portal"
            {...props}
        />
    );
}

function CustomConfirmDialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
    return (
        <AlertDialogPrimitive.Overlay
            data-slot="custom-confirm-dialog-overlay"
            className={cn(
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-[140] bg-black/55 backdrop-blur-[2px]",
                className
            )}
            {...props}
        />
    );
}

function CustomConfirmDialogContent({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
    return (
        <CustomConfirmDialogPortal>
            <CustomConfirmDialogOverlay />
            <AlertDialogPrimitive.Content
                data-slot="custom-confirm-dialog-content"
                className={cn(
                    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 tablet:w-[50vw] tablet:max-w-[50vw] fixed top-[50%] left-[50%] z-[141] grid max-h-[calc(100vh-2rem)] w-[80vw] max-w-[80vw] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 shadow-xl duration-200 outline-none",
                    className
                )}
                {...props}
            />
        </CustomConfirmDialogPortal>
    );
}

function CustomConfirmDialogHeader({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="custom-confirm-dialog-header"
            className={cn("flex flex-col gap-2 text-left", className)}
            {...props}
        />
    );
}

function CustomConfirmDialogFooter({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="custom-confirm-dialog-footer"
            className={cn(
                "flex flex-nowrap items-center justify-end gap-2",
                className
            )}
            {...props}
        />
    );
}

function CustomConfirmDialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="custom-confirm-dialog-title"
            className={cn(
                "text-lg leading-none font-semibold text-(--color-foreground)",
                className
            )}
            {...props}
        />
    );
}

function CustomConfirmDialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="custom-confirm-dialog-description"
            className={cn(
                "text-sm leading-6 whitespace-pre-line text-(--color-muted)",
                className
            )}
            {...props}
        />
    );
}

function CustomConfirmDialogCancel({
    className,
    style,
    ...props
}: React.ComponentProps<"button">) {
    return (
        <AlertDialogPrimitive.Cancel asChild>
            <button
                type="button"
                className={cn(
                    "inline-flex h-10 min-w-24 shrink-0 items-center justify-center rounded-lg border border-transparent px-4 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
                    className
                )}
                style={{
                    backgroundColor:
                        "color-mix(in oklch, var(--color-accent) 18%, var(--color-surface))",
                    color: "var(--color-foreground)",
                    ...style,
                }}
                {...props}
            />
        </AlertDialogPrimitive.Cancel>
    );
}

function CustomConfirmDialogAction({
    destructive = false,
    className,
    style,
    ...props
}: React.ComponentProps<"button"> & {
    destructive?: boolean;
}) {
    return (
        <AlertDialogPrimitive.Action asChild>
            <button
                type="button"
                className={cn(
                    "inline-flex h-10 min-w-24 shrink-0 items-center justify-center rounded-lg border border-transparent px-4 text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
                    destructive
                        ? "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                        : "focus-visible:ring-(--color-accent)",
                    className
                )}
                style={{
                    backgroundColor: destructive
                        ? undefined
                        : "var(--color-accent)",
                    color: destructive ? undefined : "var(--color-on-accent)",
                    ...style,
                }}
                {...props}
            />
        </AlertDialogPrimitive.Action>
    );
}

export {
    CustomConfirmDialog,
    CustomConfirmDialogAction,
    CustomConfirmDialogCancel,
    CustomConfirmDialogContent,
    CustomConfirmDialogDescription,
    CustomConfirmDialogFooter,
    CustomConfirmDialogHeader,
    CustomConfirmDialogOverlay,
    CustomConfirmDialogPortal,
    CustomConfirmDialogTitle,
};
