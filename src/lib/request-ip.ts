// 요청 IP 추출 헬퍼 — NextAuth authorize와 MCP route 공용
export function getRequestIpFromHeaders(headers: Headers): string {
    const forwardedFor = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    return forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
}
