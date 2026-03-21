"use server";

import {
    issueToken as _issueToken,
    revokeToken as _revokeToken,
    listTokens as _listTokens,
} from "@/lib/agent-token";

// 유효 duration 목록 (분)
const VALID_DURATIONS = [15, 30, 60, 180, 360, 720, 1440] as const;
type ValidDuration = (typeof VALID_DURATIONS)[number];

// 토큰 발급 서버 액션
export async function issueToken(
    label: string,
    durationMin: ValidDuration
): Promise<{ token: string } | { error: string }> {
    if (!label.trim()) return { error: "label 필수" };
    if (!VALID_DURATIONS.includes(durationMin))
        return { error: "유효하지 않은 duration" };

    const token = await _issueToken(label.trim(), durationMin);
    if (!token) return { error: "토큰 발급 실패" };
    return { token };
}

// 토큰 폐기 서버 액션
export async function revokeToken(
    id: string
): Promise<{ success: boolean } | { error: string }> {
    if (!id) return { error: "id 필수" };
    const ok = await _revokeToken(id);
    if (!ok) return { error: "폐기 실패" };
    return { success: true };
}

// 토큰 목록 조회 서버 액션
export async function listTokens() {
    return _listTokens();
}
