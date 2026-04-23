import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "@/components/admin/LoginForm";
import { isAdminSession } from "@/lib/admin-auth";
import { getAdminCredentialSetup } from "@/lib/admin-credentials";
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
    const e2eEnabled = Boolean(
        process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    );
    const setupState = getAdminCredentialSetup();
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
            e2eEnabled={e2eEnabled}
            setupState={setupState}
        />
    );
}
