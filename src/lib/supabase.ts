import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRoutingServerClient } from "@/lib/refuge/server-client";
import { isSqliteRefugeMode } from "@/lib/refuge/mode";
import { createLocalizedClient } from "@/lib/localized-client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

const realServerClient: SupabaseClient | null =
    url && secret ? createClient(url, secret) : null;

export const unscopedServerClient: SupabaseClient | null =
    realServerClient || isSqliteRefugeMode()
        ? createRoutingServerClient(realServerClient)
        : null;
export const serverClient: SupabaseClient | null = unscopedServerClient
    ? createLocalizedClient(unscopedServerClient)
    : null;

export const browserClient: SupabaseClient | null =
    url && publishable ? createClient(url, publishable) : null;

export const supabase = browserClient;
