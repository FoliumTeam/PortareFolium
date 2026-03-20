"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function ConditionalHeader({
    siteName,
    isDev,
}: {
    siteName: string;
    isDev: boolean;
}) {
    const pathname = usePathname();
    if (pathname.startsWith("/admin")) return null;
    return <Header siteName={siteName} isDev={isDev} />;
}
