/**
 * Supabase 클라이언트 모듈
 *
 * - serverClient: Next.js Server Components / Route Handlers 전용 (service_role 키).
 *   절대 클라이언트 번들에 포함되어선 안 된다.
 *
 * - browserClient: React Client Components 전용 (anon 키 + RLS 적용).
 *   브라우저에서 실행되며 인증된 어드민만 쓰기 가능.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const serverClient: SupabaseClient | null =
    url && service ? createClient(url, service) : null;

export const browserClient: SupabaseClient | null =
    url && anon ? createClient(url, anon) : null;

/** @deprecated 기존 코드와의 호환을 위해 남겨둠. browserClient 사용을 권장. */
export const supabase = browserClient;
