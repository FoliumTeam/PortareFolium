import { getContentLocale } from "@/lib/content-locale";
import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/queries";
import { resolveSeoConfig } from "@/lib/seo-config";

const FALLBACK_TITLE = "PortareFolium";
const FALLBACK_DESCRIPTION = "포트폴리오 & 기술 블로그";

type SeoMetadataOptions = {
    title?: string;
};

// 공통·직무 분야 SEO 설정을 Next Metadata로 변환
export async function getSeoMetadata(
    jobField?: string,
    options: SeoMetadataOptions = {}
): Promise<Metadata> {
    const seo = resolveSeoConfig(await getSiteConfig(), jobField);
    const title = options.title?.trim() || seo.title || FALLBACK_TITLE;
    const locale = getContentLocale();
    const description =
        seo.description ||
        (locale === "ko"
            ? FALLBACK_DESCRIPTION
            : locale === "ja"
              ? "ポートフォリオと技術ブログ"
              : "Portfolio and technical blog");
    const images = seo.ogImage ? [seo.ogImage] : undefined;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images,
        },
    };
}
