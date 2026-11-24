"use server";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import { loadJobFieldSource, loadProfileSource } from "@/lib/resume-pdf/load";
import { buildResumePdfModel } from "@/lib/resume-pdf/model";
import {
    normalizePdfOptions,
    resolveEffectiveOptions,
} from "@/lib/resume-pdf/options";
import {
    defaultProjectSlugs,
    rowInJobField,
} from "@/lib/resume-pdf/visibility";
import { UNSUPPORTED_PDF_SECTIONS } from "@/lib/resume-pdf/warnings";
import { requireAdminSession } from "@/lib/server-admin";
import { unscopedServerClient } from "@/lib/supabase";
import type {
    Resume,
    ResumeBasicsVisibilityKey,
    ResumeCoreCompetency,
} from "@/types/resume";
import type { PdfLang } from "@/types/resume-pdf";

export type ResumePdfDefaults = {
    // 사이트 설정 순서의 섹션과 사이트 표시 여부
    sections: { key: string; on: boolean; supported: boolean }[];
    basics: Record<ResumeBasicsVisibilityKey, boolean>;
    // 고를 수 있는 프로젝트 (현재 직무, 공개분). on = 사이트 기본 집합
    projects: {
        slug: string;
        name: string;
        type: "work" | "personal" | "unknown";
        ai: boolean;
        on: boolean;
        subsections: string[];
    }[];
    core: { id: string; title: string }[];
};

type Result =
    | { success: true; data: ResumePdfDefaults }
    | { success: false; error: string };

// PDF 대화상자 첫 상태 = 사이트 표시 그대로 (읽기 전용)
export async function getResumePdfDefaults(input: {
    sourceKind: "job_field" | "application_profile";
    jobField: string;
    applicationProfileId?: string;
    lang: PdfLang;
}): Promise<Result> {
    await requireAdminSession();
    if (!unscopedServerClient) return { success: false, error: "DB 연결 없음" };
    if (input.lang !== "ko" && input.lang !== "ja")
        return { success: false, error: "잘못된 언어" };
    try {
        const loaded =
            input.sourceKind === "application_profile"
                ? await loadProfileSource(
                      unscopedServerClient,
                      input.lang,
                      input.applicationProfileId ?? ""
                  )
                : await loadJobFieldSource(
                      unscopedServerClient,
                      input.lang,
                      input.jobField
                  );
        if (!loaded) return { success: false, error: "지원 프로필 없음" };
        const { source } = loaded;
        const eff = resolveEffectiveOptions(source, normalizePdfOptions({}));
        const resume = source.resume as Resume;
        const rawCore = resume.coreCompetencies as unknown;
        const view = createJobFieldResumeView(
            {
                ...resume,
                coreCompetencies: Array.isArray(rawCore)
                    ? { entries: rawCore as ResumeCoreCompetency[] }
                    : resume.coreCompetencies,
            },
            source.jobField
        );
        const excluded = new Set(
            source.profileOverrides?.excludedPortfolioSlugs ?? []
        );
        const candidates = source.portfolio
            .filter(
                (row) =>
                    !excluded.has(row.slug) &&
                    rowInJobField(row, source.jobField)
            )
            .map((row) => row.slug);
        const on = new Set(defaultProjectSlugs(source));
        // 모든 후보를 넣은 모델로 이름·종류·하위 섹션 계산
        const model = buildResumePdfModel(
            source,
            normalizePdfOptions({
                sections: { projects: true },
                projects: { order: candidates },
            }),
            "2000-01-01"
        );
        const projects = Object.values(model.projects)
            .flat()
            .map((p) => ({
                slug: p.slug,
                name: p.name,
                type: p.type,
                ai: p.ai,
                on: on.has(p.slug),
                subsections: p.sections.map((s) => s.title),
            }));
        return {
            success: true,
            data: {
                sections: eff.sectionOrder.map((key) => ({
                    key,
                    on: eff.sections.has(key),
                    supported: !UNSUPPORTED_PDF_SECTIONS.includes(key),
                })),
                basics: eff.basics,
                projects,
                core: (view.coreCompetencies?.entries ?? []).map((c) => ({
                    id: c.pdfId ?? c.title,
                    title: c.title,
                })),
            },
        };
    } catch (error) {
        console.error(
            "[resume-pdf::defaults]",
            error instanceof Error ? error.message : "조회 실패"
        );
        return { success: false, error: "기본값 조회 실패" };
    }
}
