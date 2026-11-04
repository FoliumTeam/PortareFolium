import { setRequestLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    notFound();
}
