import type { Metadata } from "next";
import MigrationGuide from "@/components/admin/MigrationGuide";
import { serverClient } from "@/lib/supabase";

export const metadata: Metadata = {
    title: "Admin Migration",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminMigratePage() {
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
