import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { redirectToOnlyPublicJobField } from "@/lib/plain-public-route";

export const metadata: Metadata = {
    title: "About me",
    description: "개발자 소개",
};

export default async function AboutPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    await redirectToOnlyPublicJobField("/about");
}
