import type { Metadata } from "next";
import AuthGuard from "@/components/admin/AuthGuard";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
    title: "Admin",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default function AdminPage() {
    return (
        <AuthGuard>
            <AdminDashboard />
        </AuthGuard>
    );
}
