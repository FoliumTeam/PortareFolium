"use client";

import { usePathname } from "next/navigation";

export default function ConditionalMain({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith("/admin");

    if (isAdmin) {
        return <main className="container mx-auto">{children}</main>;
    }

    return <main className="container mx-auto px-4 py-8">{children}</main>;
}
