import type { Metadata } from "next";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import DocumentLayout from "@/components/DocumentLayout";
import { cookies } from "next/headers";
import {
    getBrowserLocale,
    normalizeLocale,
    UI_LOCALE_COOKIE,
} from "@/lib/i18n";

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
    const locale = stored ? normalizeLocale(stored) : getBrowserLocale(null);
    return DocumentLayout({
        locale,
        children: <ConfirmDialogProvider>{children}</ConfirmDialogProvider>,
    });
}
