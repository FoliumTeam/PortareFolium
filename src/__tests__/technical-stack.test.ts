import { describe, expect, it } from "vitest";
import { groupTechnicalStack } from "@/components/portfolio/TechnicalStack";

describe("groupTechnicalStack", () => {
    it("분야별 줄을 지정된 순서로 만들고 주제 태그는 제외한다", () => {
        expect(
            groupTechnicalStack([
                "Storybook",
                "TypeScript",
                "React",
                "Amazon S3",
                "FastAPI",
                "Shadcn-UI",
                "Pandas",
                "정적 웹사이트 배포",
            ])
        ).toEqual([
            { category: "Frontend", keywords: ["React", "Shadcn-UI"] },
            { category: "Backend", keywords: ["FastAPI", "Pandas"] },
            { category: "프로그래밍 언어", keywords: ["TypeScript"] },
            { category: "DevOps", keywords: ["Amazon S3"] },
            { category: "UI 도구", keywords: ["Storybook"] },
        ]);
    });

    it("현재 웹 포트폴리오의 기술 태그는 모두 분야에 배정한다", () => {
        const technicalKeywords = [
            "React",
            "TypeScript",
            "Tailwind CSS",
            "Amazon S3",
            "Storybook",
            "GitHub",
            "FastAPI",
            "Pandas",
            "DLR SUMO",
            "Tibero",
            "PostgreSQL",
            "Docker",
            "Next.js",
            "Supabase",
            "Node.js",
            "Nexon API",
            "MongoDB",
            "MDX",
            "Shadcn-UI",
            "Radix UI",
            "Zustand",
            "NestJS",
            "Synology NAS API",
            "JavaScript",
            "Cloudflare R2",
            "NextAuth",
            "MCP",
        ];

        const assignedKeywords = groupTechnicalStack(technicalKeywords).flatMap(
            (group) => group.keywords
        );

        expect(assignedKeywords).toHaveLength(technicalKeywords.length);
        expect(new Set(assignedKeywords)).toEqual(new Set(technicalKeywords));
    });

    it("Rust 기반 AI 작업 환경의 기술 태그를 분야에 배정한다", () => {
        expect(
            groupTechnicalStack([
                "Rust",
                "CLI",
                "SQLite",
                "Markdown",
                "YAML",
                "TOML",
                "Ed25519",
            ])
        ).toEqual([
            { category: "Backend", keywords: ["SQLite", "Ed25519"] },
            { category: "프로그래밍 언어", keywords: ["Rust"] },
            {
                category: "DevOps",
                keywords: ["CLI", "Markdown", "YAML", "TOML"],
            },
        ]);
    });
});
