import PortfolioDetailContent, {
    generateMetadata,
    generateStaticParams,
} from "./portfolio-detail-content";

export { generateMetadata, generateStaticParams };

export default async function PortfolioDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return <PortfolioDetailContent slug={(await params).slug} />;
}
