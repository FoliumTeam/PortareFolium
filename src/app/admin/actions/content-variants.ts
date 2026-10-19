"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    copyContentVariant,
    isVariantKind,
    listVariantSources,
    validateVariantLocales,
    type VariantKind,
} from "@/lib/content-variants";
import {
    isContentLocaleScope,
    type ContentLocaleScope,
} from "@/lib/content-action";
import { revalidateLayout } from "@/app/admin/actions/revalidate";
import { serverClient } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";

export const getLanguageSources = async (kind: VariantKind, source: Locale) => {
    await requireAdminSession();
    if (!isVariantKind(kind)) throw new Error("Unsupported content kind");
    validateVariantLocales(source, source);
    return listVariantSources(kind, source);
};

export const createLanguageVariant = async (
    kind: VariantKind,
    source: Locale,
    slug: string | undefined,
    scope?: ContentLocaleScope
) => {
    await requireAdminSession();
    if (!isVariantKind(kind)) throw new Error("Unsupported content kind");
    const target = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    validateVariantLocales(source, target);
    await copyContentVariant(kind, source, target, slug);
    await revalidateLayout();
    return { success: true };
};

export const getDocumentPublication = async (
    kind: "resume" | "about",
    scope?: ContentLocaleScope
) => {
    await requireAdminSession();
    if (kind !== "resume" && kind !== "about")
        throw new Error("Unsupported content kind");
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    return withContentLocale(locale, async () => {
        const { data } = await serverClient!
            .from(kind === "resume" ? "resume_data" : "about_data")
            .select("published")
            .limit(1)
            .maybeSingle();
        return data?.published === true;
    });
};

export const setDocumentPublication = async (
    kind: "resume" | "about",
    published: boolean,
    scope?: ContentLocaleScope
) => {
    await requireAdminSession();
    if (kind !== "resume" && kind !== "about")
        throw new Error("Unsupported content kind");
    const locale = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    return withContentLocale(locale, async () => {
        const table = kind === "resume" ? "resume_data" : "about_data";
        const { data: row } = await serverClient!
            .from(table)
            .select("id")
            .limit(1)
            .maybeSingle();
        if (!row) throw new Error("콘텐츠 저장 후 공개 가능");
        const { error } = await serverClient!
            .from(table)
            .update({ published })
            .eq("id", row.id);
        if (error) throw new Error("공개 상태 저장 실패");
        await revalidateLayout();
    });
};
