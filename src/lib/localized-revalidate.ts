import { revalidatePath } from "next/cache";
import { LOCALES } from "@/lib/i18n";

// 기존 주소와 모든 내부 언어 캐시의 동시 갱신
export const revalidateLocalizedPath = (
    path: string,
    type?: "layout" | "page"
) => {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
    for (const locale of LOCALES) {
        const localized = `/${locale}${path === "/" ? "" : path}`;
        if (type) revalidatePath(localized, type);
        else revalidatePath(localized);
    }
};
