const ADMIN_RETURN_URL_FALLBACK = "/admin";

// admin returnUrl 정규화
export function getSafeAdminReturnUrl(value?: string | null): string {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.startsWith("//")) return ADMIN_RETURN_URL_FALLBACK;

    try {
        const parsed = new URL(trimmed, "https://admin.local");
        if (parsed.origin !== "https://admin.local") {
            return ADMIN_RETURN_URL_FALLBACK;
        }
        if (!parsed.pathname.startsWith("/admin")) {
            return ADMIN_RETURN_URL_FALLBACK;
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return ADMIN_RETURN_URL_FALLBACK;
    }
}
