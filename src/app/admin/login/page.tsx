import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "@/components/admin/LoginForm";
import { isAdminSession } from "@/lib/admin-auth";
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
    const session = await auth();
    if (isAdminSession(session)) {
        redirect(returnUrl || "/admin");
    }

    let siteName = "";
    const googleEnabled = Boolean(
        process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
    );
    const legacyEnabled = process.env.SUPABASE_LEGACY_LOGIN_ENABLED !== "false";
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
    return (
        <LoginForm
            siteName={siteName}
            returnUrl={returnUrl}
            googleEnabled={googleEnabled}
            legacyEnabled={legacyEnabled}
        />
    );
}
