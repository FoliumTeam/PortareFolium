import { getSiteConfig } from "@/lib/queries";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContentWrapper from "@/components/ContentWrapper";
import { normalizeThemeMode, type ThemeMode } from "@/lib/theme-mode";
import { getPublicJobFields } from "@/lib/public-job-field";

export default async function FrontendLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let siteName = "";
    let themeMode: ThemeMode = "system";

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

    const themeModeRow = configRows.find((r) => r.key === "theme_mode");
    if (themeModeRow) {
        let value = themeModeRow.value;
        if (typeof value === "string" && value.startsWith('"')) {
            try {
                value = JSON.parse(value);
            } catch {
                // invalid JSON
            }
        }
        themeMode = normalizeThemeMode(value);
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

    const jobFields = await getPublicJobFields();

    return (
        <div className="flex min-h-screen flex-col">
            <Header
                siteName={siteName}
                githubUrl={githubUrl}
                jobFieldIds={jobFields.map((field) => field.id)}
                themeMode={themeMode}
            />
            <ContentWrapper as="main" className="flex-1 px-4 py-8">
                {children}
            </ContentWrapper>
            <Footer siteName={siteName} githubUrl={githubUrl} />
        </div>
    );
}
