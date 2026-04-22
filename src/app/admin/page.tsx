import type { Metadata } from "next";
import AdminAccessGate from "@/components/admin/AdminAccessGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
    title: "Admin",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default function AdminPage() {
    return (
        <AdminAccessGate>
            <AdminDashboard />
        </AdminAccessGate>
    );
}
