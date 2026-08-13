import type { Metadata } from "next";
import ProfileSelectionPage from "@/components/ProfileSelectionPage";

export const metadata: Metadata = {
    title: "Portfolio",
    description: "프로젝트 포트폴리오",
};

export default async function PortfolioPage() {
    return <ProfileSelectionPage content="portfolio" />;
}
