import { setRequestLocale } from "@/lib/content-locale";
import { serverT } from "@/lib/server-i18n";
import type { Metadata } from "next";
import { redirectToOnlyPublicJobField } from "@/lib/plain-public-route";

// 경로 언어에 맞춘 기본 페이지 설명
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    setRequestLocale((await params).locale);
    return {
        title: serverT("Portfolio"),
        description: serverT("프로젝트 포트폴리오"),
    };
}

export default async function PortfolioPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    await redirectToOnlyPublicJobField("/portfolio");
}
