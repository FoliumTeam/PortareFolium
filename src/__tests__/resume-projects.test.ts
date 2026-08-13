import { describe, expect, it } from "vitest";
import { getCompactProjects } from "@/components/resume/ProjectsSection";
import type { ResumeProject } from "@/types/resume";

describe("getCompactProjects", () => {
    it("관리자 Resume 배열 순서를 유지하고 연결된 프로젝트만 최대 5건 선택", () => {
        const projects: ResumeProject[] = [
            { name: "첫 번째", portfolioSlug: "first", endDate: "2020-01" },
            { name: "연결 없음", endDate: "2030-01" },
            { name: "두 번째", portfolioSlug: "second", endDate: "2025-01" },
            { name: "세 번째", portfolioSlug: "third", endDate: "2024-01" },
        ];

        const result = getCompactProjects(projects, {
            first: { slug: "first" },
            second: { slug: "second" },
            third: { slug: "third" },
        });

        expect(result.map((entry) => entry.project.name)).toEqual([
            "첫 번째",
            "두 번째",
            "세 번째",
        ]);
    });
});
