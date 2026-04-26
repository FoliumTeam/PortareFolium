import { serverClient } from "@/lib/supabase";

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
