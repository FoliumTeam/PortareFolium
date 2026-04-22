import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import AdminAccessGate from "@/components/admin/AdminAccessGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
    title: "Admin",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminPage() {
    const session = await auth();
    const legacyEnabled = process.env.SUPABASE_LEGACY_LOGIN_ENABLED !== "false";

    if (isAdminSession(session)) {
        return <AdminDashboard />;
    }

    if (!legacyEnabled) {
        redirect("/admin/login?returnUrl=/admin");
    }

    return (
        <AdminAccessGate>
            <AdminDashboard />
        </AdminAccessGate>
    );
}
