import type { Metadata } from "next";
import "@/styles/global.css";
import "katex/dist/katex.min.css";
import { serverClient } from "@/lib/supabase";
import ConditionalHeader from "@/components/ConditionalHeader";
import ConditionalMain from "@/components/ConditionalMain";
import FoliumTableColorSync from "@/components/FoliumTableColorSync";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "PortareFolium",
    description: "포트폴리오 & 기술 블로그",
    icons: { icon: "/favicon.svg" },
};

const VALID_SCHEMES = [
    "blue",
    "gray",
    "beige",
    "blackwhite",
    "forest",
    "sunset",
    "lavender",
    "blue-plain",
    "beige-plain",
    "forest-plain",
    "sunset-plain",
    "lavender-plain",
];

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let colorScheme: string = process.env.NEXT_PUBLIC_COLOR_SCHEME ?? "gray";
    let siteName = "";

    if (serverClient) {
        const { data: rows } = await serverClient
            .from("site_config")
            .select("key, value")
            .in("key", ["color_scheme", "site_name"]);
        if (rows) {
            for (const row of rows) {
                let v = row.value;
                if (typeof v === "string" && v.startsWith('"'))
                    v = JSON.parse(v);
                if (row.key === "color_scheme" && typeof v === "string")
                    colorScheme = v;
                else if (row.key === "site_name" && typeof v === "string")
                    siteName = v;
            }
        }
    }

    const validScheme = VALID_SCHEMES.includes(colorScheme)
        ? colorScheme
        : "gray";
    const isDev = process.env.NODE_ENV === "development";

    return (
        <html
            lang="ko"
            data-color-scheme={validScheme}
            data-scroll-behavior="smooth"
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){var t=localStorage.getItem("theme")||"system";var s=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(t==="system"&&s)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}var c=localStorage.getItem("folium_color_scheme");if(c){document.documentElement.setAttribute("data-color-scheme",c)}})();`,
                    }}
                />
            </head>
            <body className="min-h-screen bg-(--color-surface) text-(--color-foreground) transition-colors">
                <ConditionalHeader siteName={siteName} isDev={isDev} />
                <ConditionalMain>{children}</ConditionalMain>
                <FoliumTableColorSync />
                <SpeedInsights />
            </body>
        </html>
    );
}
