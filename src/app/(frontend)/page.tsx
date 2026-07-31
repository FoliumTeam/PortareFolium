import Link from "next/link";
import { serverClient } from "@/lib/supabase";
import { formatPubDateKST } from "@/lib/blog";
import type { Metadata } from "next";
import LandingHero from "@/components/LandingHeroSwitcher";
import PortfolioProjectGrid from "@/components/portfolio/PortfolioProjectGrid";
import {
    groupPortfolioProjects,
    matchesPortfolioJobField,
    normalizePortfolioProject,
} from "@/lib/portfolio";
import type { PortfolioProject, PortfolioRawRow } from "@/types/portfolio";

export const revalidate = false;

const PORTFOLIO_PROJ_MAX_NUM = 4;
const BLOG_POST_MAX_NUM = 5;

// DB 미설정 시 placeholder (Admin에서 입력 유도)
const PLACEHOLDER_VALUE_PILLARS = [
    {
        label: "Pillar 1",
        sub: "Sub 1",
        description: "Admin에서 Value Pillar를 입력하세요",
    },
    {
        label: "Pillar 2",
        sub: "Sub 2",
        description: "Admin에서 Value Pillar를 입력하세요",
    },
    {
        label: "Pillar 3",
        sub: "Sub 3",
        description: "Admin에서 Value Pillar를 입력하세요",
    },
];

const PLACEHOLDER_CORE_VALUES = [
    {
        title: "Value 1",
        description: "Admin에서 Core Compentency를 입력하세요",
    },
    {
        title: "Value 2",
        description: "Admin에서 Core Compentency를 입력하세요",
    },
    {
        title: "Value 3",
        description: "Admin에서 Core Compentency를 입력하세요",
    },
];

interface AboutData {
    name?: string;
    description?: string;
    descriptionSub?: string;
    valuePillars?: { label: string; sub: string; description: string }[];
    coreCompetencies?: { title: string; description: string }[];
}
interface WorkItem {
    name?: string;
    url?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    jobField?: string | string[];
}
interface PostPreview {
    slug: string;
    title: string;
    displayDescription: string;
    pubDateFormatted: string;
    pubDateIso: string;
    category: string | null;
    thumbnailUrl: string | null;
}

export async function generateMetadata(): Promise<Metadata> {
    let description = "포트폴리오와 기술 블로그가 함께하는 공간입니다.";
    if (serverClient) {
        const { data } = await serverClient
            .from("about_data")
            .select("data")
            .limit(1)
            .single();
        if (data?.data) {
            const about = data.data as { description?: string };
            if (about.description) description = about.description;
        }
    }
    return { description };
}

export default async function HomePage() {
    let about: AboutData = {};
    let siteName = "";
    let profileImage: string | undefined;
    let workItems: WorkItem[] = [];
    let activeJobField = process.env.NEXT_PUBLIC_JOB_FIELD ?? "game";

    if (serverClient) {
        const [aboutRes, siteRes, resumeRes, jobFieldRes] = await Promise.all([
            serverClient.from("about_data").select("data").limit(1).single(),
            serverClient
                .from("site_config")
                .select("value")
                .eq("key", "site_name")
                .single(),
            serverClient
                .from("resume_data")
                .select("data")
                .eq("lang", "ko")
                .single(),
            serverClient
                .from("site_config")
                .select("value")
                .eq("key", "job_field")
                .single(),
        ]);
        if (aboutRes.data) about = aboutRes.data.data as AboutData;
        if (siteRes.data?.value) {
            let v = siteRes.data.value;
            if (typeof v === "string" && v.startsWith('"')) v = JSON.parse(v);
            if (typeof v === "string") siteName = v;
        }
        if (resumeRes.data?.data) {
            const resumeFull = resumeRes.data.data as {
                basics?: { image?: string };
                work?: { entries?: WorkItem[] };
            };
            const img = resumeFull.basics?.image?.trim();
            if (img) profileImage = img;

            if (jobFieldRes.data?.value) {
                const raw = jobFieldRes.data.value;
                try {
                    activeJobField =
                        typeof raw === "string" && raw.startsWith('"')
                            ? JSON.parse(raw)
                            : raw;
                } catch {
                    activeJobField = "game";
                }
            }
            workItems = (resumeFull.work?.entries ?? [])
                .filter((w) => {
                    const jf = w.jobField;
                    if (!jf || (Array.isArray(jf) && jf.length === 0))
                        return false;
                    if (Array.isArray(jf)) return jf.includes(activeJobField);
                    return jf === activeJobField;
                })
                .sort((a, b) =>
                    (b.startDate ?? "").localeCompare(a.startDate ?? "")
                )
                .slice(0, 4);
        }
    }

    let featuredItems: PortfolioProject[] = [];
    if (serverClient) {
        const { data } = await serverClient
            .from("portfolio_items")
            .select(
                "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, job_field"
            )
            .eq("published", true)
            .order("order_idx", { ascending: true });
        if (data) {
            featuredItems = groupPortfolioProjects(
                data
                    .map((item) =>
                        normalizePortfolioProject(item as PortfolioRawRow)
                    )
                    .filter((project) =>
                        matchesPortfolioJobField(project, activeJobField)
                    )
            ).selected.slice(0, PORTFOLIO_PROJ_MAX_NUM);
        }
    }

    let latestPosts: PostPreview[] = [];
    if (serverClient) {
        const { data } = await serverClient
            .from("posts")
            .select("slug, title, description, pub_date, category, thumbnail")
            .eq("published", true)
            .order("pub_date", { ascending: false })
            .limit(BLOG_POST_MAX_NUM);
        if (data) {
            latestPosts = data.map(
                (p: {
                    slug: string;
                    title: string;
                    description: string | null;
                    pub_date: string;
                    category: string | null;
                    thumbnail: string | null;
                }) => ({
                    slug: p.slug,
                    title: p.title,
                    displayDescription: p.description?.trim() || "",
                    pubDateFormatted: formatPubDateKST(new Date(p.pub_date)),
                    pubDateIso: new Date(p.pub_date).toISOString(),
                    category: p.category?.trim() ?? null,
                    thumbnailUrl: p.thumbnail || null,
                })
            );
        }
    }

    const heroName = about.name ?? siteName;
    const heroDesc =
        about.description ?? "포트폴리오와 기술 블로그가 함께하는 공간입니다.";
    const valuePillars =
        about.valuePillars && about.valuePillars.length > 0
            ? about.valuePillars
            : PLACEHOLDER_VALUE_PILLARS;
    const coreCompetencies =
        about.coreCompetencies && about.coreCompetencies.length > 0
            ? about.coreCompetencies
            : PLACEHOLDER_CORE_VALUES;

    return (
        <>
            {/* Hero */}
            <LandingHero
                heroName={heroName}
                heroDesc={heroDesc}
                descriptionSub={about.descriptionSub}
                profileImage={profileImage}
                valuePillars={valuePillars}
            />

            {/* Portfolio Featured */}
            {featuredItems.length > 0 && (
                <section className="border-t border-(--color-border) py-14">
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                                Featured Work
                            </p>
                            <h2 className="text-3xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                                Portfolio
                            </h2>
                        </div>
                        <Link
                            href="/portfolio"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                        >
                            전체 보기
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    </div>

                    <PortfolioProjectGrid
                        projects={featuredItems}
                        featuredLayout
                    />
                </section>
            )}

            {/* 핵심 역량 */}
            <section className="border-t border-(--color-border) py-16">
                <div className="mb-10">
                    <p className="mb-1 text-sm font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                        Core Competencies
                    </p>
                    <h2 className="text-4xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                        핵심 역량
                    </h2>
                </div>
                <div className="tablet:grid-cols-2 grid grid-cols-1 gap-5">
                    {coreCompetencies.map((comp, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                        >
                            <div className="mb-3 flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--color-accent)/10 text-sm font-(--font-display) font-bold text-(--color-accent)">
                                    {String(idx + 1).padStart(2, "0")}
                                </span>
                                <h3 className="text-lg font-(--font-display) font-bold text-(--color-foreground)">
                                    {comp.title}
                                </h3>
                            </div>
                            <p className="text-sm leading-relaxed text-(--color-muted)">
                                {comp.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Work Experience */}
            {workItems.length > 0 && (
                <section className="border-t border-(--color-border) py-14">
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                                Experience
                            </p>
                            <h2 className="text-3xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                                Work
                            </h2>
                        </div>
                        <Link
                            href="/resume"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                        >
                            전체 이력서 보기
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    </div>
                    <div className="relative border-l-[3px] border-(--color-border) pl-8">
                        {workItems.map((w, idx) => (
                            <div key={idx} className="relative pb-10 last:pb-0">
                                <div
                                    className="absolute top-1 h-4 w-4 rounded-full border-2 border-(--color-accent) bg-(--color-surface)"
                                    style={{ left: "calc(-2rem - 9.5px)" }}
                                />
                                {(w.startDate || w.endDate) && (
                                    <p className="mb-1 text-[0.8rem] font-bold tracking-widest text-(--color-muted) uppercase">
                                        {w.startDate ?? ""} ~{" "}
                                        {w.endDate ?? "Present"}
                                    </p>
                                )}
                                {w.name && (
                                    <h3 className="text-2xl leading-tight font-black text-(--color-foreground)">
                                        {w.url ? (
                                            <a
                                                href={w.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="transition-colors hover:underline"
                                            >
                                                {w.name}
                                            </a>
                                        ) : (
                                            w.name
                                        )}
                                    </h3>
                                )}
                                {w.position && (
                                    <p className="mt-0.5 text-base font-bold text-(--color-accent)">
                                        {w.position}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Blog 최신 글 */}
            {latestPosts.length > 0 && (
                <section className="border-t border-(--color-border) py-14">
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                                Latest Posts
                            </p>
                            <h2 className="text-3xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                                Blog
                            </h2>
                        </div>
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                        >
                            전체 보기
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    </div>

                    {latestPosts[0] && (
                        <Link
                            href={`/blog/${latestPosts[0].slug}`}
                            className="card-lift group mb-4 block overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-subtle)"
                        >
                            <div className="tablet:flex-row flex flex-col">
                                {latestPosts[0].thumbnailUrl && (
                                    <div className="tablet:w-2/5 aspect-video overflow-hidden bg-(--color-border)">
                                        <img
                                            src={latestPosts[0].thumbnailUrl}
                                            alt=""
                                            width={560}
                                            height={315}
                                            loading="lazy"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                        />
                                    </div>
                                )}
                                <div
                                    className={`flex flex-col justify-center p-7 ${latestPosts[0].thumbnailUrl ? "tablet:w-3/5" : "w-full"}`}
                                >
                                    {latestPosts[0].category && (
                                        <p className="mb-2 text-xs font-semibold tracking-wider text-(--color-accent) uppercase">
                                            {latestPosts[0].category}
                                        </p>
                                    )}
                                    <h3 className="mb-3 text-xl leading-snug font-bold text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                        {latestPosts[0].title}
                                    </h3>
                                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-(--color-muted)">
                                        {latestPosts[0].displayDescription}
                                    </p>
                                    <time
                                        dateTime={latestPosts[0].pubDateIso}
                                        className="text-xs text-(--color-muted)"
                                    >
                                        {latestPosts[0].pubDateFormatted}
                                    </time>
                                </div>
                            </div>
                        </Link>
                    )}

                    {latestPosts.length > 1 && (
                        <ul className="divide-y divide-(--color-border) overflow-hidden rounded-xl border border-(--color-border)">
                            {latestPosts.slice(1).map((post) => (
                                <li key={post.slug}>
                                    <Link
                                        href={`/blog/${post.slug}`}
                                        className="group flex items-center gap-4 bg-(--color-surface-subtle) px-5 py-4 transition-colors hover:bg-(--color-surface)"
                                    >
                                        <div className="min-w-0 flex-1">
                                            {post.category && (
                                                <span className="mr-2 text-xs font-semibold tracking-wider text-(--color-accent) uppercase">
                                                    {post.category}
                                                </span>
                                            )}
                                            <span className="text-sm font-medium text-(--color-foreground) transition-colors group-hover:text-(--color-accent)">
                                                {post.title}
                                            </span>
                                        </div>
                                        <time
                                            dateTime={post.pubDateIso}
                                            className="shrink-0 text-xs text-(--color-muted)"
                                        >
                                            {post.pubDateFormatted}
                                        </time>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </>
    );
}
