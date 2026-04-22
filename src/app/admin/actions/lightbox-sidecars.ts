"use server";

import { runLightboxSidecarBackfill } from "@/lib/lightbox-sidecars";
import { requireAdminSession } from "@/lib/server-admin";

// lightbox sidecar backfill 실행
export async function executeLightboxSidecarBackfill() {
    await requireAdminSession();
    return runLightboxSidecarBackfill();
}
