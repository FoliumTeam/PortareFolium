import { unscopedServerClient } from "@/lib/supabase";

const BASE_TABLES = [
    "about_data",
    "posts",
    "portfolio_items",
    "books",
    "editor_states",
    "post_content_chunks",
    "application_profiles",
    "site_config",
];
const REFERENCE_TABLES = [
    "resume_data",
    ...BASE_TABLES,
    ...BASE_TABLES.map((table) => `${table}_i18n`),
];

// 전체 언어의 본문·편집 이력·공유본에서 참조하는 이미지 보호
export const getStorageReferenceGuard = async (): Promise<
    (key: string) => boolean
> => {
    if (!unscopedServerClient)
        throw new Error("미디어 참조 확인에 필요한 DB 연결 없음");
    const texts = await Promise.all(
        REFERENCE_TABLES.map(async (table) => {
            const pages: string[] = [];
            const chunks = new Map<string, Map<number, string>>();
            const collected = () =>
                [
                    ...pages,
                    ...[...chunks.values()].map((parts) =>
                        [...parts]
                            .sort(([left], [right]) => left - right)
                            .map(([, content]) => content)
                            .join("")
                    ),
                ].join("\n");
            for (let offset = 0; offset < 10000; offset += 500) {
                let query = unscopedServerClient!.from(table).select("*");
                query = table.includes("post_content_chunks")
                    ? query.order("revision_id").order("chunk_index")
                    : query.order(
                          table.startsWith("site_config") ? "key" : "id"
                      );
                if (table.endsWith("_i18n")) query = query.order("lang");
                const { data, error } = await query.range(offset, offset + 499);
                if (error) throw new Error("전체 언어의 미디어 참조 확인 실패");
                pages.push(JSON.stringify(data ?? []));
                if (table.includes("post_content_chunks"))
                    for (const row of data ?? []) {
                        const id = `${String(row.lang ?? "ko")}:${String(row.revision_id)}`;
                        const parts =
                            chunks.get(id) ?? new Map<number, string>();
                        parts.set(
                            Number(row.chunk_index),
                            String(row.content ?? "")
                        );
                        chunks.set(id, parts);
                    }
                if (!data || data.length < 500) return collected();
            }
            throw new Error("미디어 참조 확인의 행 수 한도 초과");
        })
    );
    const cache = new Map<string, boolean>();
    return (key) => {
        const stem = key
            .replace(/\.(thumb|poster)\.webp$/, "")
            .replace(/\.[^./]+$/, "");
        if (cache.has(stem)) return cache.get(stem)!;
        const referenced = texts.some(
            (text) =>
                text.includes(`${stem}.`) ||
                text.includes(`${encodeURI(stem)}.`)
        );
        cache.set(stem, referenced);
        return referenced;
    };
};
