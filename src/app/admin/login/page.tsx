import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { serverClient } from "@/lib/supabase";

export const metadata: Metadata = {
    title: "Admin Login",
    robots: "noindex, nofollow",
    icons: { icon: "/favicon-admin.svg" },
};

export default async function AdminLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ returnUrl?: string }>;
}) {
    const { returnUrl } = await searchParams;
    let siteName = "";
    if (serverClient) {
        const { data } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "site_name")
            .single();
        if (data?.value) {
            let v = data.value;
            if (typeof v === "string" && v.startsWith('"')) v = JSON.parse(v);
            if (typeof v === "string") siteName = v;
        }
    }
    return <LoginForm siteName={siteName} returnUrl={returnUrl} />;
}
