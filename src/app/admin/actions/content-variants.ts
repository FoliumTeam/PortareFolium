"use server";

import { requireAdminSession } from "@/lib/server-admin";
import { getContentLocale, withContentLocale } from "@/lib/content-locale";
import {
    copyContentVariant,
    isVariantKind,
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

const COPY_MESSAGES = new Set([
    "복사할 다른 언어 선택 필요",
    "원본 항목 선택 필요",
    "원본 콘텐츠 조회 실패",
    "대상 언어 조회 실패",
    "대상 언어의 기존 내용 보존을 위해 복사 중단",
    "대상 언어 내용 변경으로 복사 중단",
    "언어 사본 저장 실패",
    "소개 문서 조회 실패",
    "소개 기존 자료 보존을 위해 생성 중단",
]);

// 호출 시 고정한 원본 언어에서 명시한 대상으로 복사
export const copyContentToLanguage = async (
    kind: VariantKind,
    target: Locale,
    sourceKey?: string,
    scope?: ContentLocaleScope
) => {
    await requireAdminSession();
    if (!isVariantKind(kind)) throw new Error("Unsupported content kind");
    if (
        sourceKey !== undefined &&
        (typeof sourceKey !== "string" || !sourceKey.trim())
    )
        throw new Error("원본 항목 선택 필요");
    if (scope !== undefined && !isContentLocaleScope(scope))
        throw new Error("Unsupported locale");
    const source = isContentLocaleScope(scope)
        ? scope.__contentLocale
        : getContentLocale();
    validateVariantLocales(source, target);
    const result = await copyContentVariant(
        kind,
        source,
        target,
        sourceKey
    ).catch((failure: unknown) => {
        if (failure instanceof Error && COPY_MESSAGES.has(failure.message))
            throw failure;
        throw new Error("자료 확인 실패로 복사 중단");
    });
    await revalidateLayout();
    return result;
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
