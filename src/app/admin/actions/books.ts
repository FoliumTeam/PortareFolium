"use server";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";

import { requireAdminSession } from "@/lib/server-admin";
import { serverClient } from "@/lib/supabase";
import { revalidateBook } from "@/app/admin/actions/revalidate";

const BOOKS_SELECT_FIELDS =
    "id, slug, title, author, cover_url, description, content, rating, tags, job_field, published, featured, order_idx, meta_title, meta_description, og_image";

type BookRow = {
    id: string;
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    content: string;
    rating: number | null;
    tags: string[];
    job_field: string[];
    published: boolean;
    featured: boolean;
    order_idx: number;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

type BookPayload = {
    slug: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    description: string | null;
    content: string;
    rating: number | null;
    tags: string[];
    job_field: string[];
    published: boolean;
    featured: boolean;
    order_idx: number;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
};

// BooksSubPanel 초기 데이터 조회
async function getBooksPanelBootstrapInLocale() {
    await requireAdminSession();
    if (!serverClient) {
        return {
            books: [] as BookRow[],
            stateCounts: {} as Record<string, number>,
        };
    }

    const [{ data: booksData }, { data: stateData }] = await Promise.all([
        serverClient
            .from("books")
            .select(BOOKS_SELECT_FIELDS)
            .order("order_idx"),
        serverClient
            .from("editor_states")
            .select("entity_slug")
            .eq("entity_type", "book")
            .neq("label", "Initial"),
    ]);

    const stateCounts: Record<string, number> = {};
    for (const row of stateData ?? []) {
        stateCounts[row.entity_slug] = (stateCounts[row.entity_slug] ?? 0) + 1;
    }

    return {
        books: (booksData as BookRow[]) ?? [],
        stateCounts,
    };
}

// 도서 생성/수정
async function saveBookInLocale(
    payload: BookPayload,
    editTargetId?: string | null
): Promise<
    { success: true; book: BookRow } | { success: false; error: string }
> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    if (editTargetId) {
        const { error } = await serverClient
            .from("books")
            .update(payload)
            .eq("id", editTargetId);
        if (error) return { success: false, error: error.message };
    } else {
        const { error } = await serverClient.from("books").insert(payload);
        if (error) return { success: false, error: error.message };
    }

    const { data, error } = await serverClient
        .from("books")
        .select(BOOKS_SELECT_FIELDS)
        .eq("slug", payload.slug)
        .single();
    if (error || !data) {
        return {
            success: false,
            error: error?.message ?? "저장 후 도서 조회 실패",
        };
    }

    await revalidateBook(payload.slug);
    return { success: true, book: data as BookRow };
}

// 도서 삭제
async function deleteBookByIdInLocale(
    id: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient.from("books").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 도서 Published 토글
async function setBookPublishedInLocale(
    id: string,
    slug: string,
    published: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("books")
        .update({ published })
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    await revalidateBook(slug);
    return { success: true };
}

// 도서 Featured 토글
async function setBookFeaturedInLocale(
    id: string,
    featured: boolean
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient
        .from("books")
        .update({ featured })
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function getBooksPanelBootstrap(
    ...args: [
        ...Parameters<typeof getBooksPanelBootstrapInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof getBooksPanelBootstrapInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof getBooksPanelBootstrapInLocale>;
    return withContentLocale(locale, () =>
        getBooksPanelBootstrapInLocale(...values)
    );
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function saveBook(
    ...args: [...Parameters<typeof saveBookInLocale>, ContentLocaleScope?]
): Promise<Awaited<ReturnType<typeof saveBookInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof saveBookInLocale>;
    return withContentLocale(locale, () => saveBookInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function deleteBookById(
    ...args: [...Parameters<typeof deleteBookByIdInLocale>, ContentLocaleScope?]
): Promise<Awaited<ReturnType<typeof deleteBookByIdInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof deleteBookByIdInLocale>;
    return withContentLocale(locale, () => deleteBookByIdInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function setBookPublished(
    ...args: [
        ...Parameters<typeof setBookPublishedInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof setBookPublishedInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof setBookPublishedInLocale>;
    return withContentLocale(locale, () => setBookPublishedInLocale(...values));
}

// 호출 시 고정한 콘텐츠 언어의 처리
export async function setBookFeatured(
    ...args: [
        ...Parameters<typeof setBookFeaturedInLocale>,
        ContentLocaleScope?,
    ]
): Promise<Awaited<ReturnType<typeof setBookFeaturedInLocale>>> {
    const scope = args.at(-1);
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    const values = (
        isContentLocaleScope(scope) ? args.slice(0, -1) : args
    ) as Parameters<typeof setBookFeaturedInLocale>;
    return withContentLocale(locale, () => setBookFeaturedInLocale(...values));
}
