import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import MigrationGuide from "@/components/admin/MigrationGuide";
import { serverClient } from "@/lib/supabase";

export const metadata: Metadata = {
    title: "Admin Migration",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminMigratePage() {
    const session = await auth();
    const legacyEnabled = process.env.SUPABASE_LEGACY_LOGIN_ENABLED !== "false";
    if (isAdminSession(session) && !legacyEnabled) {
        redirect("/admin");
    }
    if (!legacyEnabled) {
        redirect("/admin/login?returnUrl=/admin");
    }

    let siteName = "";
    if (serverClient) {
        const { data } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "site_name")
            .single();
        if (data?.value) {
            let value = data.value;
            if (typeof value === "string" && value.startsWith('"')) {
                value = JSON.parse(value);
            }
            if (typeof value === "string") siteName = value;
        }
    }

    return <MigrationGuide siteName={siteName} />;
}
