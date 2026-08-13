import type { Metadata } from "next";
import ProfileSelectionPage from "@/components/ProfileSelectionPage";

export const metadata: Metadata = {
    title: "Blog",
    description: "기술 블로그",
};

export default async function BlogPage() {
    return <ProfileSelectionPage content="blog" />;
}
