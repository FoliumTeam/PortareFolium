import { getPublicJobFieldParams } from "@/lib/public-route-params";

export const revalidate = 3600;
export const dynamic = "force-static";

export async function generateStaticParams() {
    return getPublicJobFieldParams();
}

export default function JobFieldLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
