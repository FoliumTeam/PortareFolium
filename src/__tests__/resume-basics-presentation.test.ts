import { describe, expect, it } from "vitest";
import {
    createResumeBasicsPresentationOverride,
    formatResumeBirthDate,
    formatResumeMilitary,
    normalizeResumeBasicsPresentationConfig,
    removeResumeBasicsPresentationOverride,
    resolveResumeBasicsPresentation,
} from "@/lib/resume-basics-presentation";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import type { Resume } from "@/types/resume";

describe("resume basics presentation", () => {
    it("설정이 없으면 민감 정보 비공개 split 기본값 사용", () => {
        const config = normalizeResumeBasicsPresentationConfig(undefined);

        expect(config.shared.headerPreset).toBe("split");
        expect(config.shared.personalDetailPreset).toBe("detailed");
        expect(config.shared.visibility.birthDate).toBe(false);
        expect(config.shared.visibility.military).toBe(false);
        expect(config.shared.visibility.email).toBe(true);
    });

    it("잘못된 preset은 안전한 기본값으로 정규화", () => {
        const config = normalizeResumeBasicsPresentationConfig({
            shared: {
                headerPreset: "unknown",
                personalDetailPreset: "unknown",
                visibility: { birthDate: true },
            },
        });

        expect(config.shared.headerPreset).toBe("split");
        expect(config.shared.personalDetailPreset).toBe("detailed");
        expect(config.shared.visibility.birthDate).toBe(true);
        expect(config.shared.visibility.military).toBe(false);
    });

    it("직무 분야 override 생성과 reset에서 공통값 보존", () => {
        const base = normalizeResumeBasicsPresentationConfig(undefined);
        const withOverride = createResumeBasicsPresentationOverride(
            base,
            "web"
        );
        const override = resolveResumeBasicsPresentation(withOverride, "web");

        expect(override).toEqual(base.shared);
        const reset = removeResumeBasicsPresentationOverride(
            withOverride,
            "web"
        );
        expect(reset.jobFields?.web).toBeUndefined();
        expect(reset.shared).toEqual(base.shared);
    });
});

describe("personal detail formatting", () => {
    it("상세·간결 생년월일 형식 제공", () => {
        expect(formatResumeBirthDate("2000-02-03", "detailed")).toBe(
            "2000.02.03"
        );
        expect(formatResumeBirthDate("2000-02-03", "concise")).toBe("2000년생");
    });

    it("상세·간결 병역 형식 제공", () => {
        const military = {
            status: "예시 상태",
            startDate: "2020-01",
            endDate: "2021-07",
        };

        expect(formatResumeMilitary(military, "detailed")).toBe(
            "예시 상태 · 2020.01–2021.07"
        );
        expect(formatResumeMilitary(military, "concise")).toBe("예시 상태");
    });
});

describe("job field headline", () => {
    it("직무별 직함을 공통 직함보다 우선", () => {
        const resume: Resume = {
            basics: {
                label: "공통 직함",
                headlineByJobField: { web: "웹 직함" },
            },
        };

        expect(createJobFieldResumeView(resume, "web").basics?.label).toBe(
            "웹 직함"
        );
        expect(createJobFieldResumeView(resume, "game").basics?.label).toBe(
            "공통 직함"
        );
    });
});
