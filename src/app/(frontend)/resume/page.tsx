import type { Metadata } from "next";
import ProfileSelectionPage from "@/components/ProfileSelectionPage";

export const metadata: Metadata = {
    title: "Resume",
    description: "이력서",
};

export default async function ResumePage() {
    return <ProfileSelectionPage content="resume" />;
}
