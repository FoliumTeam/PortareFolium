"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMissingContentHref } from "@/lib/query-language";

// 정적 상세의 query를 보존한 조용한 목록 이동
const MissingContentRedirect = ({ href }: { href: string }) => {
    const router = useRouter();
    useEffect(() => {
        router.replace(
            getMissingContentHref(
                href,
                window.location.search,
                window.location.hash
            )
        );
    }, [href, router]);
    return null;
};

export default MissingContentRedirect;
