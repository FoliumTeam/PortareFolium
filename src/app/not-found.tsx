"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown <= 0) {
            router.push("/");
            return;
        }
        const t = setTimeout(() => setCountdown((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, router]);

    return (
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
            <p className="mb-4 text-[8rem] leading-none font-black text-(--color-border)">
                404
            </p>
            <h1 className="mb-3 text-2xl font-bold text-(--color-foreground)">
                페이지를 찾을 수 없습니다
            </h1>
            <p className="mb-8 leading-relaxed text-(--color-muted)">
                요청하신 페이지가 존재하지 않습니다.
                <br />
                <span>{countdown}</span>초 후 홈페이지로 자동으로 이동합니다.
            </p>
            <Link
                href="/"
                className="rounded-lg bg-(--color-accent) px-6 py-3 font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
            >
                홈으로 이동
            </Link>
        </div>
    );
}
