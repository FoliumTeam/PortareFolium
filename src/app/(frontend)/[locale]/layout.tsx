import { notFound } from "next/navigation";
import DocumentLayout, {
    getDocumentMetadata,
} from "@/components/DocumentLayout";
import FrontendLayout from "@/components/FrontendLayout";
import { LOCALES, isLocale } from "@/lib/i18n";
import { setRequestLocale, withContentLocale } from "@/lib/content-locale";

export const revalidate = 3600;
export const dynamic = "force-static";

export const generateStaticParams = async () =>
    LOCALES.map((locale) => ({ locale }));

export const generateMetadata = async ({
    params,
}: {
    params: Promise<{ locale: string }>;
}) => {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    setRequestLocale(locale);
    return withContentLocale(locale, getDocumentMetadata);
};

export default async function LocalizedLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return withContentLocale(locale, async () =>
        DocumentLayout({ locale, children: await FrontendLayout({ children }) })
    );
}
