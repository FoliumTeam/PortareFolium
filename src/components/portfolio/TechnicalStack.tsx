import { SkillBadge } from "@/components/resume/SkillBadge";

type TechnicalStackCategory =
    | "Frontend"
    | "Backend"
    | "프로그래밍 언어"
    | "DevOps"
    | "UI 도구";

type TechnicalStackGroup = {
    category: TechnicalStackCategory;
    keywords: string[];
};

const CATEGORY_ORDER: TechnicalStackCategory[] = [
    "Frontend",
    "Backend",
    "프로그래밍 언어",
    "DevOps",
    "UI 도구",
];

const TECHNICAL_STACK_CATEGORY: Record<string, TechnicalStackCategory> = {
    react: "Frontend",
    "next.js": "Frontend",
    nextjs: "Frontend",
    "tailwind css": "Frontend",
    vite: "Frontend",
    zustand: "Frontend",
    "radix ui": "Frontend",
    "shadcn ui": "Frontend",
    "shadcn-ui": "Frontend",
    mdx: "Frontend",
    fastapi: "Backend",
    pandas: "Backend",
    "dlr sumo": "Backend",
    tibero: "Backend",
    nestjs: "Backend",
    "node.js": "Backend",
    nodejs: "Backend",
    postgresql: "Backend",
    mongodb: "Backend",
    sqlite3: "Backend",
    sqlite: "Backend",
    supabase: "Backend",
    "synology nas api": "Backend",
    "nexon api": "Backend",
    nextauth: "Backend",
    mcp: "Backend",
    typescript: "프로그래밍 언어",
    javascript: "프로그래밍 언어",
    rust: "프로그래밍 언어",
    python: "프로그래밍 언어",
    java: "프로그래밍 언어",
    cplusplus: "프로그래밍 언어",
    "c++": "프로그래밍 언어",
    docker: "DevOps",
    cli: "DevOps",
    markdown: "DevOps",
    yaml: "DevOps",
    toml: "DevOps",
    ed25519: "Backend",
    "amazon s3": "DevOps",
    "aws s3": "DevOps",
    "cloudflare r2": "DevOps",
    github: "DevOps",
    storybook: "UI 도구",
    figma: "UI 도구",
};

const normalizeKeyword = (keyword: string): string =>
    keyword.trim().toLowerCase().replace(/\s+/g, " ");

/** Portfolio 기술 태그를 화면 표시 순서에 맞는 분야별 목록으로 정리 */
export const groupTechnicalStack = (
    keywords: string[]
): TechnicalStackGroup[] => {
    const groups = new Map<TechnicalStackCategory, string[]>();

    for (const keyword of keywords) {
        const category = TECHNICAL_STACK_CATEGORY[normalizeKeyword(keyword)];
        if (!category) continue;
        const current = groups.get(category) ?? [];
        if (!current.includes(keyword)) current.push(keyword);
        groups.set(category, current);
    }

    return CATEGORY_ORDER.flatMap((category) => {
        const categorizedKeywords = groups.get(category) ?? [];
        return categorizedKeywords.length > 0
            ? [{ category, keywords: categorizedKeywords }]
            : [];
    });
};

type TechnicalStackProps = {
    keywords: string[];
};

export default function TechnicalStack({ keywords }: TechnicalStackProps) {
    const groups = groupTechnicalStack(keywords);
    if (groups.length === 0) return null;

    return (
        <div className="mt-5 space-y-3" aria-label="기술 스택">
            {groups.map((group) => (
                <div
                    key={group.category}
                    className="flex flex-wrap gap-x-4 gap-y-2"
                >
                    <p className="w-28 shrink-0 pt-1 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                        {group.category}
                    </p>
                    <div className="flex flex-1 flex-wrap gap-2">
                        {group.keywords.map((keyword) => (
                            <SkillBadge key={keyword} name={keyword} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
