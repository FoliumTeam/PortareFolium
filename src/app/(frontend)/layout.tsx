import { serverClient } from "@/lib/supabase";
import Header from "@/components/Header";

export default async function FrontendLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let siteName = "";

    if (serverClient) {
        const { data } = await serverClient
            .from("site_config")
            .select("value")
            .eq("key", "site_name")
            .single();

        if (data && data.value) {
            let v = data.value;
            if (typeof v === "string" && v.startsWith('"')) {
                try {
                    v = JSON.parse(v);
                } catch (e) {}
            }
            if (typeof v === "string") {
                siteName = v;
            }
        }
    }

    const isDev = process.env.NODE_ENV === "development";

    return (
        <>
            <Header siteName={siteName} isDev={isDev} />
            <main className="container mx-auto px-4 py-8">{children}</main>
        </>
    );
}
