import { describe, expect, it } from "vitest";
import { getCompactPortfolioProjects } from "@/components/resume/ProjectsSection";
import type { PortfolioProject } from "@/types/portfolio";

const createProject = (
    slug: string,
    jobField: string,
    featured: boolean,
    featuredOrder: number
): PortfolioProject => ({
    slug,
    title: slug,
    description: "",
    content: "",
    startDate: "",
    endDate: "",
    goal: "",
    role: "",
    teamSize: 1,
    accomplishments: [],
    keywords: [],
    github: "",
    public: true,
    published: true,
    featured,
    featuredByJobField: { [jobField]: featured },
    featuredOrderByJobField: { [jobField]: featuredOrder },
    orderIdx: featuredOrder,
    jobField,
    badges: [],
    caseStudyVersion: 1,
    caseStudyStyle: "game",
    oneLinePitch: "",
    engine: "",
    platforms: [],
    ownership: [],
    outcomes: [],
    gallery: [],
    links: [],
    devlogs: [],
    credits: [],
    projectType: "personal",
    teamComposition: "",
});

describe("getCompactPortfolioProjects", () => {
    it("직무 분야별 Portfolio Featured 순서대로 최대 5건을 선택", () => {
        const projects = [
            createProject("web", "web", true, 1),
            createProject("game-second", "game", true, 2),
            createProject("game-first", "game", true, 1),
            createProject("game-other", "game", false, 3),
            createProject("game-third", "game", true, 3),
            createProject("game-fourth", "game", true, 4),
            createProject("game-fifth", "game", true, 5),
            createProject("game-sixth", "game", true, 6),
        ];

        const result = getCompactPortfolioProjects(projects, "game");

        expect(result.map((project) => project.slug)).toEqual([
            "game-first",
            "game-second",
            "game-third",
            "game-fourth",
            "game-fifth",
        ]);
    });
});
