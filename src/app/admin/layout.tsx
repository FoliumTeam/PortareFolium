import type { Metadata } from "next";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import DocumentLayout from "@/components/DocumentLayout";
import { cookies, headers } from "next/headers";
import { getBrowserLocale, isLocale, UI_LOCALE_COOKIE } from "@/lib/i18n";

export const metadata: Metadata = {
    title: "Admin — PortareFolium",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const stored = (await cookies()).get(UI_LOCALE_COOKIE)?.value;
    const locale = isLocale(stored)
        ? stored
        : getBrowserLocale((await headers()).get("accept-language"));
    return DocumentLayout({
        locale,
        children: <ConfirmDialogProvider>{children}</ConfirmDialogProvider>,
    });
}
