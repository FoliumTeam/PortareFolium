import { serverClient } from "@/lib/supabase";

const ABOUT_DOCUMENT_ID = "846e4371-2ecf-4de9-b00b-f7e837518701";

// 최초 생성 경로의 고정 기본키로 동시 사본 중복 차단
export const insertAboutDocument = async (fields: Record<string, unknown>) => {
    if (!serverClient) throw new Error("DB unavailable");
    const { data: existing, error: readError } = await serverClient
        .from("about_data")
        .select("id")
        .limit(2)
        .maybeSingle();
    if (readError) throw new Error("소개 문서 조회 실패");
    if (existing) throw new Error("소개 기존 자료 보존을 위해 생성 중단");
    const { error } = await serverClient
        .from("about_data")
        .insert({ ...fields, id: ABOUT_DOCUMENT_ID });
    return { data: error ? null : { id: ABOUT_DOCUMENT_ID }, error };
};
