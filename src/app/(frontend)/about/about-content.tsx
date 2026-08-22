import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import AboutView from "@/components/AboutView";
import type { AboutData } from "@/types/about";
import type { PublicJobField } from "@/lib/public-job-field";
import { getPublicResumeBasics, getSiteConfig } from "@/lib/queries";
import {
    normalizeResumeBasicsPresentationConfig,
    resolveResumeBasicsPresentation,
    RESUME_BASICS_PRESENTATION_CONFIG_KEY,
} from "@/lib/resume-basics-presentation";

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
    const [basics, configRows] = await Promise.all([
        getPublicResumeBasics(),
        getSiteConfig(),
    ]);
    const basicsPresentation = resolveResumeBasicsPresentation(
        normalizeResumeBasicsPresentationConfig(
            configRows.find(
                (row) => row.key === RESUME_BASICS_PRESENTATION_CONFIG_KEY
            )?.value
        ),
        jobField.id
    );

    if (serverClient) {
        const aboutRes = await serverClient
            .from("about_data")
            .select("data")
            .limit(1)
            .single();

        if (aboutRes.data?.data) {
            aboutData = aboutRes.data.data as AboutData;
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
        sections: {
            ...aboutData.sections,
            ...introduction?.sections,
        },
        competencySections: {
            ...aboutData.competencySections,
            ...introduction?.competencySections,
        },
    };

    return (
        <AboutView
            data={profileAboutData}
            basics={basics}
            basicsPresentation={basicsPresentation}
            jobField={jobField}
            valuePillars={
                introduction?.valuePillars ?? aboutData.valuePillars ?? []
            }
        />
    );
}
