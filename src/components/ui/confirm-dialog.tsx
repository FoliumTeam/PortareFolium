"use client";
import { LocalizedText } from "@/components/LocalizedText";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    CustomConfirmDialog,
    CustomConfirmDialogAction,
    CustomConfirmDialogCancel,
    CustomConfirmDialogContent,
    CustomConfirmDialogDescription,
    CustomConfirmDialogFooter,
    CustomConfirmDialogHeader,
    CustomConfirmDialogTitle,
} from "@/components/ui/custom-confirm-dialog";

type ConfirmDialogVariant = "default" | "destructive";

type ConfirmDialogOptions = {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
};

type ConfirmDialogState = Required<ConfirmDialogOptions> & {
    open: boolean;
};

type ConfirmDialogContextValue = {
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const DEFAULT_STATE: ConfirmDialogState = {
    open: false,
    title: "",
    description: "",
    confirmText: "확인",
    cancelText: "취소",
    variant: "default",
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(
    null
);

export function ConfirmDialogProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [dialogState, setDialogState] =
        useState<ConfirmDialogState>(DEFAULT_STATE);
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const closeDialog = useCallback((value: boolean) => {
        resolverRef.current?.(value);
        resolverRef.current = null;
        setDialogState((prev) => ({ ...prev, open: false }));
    }, []);

    const confirm = useCallback((options: ConfirmDialogOptions) => {
        resolverRef.current?.(false);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setDialogState({
                open: true,
                title: options.title,
                description: options.description ?? "",
                confirmText: options.confirmText ?? "확인",
                cancelText: options.cancelText ?? "취소",
                variant: options.variant ?? "default",
            });
        });
    }, []);

    useEffect(() => {
        return () => {
            resolverRef.current?.(false);
            resolverRef.current = null;
        };
    }, []);

    const contextValue = useMemo(
        () => ({
            confirm,
        }),
        [confirm]
    );

    return (
        <ConfirmDialogContext value={contextValue}>
            {children}
            <CustomConfirmDialog
                open={dialogState.open}
                onOpenChange={(open) => {
                    if (!open) closeDialog(false);
                }}
            >
                <CustomConfirmDialogContent>
                    <CustomConfirmDialogHeader>
                        <CustomConfirmDialogTitle>
                            {<LocalizedText text={dialogState.title} />}
                        </CustomConfirmDialogTitle>
                        {dialogState.description ? (
                            <CustomConfirmDialogDescription>
                                {
                                    <LocalizedText
                                        text={dialogState.description}
                                    />
                                }
                            </CustomConfirmDialogDescription>
                        ) : null}
                    </CustomConfirmDialogHeader>
                    <CustomConfirmDialogFooter>
                        <CustomConfirmDialogCancel
                            onClick={() => closeDialog(false)}
                        >
                            {<LocalizedText text={dialogState.cancelText} />}
                        </CustomConfirmDialogCancel>
                        <CustomConfirmDialogAction
                            onClick={() => closeDialog(true)}
                            destructive={dialogState.variant === "destructive"}
                        >
                            {<LocalizedText text={dialogState.confirmText} />}
                        </CustomConfirmDialogAction>
                    </CustomConfirmDialogFooter>
                </CustomConfirmDialogContent>
            </CustomConfirmDialog>
        </ConfirmDialogContext>
    );
}

export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext);

    if (!context) {
        throw new Error(
            "[ConfirmDialogProvider::useConfirmDialog] Provider not found"
        );
    }

    return context;
}
