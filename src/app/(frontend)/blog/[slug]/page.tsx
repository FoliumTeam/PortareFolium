import BlogPostContent, {
    generateMetadata,
    generateStaticParams,
} from "./blog-post-content";

export { generateMetadata, generateStaticParams };

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return <BlogPostContent slug={(await params).slug} />;
}
