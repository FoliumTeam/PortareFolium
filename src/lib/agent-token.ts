import { createHash } from "crypto";
import { serverClient } from "@/lib/supabase";

// 토큰 → SHA-256 해시 변환
function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// 토큰 유효성 검증 및 last_used_at 갱신
// 유효하면 토큰 row 반환, 실패하면 null
export async function validateAgentToken(
    token: string
): Promise<{ id: string; label: string } | null> {
    if (!serverClient) return null;

    const hash = hashToken(token);
    const now = new Date().toISOString();

    const { data, error } = await serverClient
        .from("ai_agent_tokens")
        .select("id, label, expires_at, revoked")
        .eq("token_hash", hash)
        .single();

    if (error || !data) return null;
    if (data.revoked) return null;
    if (data.expires_at < now) return null;

    // last_used_at 갱신 (실패해도 인증은 통과)
    await serverClient
        .from("ai_agent_tokens")
        .update({ last_used_at: now })
        .eq("id", data.id);

    return { id: data.id, label: data.label };
}

// 토큰 발급 (raw token 반환 — 한 번만 노출)
export async function issueToken(
    label: string,
    durationMin: number
): Promise<string | null> {
    if (!serverClient) return null;

    const { randomBytes } = await import("crypto");
    const raw = `pf_agent_${randomBytes(32).toString("hex")}`;
    const hash = hashToken(raw);
    const expiresAt = new Date(
        Date.now() + durationMin * 60 * 1000
    ).toISOString();

    const { error } = await serverClient.from("ai_agent_tokens").insert({
        token_hash: hash,
        label,
        duration_min: durationMin,
        expires_at: expiresAt,
    });

    if (error) return null;
    return raw;
}

// 토큰 폐기
export async function revokeToken(id: string): Promise<boolean> {
    if (!serverClient) return false;

    const { error } = await serverClient
        .from("ai_agent_tokens")
        .update({ revoked: true })
        .eq("id", id);

    return !error;
}

// 토큰 목록 조회
export async function listTokens(): Promise<
    {
        id: string;
        label: string;
        duration_min: number;
        expires_at: string;
        revoked: boolean;
        last_used_at: string | null;
        created_at: string;
    }[]
> {
    if (!serverClient) return [];

    const { data } = await serverClient
        .from("ai_agent_tokens")
        .select(
            "id, label, duration_min, expires_at, revoked, last_used_at, created_at"
        )
        .order("created_at", { ascending: false });

    return data ?? [];
}
