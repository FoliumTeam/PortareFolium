import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import { redirectToOnlyPublicJobField } from "@/lib/plain-public-route";

export default async function HomePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    await redirectToOnlyPublicJobField("");
}
