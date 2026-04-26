import { isLocalSqliteRefugeAdminBypassAllowed } from "@/lib/local-sqlite-refuge-admin";

type HeaderSource = {
    headers: Headers;
};

// localhost refuge admin bypass 중 cross-site mutation 요청을 차단한다.
export function assertSafeAdminMutationRequest(req: HeaderSource): void {
    const host = req.headers.get("host");
    if (!isLocalSqliteRefugeAdminBypassAllowed({ host })) return;

    const fetchSite = req.headers.get("sec-fetch-site");
    if (
        fetchSite &&
        !["same-origin", "same-site", "none"].includes(fetchSite)
    ) {
        throw new Error("cross-site refuge mutation blocked");
    }

    const origin = req.headers.get("origin");
    if (!origin) return;

    let originHost = "";
    try {
        originHost = new URL(origin).host;
    } catch {
        throw new Error("invalid mutation origin");
    }

    if (originHost.toLowerCase() !== (host ?? "").toLowerCase()) {
        throw new Error("cross-origin refuge mutation blocked");
    }
}
