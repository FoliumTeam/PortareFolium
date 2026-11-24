import type { SupabaseClient } from "@supabase/supabase-js";
import { materializeApplicationProfile } from "@/lib/application-profile";
import {
    buildJobFieldSource,
    buildProfileSource,
    type ConfigRow,
} from "@/lib/resume-pdf/source";
import type { ApplicationProfile } from "@/types/application-profile";
import type { PortfolioRawRow } from "@/types/portfolio";
import type { PdfLang, ResumePdfSource } from "@/types/resume-pdf";

// DB에서 PDF 입력 묶음 조회 (읽기 전용). 언어별 표는 명시적으로 지정

const PORTFOLIO_COLUMNS =
    "id, slug, title, description, tags, thumbnail, content, data, featured, order_idx, published, job_field";

const must = <T>(
    result: { data: T | null; error: { message: string } | null },
    what: string
): T | null => {
    if (result.error) throw new Error(`${what} 조회 실패`);
    return result.data;
};

// site_config + 언어별 site_config_i18n (같은 key는 번역 값 우선)
const loadConfig = async (
    db: SupabaseClient,
    lang: PdfLang
): Promise<ConfigRow[]> => {
    const base =
        must(
            await db.from("site_config").select("key, value"),
            "site_config"
        ) ?? [];
    if (lang === "ko") return base as ConfigRow[];
    const tr = (must(
        await db.from("site_config_i18n").select("key, value").eq("lang", lang),
        "site_config_i18n"
    ) ?? []) as ConfigRow[];
    const keys = new Set(tr.map((r) => r.key));
    return [...tr, ...(base as ConfigRow[]).filter((r) => !keys.has(r.key))];
};

const loadResume = async (db: SupabaseClient, lang: PdfLang) =>
    (
        must(
            await db
                .from("resume_data")
                .select("data")
                .eq("lang", lang)
                .eq("published", true)
                .maybeSingle(),
            "resume_data"
        ) as { data: Record<string, unknown> } | null
    )?.data ?? null;

export const loadJobFieldSource = async (
    db: SupabaseClient,
    lang: PdfLang,
    jobField: string
): Promise<{ source: ResumePdfSource; koName?: string }> => {
    const ko = lang === "ko";
    const [resume, koResume, about, portfolio, base, config] =
        await Promise.all([
            loadResume(db, lang),
            ko ? Promise.resolve(null) : loadResume(db, "ko"),
            ko
                ? db
                      .from("about_data")
                      .select("data")
                      .eq("published", true)
                      .limit(1)
                      .maybeSingle()
                : db
                      .from("about_data_i18n")
                      .select("data")
                      .eq("lang", lang)
                      .eq("published", true)
                      .limit(1)
                      .maybeSingle(),
            ko
                ? db
                      .from("portfolio_items")
                      .select(PORTFOLIO_COLUMNS)
                      .eq("published", true)
                : db
                      .from("portfolio_items_i18n")
                      .select(PORTFOLIO_COLUMNS)
                      .eq("lang", lang)
                      .eq("published", true),
            ko
                ? Promise.resolve(null)
                : db
                      .from("portfolio_items")
                      .select(PORTFOLIO_COLUMNS)
                      .eq("published", true),
            loadConfig(db, lang),
        ]);
    const source = buildJobFieldSource({
        lang,
        jobField,
        resume,
        about:
            (must(about, "about") as { data: Record<string, unknown> } | null)
                ?.data ?? null,
        portfolio: must(portfolio, "portfolio") as PortfolioRawRow[] | null,
        portfolioBase: base
            ? (must(base, "portfolio") as PortfolioRawRow[] | null)
            : null,
        config,
    });
    const koName = (koResume?.basics as { name?: string } | undefined)?.name;
    return { source, koName };
};

export const loadProfileSource = async (
    db: SupabaseClient,
    lang: PdfLang,
    profileId: string
): Promise<{ source: ResumePdfSource; koName?: string } | null> => {
    const ko = lang === "ko";
    const [row, koRow, config] = await Promise.all([
        ko
            ? db
                  .from("application_profiles")
                  .select("*")
                  .eq("id", profileId)
                  .maybeSingle()
            : db
                  .from("application_profiles_i18n")
                  .select("*")
                  .eq("lang", lang)
                  .eq("id", profileId)
                  .maybeSingle(),
        ko
            ? Promise.resolve(null)
            : db
                  .from("application_profiles")
                  .select("*")
                  .eq("id", profileId)
                  .maybeSingle(),
        loadConfig(db, lang),
    ]);
    const profile = must(
        row,
        "application_profiles"
    ) as ApplicationProfile | null;
    if (!profile) return null;
    const koProfile = koRow
        ? (must(koRow, "application_profiles") as ApplicationProfile | null)
        : null;
    // 얼려 둔 공개 사본. 아직 공개 전이면 기준본 + 수정사항으로 만든 사본
    const snapshot =
        profile.public_snapshot ?? materializeApplicationProfile(profile);
    const baseSnapshot = koProfile
        ? (koProfile.public_snapshot ??
          materializeApplicationProfile(koProfile))
        : null;
    const source = buildProfileSource({
        lang,
        snapshot,
        baseSnapshot,
        overrides: profile.overrides,
        config,
    });
    const koName = (baseSnapshot ?? snapshot).resume.basics?.name;
    return { source, koName: ko ? undefined : koName };
};
