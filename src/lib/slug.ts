// slug 생성 + 중복 검사 유틸
import { slugify } from "transliteration";
import { serverClient } from "@/lib/supabase";

// title → URL-safe slug (한글 → romanization)
export function toSlug(title: string): string {
    const result = slugify(title, { lowercase: true, separator: "-" })
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    if (result) return result;
    // fallback: 빈 결과 시 timestamp 기반
    return `post-${Date.now().toString(36)}`;
}

// DB slug 중복 검사, 필요 시 suffix 추가
export async function uniqueSlug(
    slug: string,
    table: string,
    excludeId?: string
): Promise<string> {
    if (!serverClient) return slug;
    let candidate = slug;
    let suffix = 1;
    for (;;) {
        let query = serverClient
            .from(table)
            .select("id")
            .eq("slug", candidate)
            .limit(1);
        if (excludeId) query = query.neq("id", excludeId);
        const { data } = await query;
        if (!data?.length) return candidate;
        suffix++;
        candidate = `${slug}-${suffix}`;
    }
}
