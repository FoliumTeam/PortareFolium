import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { redirectToOnlyPublicJobField } from "@/lib/plain-public-route";

export const metadata: Metadata = {
    title: "Resume",
    description: "이력서",
};

export default async function ResumePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    await redirectToOnlyPublicJobField("/resume");
}
