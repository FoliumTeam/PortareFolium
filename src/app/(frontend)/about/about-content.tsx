import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import AboutView from "@/components/AboutView";
import type { AboutData } from "@/types/about";
import type { PublicJobField } from "@/lib/public-job-field";

export const revalidate = false;

export const metadata: Metadata = {
    title: "About me",
    description: "개발자 소개",
};

type AboutPageContentProps = {
    jobField: PublicJobField;
};

export default async function AboutPageContent({
    jobField,
}: AboutPageContentProps) {
    let aboutData: AboutData | null = null;
    let profileImage: string | null = null;

    if (serverClient) {
        const [aboutRes, resumeRes] = await Promise.all([
            serverClient.from("about_data").select("data").limit(1).single(),
            serverClient
                .from("resume_data")
                .select("data")
                .eq("lang", "ko")
                .single(),
        ]);

        if (aboutRes.data?.data) {
            aboutData = aboutRes.data.data as AboutData;
        }

        if (resumeRes.data?.data) {
            const basics = (
                resumeRes.data.data as { basics?: { image?: string } }
            ).basics;
            const img = basics?.image?.trim();
            if (img) profileImage = img;
        }
    }

    if (!aboutData) {
        return (
            <div className="py-12">
                <p className="text-sm text-red-500">
                    About 데이터를 불러오지 못했습니다
                </p>
            </div>
        );
    }

    const introduction = aboutData.introductions?.[jobField.id];
    const profileAboutData = {
        ...aboutData,
        description: introduction?.description ?? aboutData.description,
        descriptionSub:
            introduction?.descriptionSub ?? aboutData.descriptionSub,
        sections: introduction?.sections ?? aboutData.sections,
        competencySections:
            introduction?.competencySections ?? aboutData.competencySections,
    };

    return (
        <AboutView
            data={profileAboutData}
            profileImage={profileImage}
            jobField={jobField}
            valuePillars={
                introduction?.valuePillars ?? aboutData.valuePillars ?? []
            }
        />
    );
}
