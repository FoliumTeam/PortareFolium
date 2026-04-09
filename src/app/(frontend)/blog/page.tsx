import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import {
    getFirstImageFromContent,
    getFirstThreeSentences,
    formatPubDateKST,
} from "@/lib/blog";
import type { PostItem, FilterMeta } from "@/components/BlogPage";
import BlogPage from "@/components/BlogPage";

export const revalidate = false;

export const metadata: Metadata = {
    title: "Blog",
    description: "기술 블로그",
};

export default async function BlogListPage() {
    let slugToTagName = new Map<string, string>();
    let slugToTagColor = new Map<string, string>();
    if (serverClient) {
        const { data: tagsData } = await serverClient
            .from("tags")
            .select("slug, name, color");
        if (tagsData) {
            slugToTagName = new Map(tagsData.map((t) => [t.slug, t.name]));
            slugToTagColor = new Map(
                tagsData
                    .filter((t) => t.color?.trim())
                    .map((t) => [t.slug, t.color!.trim()])
            );
        }
    }

    let postItems: PostItem[] = [];
    let categories: FilterMeta[] = [];
    let tags: FilterMeta[] = [];

    if (serverClient) {
        const { data: posts } = await serverClient
            .from("posts")
            .select(
                "slug, title, description, pub_date, category, tags, thumbnail, content"
            )
            .eq("published", true)
            .order("pub_date", { ascending: false });

        if (posts) {
            postItems = posts.map((post) => {
                const body: string = post.content ?? "";
                const firstImage = getFirstImageFromContent(body);
                const thumbRaw: string | null = post.thumbnail ?? null;
                const thumbnailUrl = thumbRaw || firstImage || null;
                const displayDescription =
                    post.description?.trim() ?? getFirstThreeSentences(body);
                const pubDate = new Date(post.pub_date);
                const tagList: string[] = post.tags ?? [];
                return {
                    slug: post.slug,
                    title: post.title,
                    displayDescription,
                    pubDateFormatted: formatPubDateKST(pubDate),
                    pubDateIso: pubDate.toISOString(),
                    category: post.category?.trim() ?? null,
                    tags: tagList,
                    tagsDisplay: tagList.map((t) => ({
                        name: slugToTagName.get(t) ?? t,
                        color: slugToTagColor.get(t),
                    })),
                    thumbnailUrl,
                };
            });

            const categoryCount = new Map<string, number>();
            const tagCount = new Map<string, number>();
            for (const p of postItems) {
                if (p.category)
                    categoryCount.set(
                        p.category,
                        (categoryCount.get(p.category) ?? 0) + 1
                    );
                for (const t of p.tags)
                    if (t) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
            }
            categories = [...categoryCount.entries()]
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => a.name.localeCompare(b.name));
            tags = [...tagCount.entries()]
                .map(([slug, count]) => ({
                    slug,
                    name: slugToTagName.get(slug) ?? slug,
                    count,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    return (
        <article className="scroll-reveal mx-auto max-w-5xl">
            {postItems.length === 0 ? (
                <>
                    <h1 className="mb-6 text-3xl font-bold text-(--color-foreground)">
                        Blog
                    </h1>
                    <p className="text-(--color-muted)">
                        아직 작성된 포스트가 없습니다. 어드민(/admin)에서
                        포스트를 추가해 보세요.
                    </p>
                </>
            ) : (
                <BlogPage
                    posts={postItems}
                    categories={categories}
                    tags={tags}
                    showWritePost={process.env.NODE_ENV === "development"}
                />
            )}
        </article>
    );
}
