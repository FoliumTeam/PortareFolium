import type { Metadata } from "next";
import "@/styles/global.css";
import "katex/dist/katex.min.css";
import { getSiteConfig } from "@/lib/queries";
import { ALL_SCHEME_IDS } from "@/lib/color-schemes";
import ColoredTableColorSync from "@/components/ColoredTableColorSync";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "PortareFolium",
    description: "포트폴리오 & 기술 블로그",
    icons: { icon: "/favicon.svg" },
    verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
        other: process.env.NEXT_PUBLIC_NAVER_VERIFICATION
            ? {
                  "naver-site-verification":
                      process.env.NEXT_PUBLIC_NAVER_VERIFICATION,
              }
            : undefined,
    },
};

const VALID_SCHEMES: readonly string[] = ALL_SCHEME_IDS;

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let colorScheme: string = process.env.NEXT_PUBLIC_COLOR_SCHEME ?? "blue";
    let plainMode = false;

    const configRows = await getSiteConfig();
    for (const row of configRows) {
        let v = row.value;
        if (typeof v === "string" && v.startsWith('"')) v = JSON.parse(v);
        if (row.key === "color_scheme" && typeof v === "string")
            colorScheme = v;
        if (row.key === "plain_mode") plainMode = v === true || v === "true";
    }

    const validScheme = VALID_SCHEMES.includes(colorScheme)
        ? colorScheme
        : "blue";

    return (
        <html
            lang="ko"
            data-color-scheme={validScheme}
            {...(plainMode ? { "data-plain": "" } : {})}
            data-scroll-behavior="smooth"
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){var t=localStorage.getItem("theme")||"system";var s=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(t==="system"&&s)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}var p=localStorage.getItem("folium_plain_mode");if(p==="true"){document.documentElement.setAttribute("data-plain","")}else if(p==="false"){document.documentElement.removeAttribute("data-plain")}})();`,
                    }}
                />
            </head>
            <body className="min-h-screen bg-(--color-surface) text-(--color-foreground) transition-colors">
                <AuthSessionProvider>{children}</AuthSessionProvider>
                <Toaster />
                <ColoredTableColorSync />
                {process.env.VERCEL && (
                    <>
                        <SpeedInsights />
                        <Analytics />
                    </>
                )}
            </body>
        </html>
    );
}
