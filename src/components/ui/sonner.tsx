"use client";

import { CheckCircle2 } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            icons={{
                success: (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ),
            }}
            position="top-center"
            toastOptions={{
                classNames: {
                    toast: "font-(--font-sans) border border-(--color-border) bg-(--color-surface) text-(--color-foreground) shadow-lg",
                    description: "text-(--color-muted)",
                    actionButton:
                        "bg-(--color-accent) text-(--color-on-accent)",
                    cancelButton:
                        "bg-(--color-surface-subtle) text-(--color-foreground)",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
