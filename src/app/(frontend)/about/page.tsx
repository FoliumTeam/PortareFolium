import type { Metadata } from "next";
import ProfileSelectionPage from "@/components/ProfileSelectionPage";

export const metadata: Metadata = {
    title: "About me",
    description: "개발자 소개",
};

export default async function AboutPage() {
    return <ProfileSelectionPage content="about" />;
}
