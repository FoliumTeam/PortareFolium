"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-auth";

type GateState = "checking" | "granted" | "redirecting";

export default function AdminAccessGate({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [gateState, setGateState] = useState<GateState>("checking");

    useEffect(() => {
        const verify = async () => {
            if (status === "loading") return;

            if (status === "authenticated") {
                if (session?.user?.isAdmin) {
                    setGateState("granted");
                    return;
                }
                await signOut({ callbackUrl: "/admin/login" });
                return;
            }

            if (!browserClient) {
                setGateState("redirecting");
                router.replace("/admin/login?returnUrl=/admin");
                return;
            }

            const { data } = await browserClient.auth.getUser();
            const legacyEmail = data.user?.email ?? null;

            if (legacyEmail && isAdminEmail(legacyEmail)) {
                setGateState("redirecting");
                router.replace("/admin/migrate");
                return;
            }

            setGateState("redirecting");
            router.replace("/admin/login?returnUrl=/admin");
        };

        void verify();
    }, [router, session, status]);

    if (gateState !== "granted") {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <span className="text-sm text-(--color-muted)">
                    관리자 인증 확인 중...
                </span>
            </div>
        );
    }

    return <>{children}</>;
}
