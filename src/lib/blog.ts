/**
 * 블로그 포스트 유틸: 본문에서 첫 이미지 URL 추출, 요약 문장 생성, KST 날짜 포맷
 * 저장값은 KST를 그대로 저장(ISO의 시·분은 KST 기준). 표시 시 변환 없이 그대로 한국어로 포맷.
 */

import type { Locale } from "@/lib/i18n";

// 저장 시각을 유지한 표시 언어별 날짜
export function formatPubDateKST(date: Date, locale: Locale = "ko"): string {
    const formatter = new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
    let s = formatter.format(date);
    if (locale === "ko")
        s = s.replace(/\bAM\b/i, "오전").replace(/\bPM\b/i, "오후");
    return s;
}

/** 본문(raw)에서 첫 번째 마크다운/마크독 이미지 URL 추출. 없으면 null */
export function getFirstImageFromContent(body: string): string | null {
    if (!body || typeof body !== "string") return null;
    // Markdown image: ![alt](url) or ![](url)
    const match = body.match(/!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)/);
    return match ? match[1].trim() : null;
}

/** 본문에서 마크다운 제거 후 첫 3문장 반환 (요약 폴백용) */
export function getFirstThreeSentences(body: string): string {
    if (!body || typeof body !== "string") return "";
    let text = body
        // 이미지 마크다운 제거
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        // Supabase 스토리지 URL 제거
        .replace(/https?:\/\/[a-z0-9-]+\.supabase\.co[^\s)"'\]]+/gi, "")
        // 링크 텍스트 추출
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/^#+\s*/gm, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]+`/g, "")
        .replace(/\n+/g, " ")
        .trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.slice(0, 3).join(" ").trim() || text.slice(0, 200);
}
