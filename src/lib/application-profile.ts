import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import { LOCALES } from "@/lib/i18n";
import { createHash, randomBytes } from "node:crypto";
import { createJobFieldResumeView } from "@/lib/resume-job-field";
import { readPostContentById } from "@/lib/post-content-chunks";
import {
    matchesPortfolioJobField,
    normalizePortfolioProject,
} from "@/lib/portfolio";
import { serverClient } from "@/lib/supabase";
import type { AboutData } from "@/types/about";
import type { PortfolioRawRow } from "@/types/portfolio";
import type { Resume } from "@/types/resume";
import {
    EMPTY_APPLICATION_PROFILE_OVERRIDES,
    type ApplicationPost,
    type ApplicationProfile,
    type ApplicationProfileOverrides,
    type ApplicationProfileSnapshot,
} from "@/types/application-profile";

const APPLICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

function stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (!value || typeof value !== "object") return JSON.stringify(value);
    return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
        .join(",")}}`;
}

function hashSnapshot(
    snapshot: Omit<ApplicationProfileSnapshot, "sourceHash">
): string {
    return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function orderBySlugs<T extends { slug: string }>(
    items: T[],
    order: string[]
): T[] {
    const positions = new Map(order.map((slug, index) => [slug, index]));
    return [...items].sort((left, right) => {
        const leftPosition = positions.get(left.slug);
        const rightPosition = positions.get(right.slug);
        if (leftPosition == null && rightPosition == null) return 0;
        if (leftPosition == null) return 1;
        if (rightPosition == null) return -1;
        return leftPosition - rightPosition;
    });
}

function applyOverrides(
    snapshot: ApplicationProfileSnapshot,
    overrides: ApplicationProfileOverrides
): ApplicationProfileSnapshot {
    const resume = structuredClone(snapshot.resume);
    if (resume.basics) {
        if (overrides.headline !== undefined)
            resume.basics.label = overrides.headline;
        if (overrides.summary !== undefined)
            resume.basics.summary = overrides.summary;
    }
    const portfolio = orderBySlugs(
        snapshot.portfolio.filter(
            (item) => !overrides.excludedPortfolioSlugs.includes(item.slug)
        ),
        overrides.portfolioOrder
    );
    const posts = orderBySlugs(
        snapshot.posts.filter(
            (item) => !overrides.excludedPostSlugs.includes(item.slug)
        ),
        overrides.postOrder
    );
    return {
        ...snapshot,
        resume,
        portfolio,
        posts,
        sourceHash: snapshot.sourceHash,
    };
}

function normalizeProfile(value: unknown): ApplicationProfile | null {
    if (!value || typeof value !== "object") return null;
    const profile = value as Partial<ApplicationProfile>;
    if (
        typeof profile.id !== "string" ||
        typeof profile.name !== "string" ||
        typeof profile.public_token !== "string" ||
        typeof profile.parent_job_field !== "string" ||
        typeof profile.job_description !== "string" ||
        !profile.base_snapshot
    ) {
        return null;
    }
    return {
        ...profile,
        status:
            profile.status === "published" || profile.status === "revoked"
                ? profile.status
                : "draft",
        version: typeof profile.version === "number" ? profile.version : 1,
        base_snapshot: profile.base_snapshot,
        overrides: {
            ...EMPTY_APPLICATION_PROFILE_OVERRIDES,
            ...profile.overrides,
        },
        public_snapshot: profile.public_snapshot ?? null,
        published_at: profile.published_at ?? null,
        created_at: profile.created_at ?? "",
        updated_at: profile.updated_at ?? "",
    } as ApplicationProfile;
}

export function isApplicationProfileToken(value: string): boolean {
    return APPLICATION_TOKEN_PATTERN.test(value);
}

export function createApplicationProfileToken(): string {
    return randomBytes(16).toString("base64url");
}

export async function createApplicationSourceSnapshot(
    jobField: string,
    options?: { strict?: boolean }
): Promise<ApplicationProfileSnapshot> {
    if (!serverClient)
        throw new Error(
            "[application-profile::createApplicationSourceSnapshot] serverClient 없음"
        );
    const resumeQuery = serverClient
        .from("resume_data")
        .select("data")
        .eq("lang", "ko");
    const aboutQuery = serverClient
        .from("about_data")
        .select("data")
        .limit(options?.strict ? 2 : 1);
    const [resumeRes, aboutRes, portfolioRes, postsRes] = await Promise.all([
        options?.strict ? resumeQuery.maybeSingle() : resumeQuery.single(),
        options?.strict ? aboutQuery.maybeSingle() : aboutQuery.single(),
        serverClient
            .from("portfolio_items")
            .select(
                "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, job_field, meta_title, meta_description, og_image"
            )
            .eq("published", true)
            .order("order_idx"),
        serverClient
            .from("posts")
            .select(
                "id, slug, title, description, content, pub_date, category, tags, thumbnail, meta_title, meta_description, og_image, job_field"
            )
            .eq("published", true)
            .order("pub_date", { ascending: false }),
    ]);
    if (options?.strict) {
        for (const result of [resumeRes, aboutRes, portfolioRes, postsRes]) {
            if (result.error) {
                throw new Error(
                    `[application-profile::createApplicationSourceSnapshot] ${result.error.message}`
                );
            }
        }
    }
    const rawResume = (resumeRes.data?.data ?? {}) as Resume;
    const rawAbout = (aboutRes.data?.data ?? {}) as AboutData;
    const introduction = rawAbout.introductions?.[jobField];
    const about: AboutData = {
        ...rawAbout,
        description: introduction?.description ?? rawAbout.description,
        descriptionSub: introduction?.descriptionSub ?? rawAbout.descriptionSub,
        sections: { ...rawAbout.sections, ...introduction?.sections },
        competencySections: {
            ...rawAbout.competencySections,
            ...introduction?.competencySections,
        },
    };
    const portfolio = ((portfolioRes.data ?? []) as PortfolioRawRow[]).filter(
        (item) =>
            matchesPortfolioJobField(normalizePortfolioProject(item), jobField)
    );
    const selectedPosts = (
        (postsRes.data ?? []) as (ApplicationPost & {
            id: string;
            job_field?: string | string[];
        })[]
    )
        .filter((post) => {
            const fields = post.job_field;
            return Array.isArray(fields)
                ? fields.includes(jobField)
                : fields === jobField;
        })
        .map(({ job_field: _jobField, ...post }) => post);
    const posts = options?.strict
        ? await Promise.all(
              selectedPosts.map(async ({ id, ...post }) => {
                  const { content } = await readPostContentById(
                      id,
                      post.content,
                      { strict: true }
                  );
                  return { ...post, content };
              })
          )
        : selectedPosts.map(({ id: _id, ...post }) => post);
    const source = {
        jobField,
        resume: createJobFieldResumeView(rawResume, jobField, introduction),
        about,
        portfolio,
        posts,
    };
    return { ...source, sourceHash: hashSnapshot(source) };
}

export async function getApplicationProfileByToken(
    token: string
): Promise<ApplicationProfile | null> {
    if (!serverClient || !isApplicationProfileToken(token)) return null;
    const { data } = await serverClient
        .from("application_profiles")
        .select("*")
        .eq("public_token", token)
        .eq("status", "published")
        .maybeSingle();
    if (data) return normalizeProfile(data);
    const selected = getContentLocale();
    for (const locale of LOCALES) {
        if (locale === selected) continue;
        const { data: identity } = await withContentLocale(locale, () =>
            serverClient!
                .from("application_profiles")
                .select("id, public_token, parent_job_field")
                .eq("public_token", token)
                .eq("status", "published")
                .maybeSingle()
        );
        if (!identity) continue;
        const empty: ApplicationProfileSnapshot = {
            jobField: identity.parent_job_field,
            resume: {},
            about: {},
            portfolio: [],
            posts: [],
            sourceHash: "",
        };
        return {
            ...identity,
            name: "",
            job_description: "",
            status: "published",
            version: 0,
            base_snapshot: empty,
            public_snapshot: empty,
            overrides: EMPTY_APPLICATION_PROFILE_OVERRIDES,
            published_at: null,
            created_at: "",
            updated_at: "",
        } as ApplicationProfile;
    }
    return null;
}

export async function getApplicationProfileForAdmin(
    id: string
): Promise<ApplicationProfile | null> {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("application_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    return normalizeProfile(data);
}

export async function getApplicationProfileStatus(
    profile: ApplicationProfile
): Promise<{ sourceHash: string; needsUpdate: boolean }> {
    const current = await createApplicationSourceSnapshot(
        profile.parent_job_field
    );
    return {
        sourceHash: current.sourceHash,
        needsUpdate: current.sourceHash !== profile.base_snapshot.sourceHash,
    };
}

export function materializeApplicationProfile(
    profile: ApplicationProfile
): ApplicationProfileSnapshot {
    return applyOverrides(profile.base_snapshot, profile.overrides);
}
