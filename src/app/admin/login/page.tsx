import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { isAdminSession } from "@/lib/admin-auth";
import { getAdminCredentialSetup } from "@/lib/admin-credentials";
import { getSafeAdminReturnUrl } from "@/lib/admin-return-url";
import { getEffectiveAdminSession } from "@/lib/server-admin";
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
    const safeReturnUrl = getSafeAdminReturnUrl(returnUrl);
    const setupState = getAdminCredentialSetup();
    const setupReady =
        setupState.missingEnvKeys.length === 0 &&
        setupState.invalidEnvKeys.length === 0;

    if (setupReady) {
        const session = await getEffectiveAdminSession();
        if (isAdminSession(session)) {
            redirect(safeReturnUrl);
        }
    }

    let siteName = "";
    if (serverClient) {
        const { data } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "site_name")
            .single();
        if (data?.value) {
            let v = data.value;
            if (typeof v === "string" && v.startsWith('"')) {
                try {
                    v = JSON.parse(v);
                } catch {
                    v = "";
                }
            }
            if (typeof v === "string") siteName = v;
        }
    }
    return (
        <LoginForm
            siteName={siteName}
            returnUrl={safeReturnUrl}
            setupState={setupState}
            showDetailedSetupGuide
        />
    );
}
