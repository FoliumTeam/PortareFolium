import { getSiteConfig } from "@/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContentWrapper from "@/components/ContentWrapper";
import ScrollRevealInit from "@/components/ScrollRevealInit";

export default async function FrontendLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let siteName = "";

    const configRows = await getSiteConfig();
    const row = configRows.find((r) => r.key === "site_name");
    if (row?.value) {
        let v = row.value;
        if (typeof v === "string" && v.startsWith('"')) {
            try {
                v = JSON.parse(v);
            } catch {
                // invalid JSON
            }
        }
        if (typeof v === "string") siteName = v;
    }

    let githubUrl = "";
    const ghRow = configRows.find((r) => r.key === "github_url");
    if (ghRow?.value) {
        let v = ghRow.value;
        if (typeof v === "string" && v.startsWith('"')) {
            try {
                v = JSON.parse(v);
            } catch {
                // invalid JSON
            }
        }
        if (typeof v === "string") githubUrl = v;
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header siteName={siteName} githubUrl={githubUrl} />
            <ContentWrapper as="main" className="flex-1 px-4 py-8">
                {children}
            </ContentWrapper>
            <Footer siteName={siteName} githubUrl={githubUrl} />
            <ScrollRevealInit />
        </div>
    );
}
