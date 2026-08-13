import BookDetailContent, {
    generateMetadata,
    generateStaticParams,
} from "./book-detail-content";

export { generateMetadata, generateStaticParams };

export default async function BookDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return <BookDetailContent slug={(await params).slug} />;
}
