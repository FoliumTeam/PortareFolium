"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/server-admin";

const PUBLIC_JOB_FIELDS = ["web", "game"] as const;

// 포스트 저장/수정 후 해당 슬러그 페이지 및 목록 재생성 트리거
export async function revalidatePost(slug: string) {
    await requireAdminSession();
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
    for (const jobField of PUBLIC_JOB_FIELDS) {
        revalidatePath(`/${jobField}/blog/${slug}`);
        revalidatePath(`/${jobField}/blog`);
    }
    revalidatePath("/");
}

// 포트폴리오 아이템 저장/수정 후 해당 슬러그 페이지 및 목록 재생성 트리거
export async function revalidatePortfolioItem(slug: string) {
    await requireAdminSession();
    revalidatePath(`/portfolio/${slug}`);
    revalidatePath("/portfolio");
    for (const jobField of PUBLIC_JOB_FIELDS) {
        revalidatePath(`/${jobField}/portfolio/${slug}`);
        revalidatePath(`/${jobField}/portfolio`);
        revalidatePath(`/${jobField}`);
    }
    revalidatePath("/");
}

// About Me 저장 후 직무별 공개 페이지 재생성 트리거
export async function revalidateAbout() {
    await requireAdminSession();
    revalidatePath("/about");
    for (const jobField of PUBLIC_JOB_FIELDS) {
        revalidatePath(`/${jobField}/about`);
        revalidatePath(`/${jobField}`);
    }
    revalidatePath("/");
}

// 도서 저장/수정 후 해당 슬러그 페이지 재생성 트리거
export async function revalidateBook(slug: string) {
    await requireAdminSession();
    revalidatePath(`/books/${slug}`);
}

// 홈 페이지 재생성 트리거
export async function revalidateHome() {
    await requireAdminSession();
    revalidatePath("/");
}

// 루트 레이아웃 재생성 트리거 (컬러 스킴 등 전역 설정 변경 시)
export async function revalidateLayout() {
    await requireAdminSession();
    revalidatePath("/", "layout");
}

// 이력서 페이지 재생성 트리거
export async function revalidateResume() {
    await requireAdminSession();
    revalidatePath("/resume");
    for (const jobField of PUBLIC_JOB_FIELDS) {
        revalidatePath(`/${jobField}/resume`);
    }
}
