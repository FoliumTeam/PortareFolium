"use server";
import { revalidatePath } from "next/cache";

// 포스트 저장/수정 후 해당 슬러그 페이지 및 목록 재생성 트리거
export async function revalidatePost(slug: string) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
}

// 포트폴리오 아이템 저장/수정 후 해당 슬러그 페이지 및 목록 재생성 트리거
export async function revalidatePortfolioItem(slug: string) {
    revalidatePath(`/portfolio/${slug}`);
    revalidatePath("/portfolio");
}
