import { withContentLocale } from "@/lib/content-locale";
import { normalizeLocale } from "@/lib/i18n";
import { getPublicJobFieldParams } from "@/lib/public-route-params";

export const revalidate = 3600;
export const dynamic = "force-static";

export async function generateStaticParams({
    params,
}: {
    params: { locale: string };
}) {
    return withContentLocale(normalizeLocale(params.locale), async () => {
        return getPublicJobFieldParams();
    });
}

export default function JobFieldLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
