"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-auth";

export default function MigrationGuide({ siteName }: { siteName: string }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [legacyEmail, setLegacyEmail] = useState<string | null>(null);
    const [loadingLegacy, setLoadingLegacy] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadLegacyUser = async () => {
            if (!browserClient) {
                setLoadingLegacy(false);
                router.replace("/admin/login?returnUrl=/admin/migrate");
                return;
            }

            const { data, error: authError } =
                await browserClient.auth.getUser();
            if (authError) {
                setLoadingLegacy(false);
                router.replace("/admin/login?returnUrl=/admin/migrate");
                return;
            }

            const email = data.user?.email ?? null;
            if (!email || !isAdminEmail(email)) {
                setLoadingLegacy(false);
                router.replace("/admin/login?returnUrl=/admin/migrate");
                return;
            }

            setLegacyEmail(email);
            setLoadingLegacy(false);
        };

        void loadLegacyUser();
    }, [router]);

    const handleGoogleTransition = async () => {
        setError(null);
        await signIn("google", { callbackUrl: "/admin/migrate" });
    };

    const handleFinalize = async () => {
        if (!browserClient) {
            router.replace("/admin");
            return;
        }
        await browserClient.auth.signOut();
        router.replace("/admin");
    };

    if (loadingLegacy) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <span className="text-sm text-(--color-muted)">
                    Legacy 계정 확인 중...
                </span>
            </div>
        );
    }

    const nextAuthReady =
        status === "authenticated" && session?.user?.isAdmin === true;

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-8 shadow-sm">
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-(--color-foreground)">
                    계정 전환
                </h1>
                <p className="text-sm text-(--color-muted)">
                    {siteName || "PortareFolium"} 관리자 계정을 Supabase
                    로그인에서 Google 로그인으로 전환
                </p>
            </div>

            <div className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4 text-sm text-(--color-foreground)">
                현재 확인된 legacy 계정:{" "}
                <span className="font-semibold">{legacyEmail}</span>
            </div>

            <ol className="list-decimal space-y-3 pl-5 text-sm text-(--color-foreground)">
                <li>아래 버튼으로 Google OAuth 로그인 시작</li>
                <li>같은 관리자 이메일로 Google 로그인 완료</li>
                <li>완료 버튼을 눌러 기존 Supabase 세션 정리</li>
                <li>이후부터는 Google 로그인만 사용</li>
            </ol>

            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                </p>
            )}

            {!nextAuthReady ? (
                <button
                    type="button"
                    onClick={() => void handleGoogleTransition()}
                    className="rounded-2xl bg-(--color-accent) px-4 py-3 text-sm font-bold text-(--color-on-accent) transition-opacity hover:opacity-90"
                >
                    Google로 전환
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => void handleFinalize()}
                    className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                    전환 완료
                </button>
            )}
        </div>
    );
}
