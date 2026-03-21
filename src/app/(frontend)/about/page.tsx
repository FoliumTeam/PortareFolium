import type { Metadata } from "next";
import AboutView from "@/components/AboutView";

export const metadata: Metadata = {
    title: "About me",
    description: "개발자 소개",
};

export default function AboutPage() {
    return <AboutView />;
}
