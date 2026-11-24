// 이력서 PDF 시험용 합성 입력 (가상 인물·회사·slug)
import type { PortfolioRawRow } from "@/types/portfolio";
import type { Resume } from "@/types/resume";
import type { AboutData } from "@/types/about";
import type { ConfigRow } from "@/lib/resume-pdf/source";

export const ASOF = "2026-11-25";

export const resumeRow = (): Resume => ({
    basics: {
        name: "Test Person",
        label: "Default Label",
        email: "person@example.test",
        phone: "+82-10-0000-0000",
        birthDate: "1995-12-01",
        image: "https://img.example.test/me.png",
        location: { countryCode: "KR", region: "Seoul", city: "Mapo" },
        profiles: [{ network: "GitHub", url: "https://github.com/example" }],
        military: {
            status: "Completed",
            startDate: "2015-01",
            endDate: "2016-10",
        },
    },
    work: {
        emoji: "",
        showEmoji: false,
        entries: [
            {
                name: "Acme",
                position: "Intern",
                employmentType: "Intern",
                startDate: "2023-01-01",
                endDate: "2023-06-30",
                summary: "Intern work",
                highlights: ["Did A"],
                location: "Seoul",
                jobField: "web",
            },
            {
                name: "Acme",
                position: "Engineer",
                employmentType: "Full-time",
                startDate: "2023-07-01",
                summary: "Full-time work",
                highlights: ["Did B"],
                location: "Seoul",
                jobField: ["web"],
            },
            {
                name: "Globex",
                position: "Designer",
                employmentType: "Contract",
                startDate: "2021-03-01",
                endDate: "2022-02-28",
                summary: "Game work",
                highlights: ["Did C"],
                jobField: "game",
            },
            { name: "NoField", position: "X", startDate: "2020-01-01" },
        ],
    },
    projects: {
        emoji: "",
        showEmoji: false,
        entries: [
            {
                name: "Shop Revamp",
                portfolioSlug: "proj-work",
                description: "Rebuilt the shop.",
                sections: [
                    { title: "Result", content: "- Faster" },
                    { title: "Notes", content: "Long notes" },
                ],
                keywords: ["React", "Node"],
                projectType: "work",
                teamComposition: "FE 2, BE 1",
                jobField: "web",
            },
        ],
    },
    education: {
        emoji: "",
        showEmoji: false,
        entries: [
            {
                institution: "Example University",
                area: "Computer Science",
                studyType: "B.S.",
                startDate: "2014-03",
                endDate: "2020-08",
                gpa: 3.9,
                gpaMax: 4,
                courses: ["Algorithms"],
            },
            { institution: "Night School", startDate: "2025-03" },
            {
                institution: "Grad School",
                startDate: "2026-03",
                endDate: "2027-02",
            },
        ],
    },
    skills: {
        emoji: "",
        showEmoji: false,
        entries: [
            {
                name: "Frontend",
                keywords: [
                    { name: "React", level: "Advanced", jobField: "web" },
                    { name: "Unity", jobField: "game" },
                ],
            },
        ],
    },
    coreCompetencies: {
        entries: [
            {
                title: "Scaling web apps",
                description: "Ran big systems.",
                jobField: "web",
            },
            {
                title: "Side tooling",
                description: "Built Agent Kit for fun.",
                jobField: "web",
                pdfId: "core-side",
            },
        ],
    },
    languages: {
        emoji: "",
        showEmoji: false,
        entries: [{ language: "English", fluency: "Business" }],
    },
    volunteer: {
        emoji: "",
        showEmoji: false,
        entries: [{ organization: "Helpers" }],
    },
});

export const aboutRow = (): AboutData => ({
    description: "Generic about text",
    introductions: {
        web: { description: "Web intro.", descriptionSub: "Web sub." },
    },
});

const row = (
    slug: string,
    data: Record<string, unknown>,
    extra: Partial<PortfolioRawRow> = {}
): PortfolioRawRow => ({
    slug,
    title: `${slug} title`,
    description: `${slug} description. Second sentence.`,
    published: true,
    job_field: "web",
    data,
    ...extra,
});

export const portfolioRows = (): PortfolioRawRow[] => [
    row("proj-work", {
        startDate: "2024-01",
        endDate: "2024-06",
        projectType: "work",
        featuredByJobField: { web: true },
        featuredOrderByJobField: { web: 1 },
    }),
    row("proj-old", {
        startDate: "2019-01",
        projectType: "personal",
        featuredByJobField: { web: true },
        featuredOrderByJobField: { web: 3 },
    }),
    row("proj-new", {
        startDate: "2025-05",
        projectType: "personal",
        caseStudyVersion: 2,
        outcomes: [{ result: "Shipped", evidence: "1k users" }],
        featuredByJobField: { web: true },
        featuredOrderByJobField: { web: 2 },
    }),
    row(
        "agent-kit",
        {
            startDate: "2025-01",
            projectType: "personal",
            aiAgentAchievement: true,
            aiAgentSummary: "Runs agents safely.",
        },
        { title: "Agent Kit — tooling" }
    ),
    row("agent-plan", {
        startDate: "2026-01",
        projectType: "personal",
        aiAgentAchievement: true,
        aiAgentStatus: "planned",
    }),
    row("no-type", { startDate: "2022-01", featuredByJobField: { web: true } }),
    row(
        "game-only",
        { featuredByJobField: { game: true } },
        { job_field: "game" }
    ),
    row(
        "hidden-draft",
        { featuredByJobField: { web: true } },
        { published: false }
    ),
];

export const configRows = (): ConfigRow[] => [
    {
        key: "job_fields",
        value: JSON.stringify([{ id: "web", headerTitle: "Web Engineer" }]),
    },
    {
        key: "resume_section_layout",
        value: {
            order: [
                "coreCompetencies",
                "work",
                "projects",
                "skills",
                "education",
            ],
            disabled: [
                "awards",
                "certificates",
                "publications",
                "interests",
                "references",
                "careerPhases",
            ],
        },
    },
    {
        key: "resume_basics_presentation",
        value: {
            shared: { visibility: { birthDate: true, military: true } },
        },
    },
];
