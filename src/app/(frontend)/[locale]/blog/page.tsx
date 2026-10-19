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
    return { title: serverT("Blog"), description: serverT("기술 블로그") };
}

export default async function BlogPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    setRequestLocale((await params).locale);

    await redirectToOnlyPublicJobField("/blog");
}
