import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
    title: "Admin",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminPage() {
    const session = await auth();
    if (isAdminSession(session)) {
        return <AdminDashboard />;
    }
    redirect("/admin/login?returnUrl=/admin");
}
