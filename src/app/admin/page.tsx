import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isSqliteRefugeMode } from "@/lib/refuge/mode";
import { getEffectiveAdminSession } from "@/lib/server-admin";

export const metadata: Metadata = {
    title: "Admin",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminPage() {
    const session = await getEffectiveAdminSession();
    if (isAdminSession(session)) {
        return <AdminDashboard refugeMode={isSqliteRefugeMode()} />;
    }
    redirect("/admin/login?returnUrl=/admin");
}
