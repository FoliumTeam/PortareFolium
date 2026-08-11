import { serverClient } from "@/lib/supabase";
import { unescapeJsxBrackets } from "@/lib/tiptap-markdown";
import type { Resume } from "@/types/resume";
import { mergePortfolioDataPatch } from "@/lib/portfolio";
import { preparePortfolioDraftSave } from "@/lib/portfolio-review";
import type { PortfolioRawRow } from "@/types/portfolio";

const PORTFOLIO_MUTATION_KEYS = [
    "title",
    "description",
    "tags",
    "job_field",
    "thumbnail",
    "content",
    "featured",
    "order_idx",
    "published",
    "meta_title",
    "meta_description",
    "og_image",
] as const;

const pickPortfolioMutationFields = (
    fields: Record<string, unknown>
): Record<string, unknown> =>
    Object.fromEntries(
        PORTFOLIO_MUTATION_KEYS.flatMap((key) =>
            Object.hasOwn(fields, key) ? [[key, fields[key]]] : []
        )
    );

const getPortfolioDataInput = (value: unknown): Record<string, unknown> => {
    if (value == null) return {};
    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("portfolio data는 object여야 합니다.");
    }
    return value as Record<string, unknown>;
};

const toPersistedPortfolioJobField = (value: unknown): unknown => {
    if (typeof value === "string") return value ? [value] : [];
    if (Array.isArray(value)) {
        const first = value.find(
            (item): item is string =>
                typeof item === "string" && item.length > 0
        );
        return first ? [first] : [];
    }
    return value;
};

export const prepareMcpPortfolioCreate = (
    args: Record<string, unknown>
): Record<string, unknown> => {
    const mutationFields = pickPortfolioMutationFields(args);
    if (mutationFields.published === true) {
        throw new Error(
            "MCP에서는 Portfolio를 발행할 수 없습니다. 관리자 검토·승인 흐름을 사용하세요."
        );
    }
    if (Object.hasOwn(mutationFields, "job_field")) {
        mutationFields.job_field = toPersistedPortfolioJobField(
            mutationFields.job_field
        );
    }
    const createFields = sanitizeContentField({
        slug: args.slug,
        ...mutationFields,
        data: mergePortfolioDataPatch({}, getPortfolioDataInput(args.data)),
        published: false,
    });
    return preparePortfolioDraftSave(
        null,
        createFields as PortfolioRawRow,
        new Date().toISOString()
    );
};

export const prepareMcpPortfolioUpdate = (
    current: PortfolioRawRow,
    rawFields: Record<string, unknown>
): { updateFields: Record<string, unknown>; finalRow: PortfolioRawRow } => {
    if (rawFields.published === true) {
        throw new Error(
            "MCP에서는 Portfolio를 발행할 수 없습니다. 관리자 검토·승인 흐름을 사용하세요."
        );
    }
    const fields = pickPortfolioMutationFields(rawFields);
    delete fields.published;
    if (Object.hasOwn(fields, "job_field")) {
        fields.job_field = toPersistedPortfolioJobField(fields.job_field);
    }
    const hasDataPatch = Object.hasOwn(rawFields, "data");
    const currentData = getPortfolioDataInput(current.data);
    const mergedData = hasDataPatch
        ? mergePortfolioDataPatch(
              currentData,
              getPortfolioDataInput(rawFields.data)
          )
        : currentData;
    const changedRow = sanitizeContentField({
        ...fields,
        ...(hasDataPatch ? { data: mergedData } : {}),
    });
    const draftRow = preparePortfolioDraftSave(
        current,
        {
            ...current,
            ...changedRow,
            data: mergedData,
        } as PortfolioRawRow,
        new Date().toISOString()
    );
    const updateFields = {
        ...changedRow,
        published: draftRow.published,
        data: draftRow.data,
    };
    const finalRow = {
        ...current,
        ...updateFields,
    } as PortfolioRawRow;
    return { updateFields, finalRow };
};

// content field가 있으면 JSX 태그 내부 \[ \] escape 복원
function sanitizeContentField<T extends Record<string, unknown>>(fields: T): T {
    if (typeof fields.content === "string") {
        return { ...fields, content: unescapeJsxBrackets(fields.content) };
    }
    return fields;
}

// ─── 툴 핸들러 ────────────────────────────────────────────────────────────────

// 스키마 가이드 반환
export async function handleGetSchema(): Promise<unknown> {
    return {
        rules: [
            "slug must be lowercase, hyphen-separated, URL-safe (e.g. 'my-new-post')",
            "Set published: false on all new content unless explicitly told otherwise",
            "No delete tool exists — use update to revise content",
            "slug collision returns error code -32000 with 'slug 중복' message — pick a different slug",
            "For update_resume: always call get_resume first, then send the FULL section (emoji + showEmoji + entries) to avoid data loss",
            "content field is MDX (Markdown + JSX) — use the components below for rich embeds",
        ],
        content_components: {
            YouTube: '<YouTube id="VIDEO_ID" /> — YouTube embed',
            LaTeX: "$$E = mc^2$$ — KaTeX math block (double dollar signs)",
            Mermaid:
                "```mermaid\\ngraph LR; A-->B\\n``` — Mermaid diagram (fenced code block with lang=mermaid)",
        },
        tools: [
            "get_schema — returns this guide",
            "list_posts({ published?: bool, limit?: int })",
            "get_post({ slug: string })",
            "create_post({ slug*, title*, description?, pub_date?, category?, tags?, job_field?, thumbnail?, content?, published?, meta_title?, meta_description?, og_image? })",
            "update_post({ slug*, ...partial_fields })",
            "rename_post_slug({ current_slug*, new_slug* })",
            "list_portfolio_items({ limit?: int })",
            "get_portfolio_item({ slug: string })",
            "create_portfolio_item({ slug*, title*, description?, tags?, job_field?, thumbnail?, content?, data?, featured?, order_idx?, published? })",
            "update_portfolio_item({ slug*, ...partial_fields })",
            "get_resume({ lang?: 'ko' })",
            "update_resume({ lang?: 'ko', data: Partial<Resume> })",
        ],
        posts: {
            slug: "unique, required",
            title: "required",
            description: "string",
            pub_date: "ISO-8601 string, defaults to now()",
            category: "string",
            tags: "string[]",
            job_field: "'web' | 'game'",
            thumbnail: "URL string",
            content: "MDX string (Markdown + JSX components)",
            published: "boolean, default false",
            meta_title: "string (SEO)",
            meta_description: "string (SEO)",
            og_image: "URL string (SEO)",
        },
        portfolio_items: {
            slug: "unique, required",
            title: "required",
            description: "string",
            tags: "string[]",
            job_field: "'web' | 'game'",
            thumbnail: "URL string",
            content: "MDX string (Markdown + JSX components)",
            featured: "boolean",
            order_idx: "integer",
            published: "boolean, default false",
            data: {
                _note: "JSONB — legacy fields are optional; v2 uses explicit caseStudyVersion: 2",
                startDate: "YYYY-MM-DD",
                endDate: "YYYY-MM-DD — omit if ongoing",
                goal: "string",
                role: "string",
                teamSize: "number",
                accomplishments: "string[]",
                keywords: "string[]",
                github: "URL string",
                badges: [{ text: "string" }],
                jobField: "'web' | 'game' | ['web','game']",
                caseStudyVersion: "exact numeric 2",
                oneLinePitch: "string, max 180",
                engine: "string, max 80",
                platforms: "string[1..5]",
                ownership: "string[1..5]",
                outcomes: [
                    {
                        result: "string, max 180",
                        evidence: "optional string, max 240",
                    },
                ],
                gallery: [
                    {
                        type: "'image' | 'video'",
                        src: "relative same-origin or configured R2 HTTPS URL",
                        poster: "required for video, forbidden for image",
                        alt: "required nonempty string",
                        caption: "optional string",
                    },
                ],
                links: [
                    {
                        kind: "'demo' | 'play' | 'release' | 'source'",
                        url: "relative same-origin or HTTPS URL",
                        label: "string",
                    },
                ],
                devlogs: [{ title: "string", url: "relative or HTTPS URL" }],
                credits: [
                    { name: "string", role: "string", url: "optional URL" },
                ],
            },
            v2_content:
                "Exactly 2 or 3 ## sections. Game entries use 목표와 제약, 내 역할, 핵심 구현, 게임 효과; web entries use 배경과 목표, 담당 범위, 실행, 결과와 근거.",
            publication:
                "New items default to published: false. Incomplete v2 drafts can be saved but cannot be published.",
        },
        resume_data: {
            _note: "Single Korean resume row only ('ko'). data column is a Resume object.",
            basics: {
                name: "string",
                label: "string",
                email: "string",
                phone: "string",
                summary: "string",
                image: "URL",
                imageStyle: "'rounded' | 'squared' | 'standard'",
                url: "URL",
                location: { city: "string", region: "string" },
                profiles: [
                    { network: "string", username: "string", url: "string" },
                ],
            },
            sections_structure:
                "Every section except basics uses { emoji: string, showEmoji: boolean, entries: T[] }",
            available_sections: [
                "work",
                "education",
                "skills",
                "projects",
                "awards",
                "certificates",
                "languages",
            ],
            entry_types: {
                work: {
                    name: "string",
                    position: "string",
                    startDate: "YYYY-MM-DD",
                    endDate: "YYYY-MM-DD (omit if current)",
                    summary: "string",
                    highlights: "string[]",
                    location: "string",
                    jobField: "string | string[]",
                },
                education: {
                    institution: "string",
                    area: "string",
                    studyType: "string",
                    startDate: "YYYY-MM-DD",
                    endDate: "YYYY-MM-DD",
                    gpa: "number",
                    gpaMax: "4 | 4.5",
                },
                skills: {
                    name: "string",
                    level: "string",
                    keywords: "string[]",
                },
                projects: {
                    name: "string",
                    description: "string",
                    highlights: "string[]",
                    keywords: "string[]",
                    startDate: "YYYY-MM-DD",
                    endDate: "YYYY-MM-DD",
                    url: "string",
                    jobField: "string | string[]",
                },
                awards: {
                    title: "string",
                    date: "YYYY-MM-DD",
                    awarder: "string",
                    summary: "string",
                },
                certificates: {
                    name: "string",
                    date: "YYYY-MM-DD",
                    issuer: "string",
                    url: "string",
                },
                languages: { language: "string", fluency: "string" },
            },
        },
    };
}

function isValidPostSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// posts 목록 조회
export async function handleListPosts(args: {
    published?: boolean;
    limit?: number;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleListPosts] serverClient 없음");

    let query = serverClient
        .from("posts")
        .select(
            "id, slug, title, description, pub_date, category, tags, job_field, published, created_at"
        )
        .order("pub_date", { ascending: false });

    if (args.published !== undefined) {
        query = query.eq("published", args.published);
    }
    if (args.limit) {
        query = query.limit(args.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`[mcp-tools::handleListPosts] ${error.message}`);
    return data;
}

// post 단건 조회
export async function handleGetPost(args: { slug: string }): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleGetPost] serverClient 없음");

    const { data, error } = await serverClient
        .from("posts")
        .select("*")
        .eq("slug", args.slug)
        .single();

    if (error) throw new Error(`[mcp-tools::handleGetPost] ${error.message}`);
    return data;
}

// post 생성
export async function handleCreatePost(
    args: Record<string, unknown>
): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleCreatePost] serverClient 없음");

    if (!args.slug || !args.title) {
        throw new Error("[mcp-tools::handleCreatePost] slug, title 필수");
    }

    const { data, error } = await serverClient
        .from("posts")
        .insert(sanitizeContentField(args))
        .select("id, slug")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error(
                `[mcp-tools::handleCreatePost] slug 중복: ${args.slug}`
            );
        }
        throw new Error(`[mcp-tools::handleCreatePost] ${error.message}`);
    }
    return data;
}

// post 수정
export async function handleUpdatePost(args: {
    slug: string;
    [key: string]: unknown;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleUpdatePost] serverClient 없음");

    const { slug, ...fields } = args;

    const { data: current } = await serverClient
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!current)
        throw new Error(`[mcp-tools::handleUpdatePost] slug 없음: ${slug}`);

    const { data, error } = await serverClient
        .from("posts")
        .update(sanitizeContentField(fields))
        .eq("slug", slug)
        .select("id, slug")
        .single();

    if (error)
        throw new Error(`[mcp-tools::handleUpdatePost] ${error.message}`);

    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");

    return data;
}

// post slug 변경
export async function handleRenamePostSlug(args: {
    current_slug: string;
    new_slug: string;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleRenamePostSlug] serverClient 없음");

    const currentSlug = args.current_slug;
    const newSlug = args.new_slug;

    if (!currentSlug || !newSlug) {
        throw new Error(
            "[mcp-tools::handleRenamePostSlug] current_slug, new_slug 필수"
        );
    }

    if (!isValidPostSlug(newSlug)) {
        throw new Error(
            `[mcp-tools::handleRenamePostSlug] 유효하지 않은 slug: ${newSlug}`
        );
    }

    const { data: current, error: currentError } = await serverClient
        .from("posts")
        .select("id, slug")
        .eq("slug", currentSlug)
        .single();

    if (currentError || !current) {
        throw new Error(
            `[mcp-tools::handleRenamePostSlug] current_slug 없음: ${currentSlug}`
        );
    }

    if (currentSlug === newSlug) {
        return current;
    }

    const { data: existing } = await serverClient
        .from("posts")
        .select("id, slug")
        .eq("slug", newSlug)
        .maybeSingle();

    if (existing) {
        throw new Error(
            `[mcp-tools::handleRenamePostSlug] new_slug 중복: ${newSlug}`
        );
    }

    const { data, error } = await serverClient
        .from("posts")
        .update({ slug: newSlug })
        .eq("slug", currentSlug)
        .select("id, slug")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error(
                `[mcp-tools::handleRenamePostSlug] new_slug 중복: ${newSlug}`
            );
        }
        throw new Error(`[mcp-tools::handleRenamePostSlug] ${error.message}`);
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/blog/${currentSlug}`);
    revalidatePath(`/blog/${newSlug}`);
    revalidatePath("/blog");

    return data;
}

// portfolio_items 목록 조회
export async function handleListPortfolioItems(args: {
    limit?: number;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error(
            "[mcp-tools::handleListPortfolioItems] serverClient 없음"
        );

    let query = serverClient
        .from("portfolio_items")
        .select(
            "id, slug, title, description, tags, job_field, featured, order_idx, published"
        )
        .order("order_idx", { ascending: true });

    if (args.limit) {
        query = query.limit(args.limit);
    }

    const { data, error } = await query;
    if (error)
        throw new Error(
            `[mcp-tools::handleListPortfolioItems] ${error.message}`
        );
    return data;
}

// portfolio_item 단건 조회
export async function handleGetPortfolioItem(args: {
    slug: string;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error(
            "[mcp-tools::handleGetPortfolioItem] serverClient 없음"
        );

    const { data, error } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", args.slug)
        .single();

    if (error)
        throw new Error(`[mcp-tools::handleGetPortfolioItem] ${error.message}`);
    return data;
}

// portfolio_item 생성
export async function handleCreatePortfolioItem(
    args: Record<string, unknown>
): Promise<unknown> {
    if (!serverClient)
        throw new Error(
            "[mcp-tools::handleCreatePortfolioItem] serverClient 없음"
        );

    if (!args.slug || !args.title) {
        throw new Error(
            "[mcp-tools::handleCreatePortfolioItem] slug, title 필수"
        );
    }

    const createFields = prepareMcpPortfolioCreate(args);

    const { data, error } = await serverClient
        .from("portfolio_items")
        .insert(createFields)
        .select("id, slug")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error(
                `[mcp-tools::handleCreatePortfolioItem] slug 중복: ${args.slug}`
            );
        }
        throw new Error(
            `[mcp-tools::handleCreatePortfolioItem] ${error.message}`
        );
    }
    return data;
}

// portfolio_item 수정
export async function handleUpdatePortfolioItem(args: {
    slug: string;
    [key: string]: unknown;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error(
            "[mcp-tools::handleUpdatePortfolioItem] serverClient 없음"
        );

    const { slug, ...rawFields } = args;

    const { data: current, error: currentError } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .single();

    if (currentError || !current)
        throw new Error(
            `[mcp-tools::handleUpdatePortfolioItem] ${currentError?.message ?? `slug 없음: ${slug}`}`
        );

    const { updateFields } = prepareMcpPortfolioUpdate(
        current as PortfolioRawRow,
        rawFields
    );

    const { data, error } = await serverClient
        .from("portfolio_items")
        .update(updateFields)
        .eq("slug", slug)
        .select("id, slug")
        .single();

    if (error)
        throw new Error(
            `[mcp-tools::handleUpdatePortfolioItem] ${error.message}`
        );

    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/portfolio/${slug}`);
    revalidatePath("/portfolio");

    return data;
}

// 이력서 조회
export async function handleGetResume(args: {
    lang?: string;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleGetResume] serverClient 없음");

    const lang = args.lang ?? "ko";
    if (lang !== "ko") {
        throw new Error("[mcp-tools::handleGetResume] ko resume만 지원");
    }

    const { data, error } = await serverClient
        .from("resume_data")
        .select("id, lang, data, updated_at")
        .eq("lang", lang)
        .single();

    if (error) throw new Error(`[mcp-tools::handleGetResume] ${error.message}`);
    return data;
}

// 이력서 수정
export async function handleUpdateResume(args: {
    lang?: string;
    data: Partial<Resume>;
}): Promise<unknown> {
    if (!serverClient)
        throw new Error("[mcp-tools::handleUpdateResume] serverClient 없음");

    const lang = args.lang ?? "ko";
    if (lang !== "ko") {
        throw new Error("[mcp-tools::handleUpdateResume] ko resume만 지원");
    }

    const { data: current } = await serverClient
        .from("resume_data")
        .select("*")
        .eq("lang", lang)
        .single();

    if (!current)
        throw new Error(`[mcp-tools::handleUpdateResume] lang 없음: ${lang}`);

    // 섹션별 deep-merge: 기존 data + args.data
    const merged = { ...(current.data as object), ...args.data };

    const { data: updated, error } = await serverClient
        .from("resume_data")
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq("lang", lang)
        .select("id, lang")
        .single();

    if (error)
        throw new Error(`[mcp-tools::handleUpdateResume] ${error.message}`);

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/resume");
    revalidatePath("/");

    return updated;
}

// ─── 툴 정의 (MCP tool schema) ────────────────────────────────────────────────

const PORTFOLIO_DATA_INPUT_SCHEMA = {
    type: "object",
    description:
        "caseStudyVersion 2 uses the documented case-study keys; unknown forward-compatible keys are preserved",
    properties: {
        startDate: { type: ["string", "null"] },
        endDate: { type: ["string", "null"] },
        goal: { type: ["string", "null"] },
        role: { type: ["string", "null"] },
        teamSize: { type: ["number", "null"] },
        github: { type: ["string", "null"] },
        liveUrl: { type: ["string", "null"] },
        accomplishments: {
            type: ["array", "null"],
            items: { type: "string" },
        },
        jobField: {
            oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
                { type: "null" },
            ],
        },
        caseStudyVersion: { type: ["number", "null"], enum: [2, null] },
        oneLinePitch: { type: ["string", "null"], maxLength: 180 },
        engine: { type: ["string", "null"], maxLength: 80 },
        platforms: {
            type: ["array", "null"],
            maxItems: 5,
            items: { type: "string", maxLength: 80 },
        },
        ownership: {
            type: ["array", "null"],
            maxItems: 5,
            items: { type: "string", maxLength: 160 },
        },
        outcomes: {
            type: ["array", "null"],
            maxItems: 3,
            items: {
                type: "object",
                properties: {
                    result: { type: "string", maxLength: 180 },
                    evidence: { type: "string", maxLength: 240 },
                },
                required: ["result"],
            },
        },
        gallery: {
            type: ["array", "null"],
            maxItems: 8,
            items: {
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { const: "image" },
                            src: { type: "string" },
                            alt: { type: "string", minLength: 1 },
                            caption: { type: "string", maxLength: 240 },
                        },
                        required: ["type", "src", "alt"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { const: "video" },
                            src: { type: "string" },
                            poster: { type: "string" },
                            alt: { type: "string", minLength: 1 },
                            caption: { type: "string", maxLength: 240 },
                        },
                        required: ["type", "src", "poster", "alt"],
                    },
                ],
            },
        },
        links: {
            type: ["array", "null"],
            maxItems: 4,
            items: {
                type: "object",
                properties: {
                    kind: {
                        type: "string",
                        enum: ["demo", "play", "release", "source"],
                    },
                    url: { type: "string" },
                    label: { type: "string", maxLength: 80 },
                },
                required: ["kind", "url", "label"],
            },
        },
        devlogs: {
            type: ["array", "null"],
            maxItems: 5,
            items: {
                type: "object",
                properties: {
                    title: { type: "string", maxLength: 180 },
                    url: { type: "string" },
                },
                required: ["title", "url"],
            },
        },
        credits: {
            type: ["array", "null"],
            maxItems: 20,
            items: {
                type: "object",
                properties: {
                    name: { type: "string", maxLength: 120 },
                    role: { type: "string", maxLength: 160 },
                    url: { type: "string" },
                },
                required: ["name", "role"],
            },
        },
    },
    additionalProperties: true,
} as const;

export const MCP_TOOLS = [
    {
        name: "get_schema",
        description: "AI 에이전트용 데이터 스키마 가이드 반환",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "list_posts",
        description: "포스트 목록 조회",
        inputSchema: {
            type: "object",
            properties: {
                published: { type: "boolean", description: "발행 여부 필터" },
                limit: { type: "integer", description: "최대 반환 수" },
            },
        },
    },
    {
        name: "get_post",
        description: "슬러그로 포스트 단건 조회",
        inputSchema: {
            type: "object",
            properties: { slug: { type: "string" } },
            required: ["slug"],
        },
    },
    {
        name: "create_post",
        description: "새 포스트 생성 (slug, title 필수)",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                pub_date: { type: "string", description: "ISO-8601 string" },
                category: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                job_field: { type: "string", enum: ["web", "game"] },
                thumbnail: { type: "string" },
                published: { type: "boolean" },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                og_image: { type: "string" },
            },
            required: ["slug", "title"],
        },
    },
    {
        name: "update_post",
        description: "포스트 부분 수정 (스냅샷 자동 저장)",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                pub_date: { type: "string", description: "ISO-8601 string" },
                category: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                job_field: { type: "string", enum: ["web", "game"] },
                thumbnail: { type: "string" },
                published: { type: "boolean" },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                og_image: { type: "string" },
            },
            required: ["slug"],
        },
    },
    {
        name: "rename_post_slug",
        description: "포스트 slug 변경 (기존 row 유지, slug 충돌 시 실패)",
        inputSchema: {
            type: "object",
            properties: {
                current_slug: { type: "string" },
                new_slug: { type: "string" },
            },
            required: ["current_slug", "new_slug"],
        },
    },
    {
        name: "list_portfolio_items",
        description: "포트폴리오 목록 조회",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "integer", description: "최대 반환 수" },
            },
        },
    },
    {
        name: "get_portfolio_item",
        description: "슬러그로 포트폴리오 항목 단건 조회",
        inputSchema: {
            type: "object",
            properties: { slug: { type: "string" } },
            required: ["slug"],
        },
    },
    {
        name: "create_portfolio_item",
        description: "새 포트폴리오 항목 생성 (slug, title 필수)",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                job_field: { type: "string", enum: ["web", "game"] },
                thumbnail: { type: "string" },
                featured: { type: "boolean" },
                order_idx: { type: "integer" },
                published: { type: "boolean" },
                data: PORTFOLIO_DATA_INPUT_SCHEMA,
            },
            required: ["slug", "title"],
        },
    },
    {
        name: "update_portfolio_item",
        description:
            "포트폴리오 항목 부분 수정. omitted data key는 유지, non-null은 shallow replace, known null은 삭제",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                job_field: { type: "string", enum: ["web", "game"] },
                thumbnail: { type: "string" },
                featured: { type: "boolean" },
                order_idx: { type: "integer" },
                published: { type: "boolean" },
                data: PORTFOLIO_DATA_INPUT_SCHEMA,
            },
            required: ["slug"],
        },
    },
    {
        name: "get_resume",
        description: "이력서 조회",
        inputSchema: {
            type: "object",
            properties: {
                lang: { type: "string", enum: ["ko"] },
            },
        },
    },
    {
        name: "update_resume",
        description: "이력서 섹션별 deep-merge 업데이트 (스냅샷 자동 저장)",
        inputSchema: {
            type: "object",
            properties: {
                lang: { type: "string", enum: ["ko"] },
                data: {
                    type: "object",
                    description: "Resume 객체 (부분 업데이트 가능)",
                },
            },
            required: ["data"],
        },
    },
] as const;

// 툴 이름 → 핸들러 디스패치
export async function dispatchTool(
    name: string,
    args: Record<string, unknown>
): Promise<unknown> {
    switch (name) {
        case "get_schema":
            return handleGetSchema();
        case "list_posts":
            return handleListPosts(
                args as { published?: boolean; limit?: number }
            );
        case "get_post":
            return handleGetPost(args as { slug: string });
        case "create_post":
            return handleCreatePost(args);
        case "update_post":
            return handleUpdatePost(args as { slug: string });
        case "rename_post_slug":
            return handleRenamePostSlug(
                args as { current_slug: string; new_slug: string }
            );
        case "list_portfolio_items":
            return handleListPortfolioItems(args as { limit?: number });
        case "get_portfolio_item":
            return handleGetPortfolioItem(args as { slug: string });
        case "create_portfolio_item":
            return handleCreatePortfolioItem(args);
        case "update_portfolio_item":
            return handleUpdatePortfolioItem(args as { slug: string });
        case "get_resume":
            return handleGetResume(args as { lang?: string });
        case "update_resume":
            return handleUpdateResume(
                args as { lang?: string; data: Partial<Resume> }
            );
        default:
            throw new Error(`[mcp-tools::dispatchTool] 알 수 없는 툴: ${name}`);
    }
}
