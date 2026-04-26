import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRoutingServerClient } from "@/lib/refuge/server-client";
import { isSqliteRefugeMode } from "@/lib/refuge/mode";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const realServerClient: SupabaseClient | null =
    url && service ? createClient(url, service) : null;

export const serverClient: SupabaseClient | null =
    realServerClient || isSqliteRefugeMode()
        ? createRoutingServerClient(realServerClient)
        : null;

export const browserClient: SupabaseClient | null =
    url && anon ? createClient(url, anon) : null;

export const supabase = browserClient;
