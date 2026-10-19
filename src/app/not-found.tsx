"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocaleProvider, useUILocale } from "@/components/LocaleProvider";
import { LocalizedText } from "@/components/LocalizedText";
import { getBrowserLocale, isLocale, UI_LOCALE_COOKIE } from "@/lib/i18n";

const FALLBACK_MESSAGES = {
    "페이지를 찾을 수 없습니다": "Page not found",
    "요청하신 페이지가 존재하지 않습니다.":
        "The requested page does not exist.",
    "{0}초 후 홈페이지로 자동으로 이동합니다.":
        "Returning to the home page in {0} seconds.",
    "홈으로 이동": "Go home",
};

const DetectNotFoundLanguage = () => {
    const { changeLocale } = useUILocale();
    useEffect(() => {
        const saved = document.cookie
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${UI_LOCALE_COOKIE}=`))
            ?.split("=")[1];
        void changeLocale(
            isLocale(saved)
                ? saved
                : getBrowserLocale(navigator.languages.join(",")),
            { persist: false }
        );
    }, []);
    return null;
};

const NotFoundContent = () => {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown <= 0) {
            router.push("/");
            return;
        }
        const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, router]);

    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
            <p className="mb-4 text-[8rem] leading-none font-black text-(--color-border)">
                404
            </p>
            <h1 className="mb-3 text-2xl font-bold text-(--color-foreground)">
                <LocalizedText text="페이지를 찾을 수 없습니다" />
            </h1>
            <p className="mb-8 leading-relaxed text-(--color-muted)">
                <LocalizedText text="요청하신 페이지가 존재하지 않습니다." />
                <br />
                <LocalizedText
                    text="{0}초 후 홈페이지로 자동으로 이동합니다."
                    values={[countdown]}
                />
            </p>
            <Link
                href="/"
                className="rounded-lg bg-(--color-accent) px-6 py-3 font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
            >
                <LocalizedText text="홈으로 이동" />
            </Link>
        </div>
    );
};

export default function NotFound() {
    const { provided } = useUILocale();
    if (provided) return <NotFoundContent />;
    return (
        <LocaleProvider initialLocale="en" initialMessages={FALLBACK_MESSAGES}>
            <DetectNotFoundLanguage />
            <NotFoundContent />
        </LocaleProvider>
    );
}
