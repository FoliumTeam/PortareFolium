"use server";

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
export async function getBooksPanelBootstrap() {
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
export async function saveBook(
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
export async function deleteBookById(
    id: string
): Promise<{ success: boolean; error?: string }> {
    await requireAdminSession();
    if (!serverClient) return { success: false, error: "serverClient 없음" };

    const { error } = await serverClient.from("books").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 도서 Published 토글
export async function setBookPublished(
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
export async function setBookFeatured(
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
