import { languages as languageData } from "countries-list";
import type { ResumeLanguage } from "@/types/resume";

type Props = {
    languages: ResumeLanguage[];
    label: string;
    dataPdfBlock?: boolean;
};

function normalizeLanguageName(value?: string): string {
    return value?.trim().toLocaleLowerCase() ?? "";
}

function getLocalizedLanguageNames(languageCode: string): string[] {
    if (typeof Intl.DisplayNames !== "function") return [];

    return ["ko", "en"]
        .map((locale) =>
            new Intl.DisplayNames([locale], { type: "language" }).of(
                languageCode
            )
        )
        .filter((name): name is string => Boolean(name));
}

/** 입력 언어명 또는 BCP 47 태그를 ISO 639-1 코드로 자동 정규화 */
export function getLanguageCode(language?: string): string | null {
    const normalizedLanguage = normalizeLanguageName(language);

    if (!normalizedLanguage) return null;

    try {
        return new Intl.Locale(normalizedLanguage).language;
    } catch {
        const matchedLanguage = Object.entries(languageData).find(
            ([languageCode, details]) =>
                [
                    languageCode,
                    details.name,
                    details.native,
                    ...getLocalizedLanguageNames(languageCode),
                ].some(
                    (candidate) =>
                        normalizeLanguageName(candidate) === normalizedLanguage
                )
        );

        return matchedLanguage?.[0] ?? null;
    }
}

/** 표준 언어 코드의 대표 국가를 국제화 데이터에서 자동 판별 */
export function getLanguageCountryCode(language?: string): string | null {
    const languageCode = getLanguageCode(language);

    if (!languageCode) return null;

    try {
        const localeTag = (() => {
            try {
                return Intl.getCanonicalLocales(language?.trim() ?? "")[0];
            } catch {
                return languageCode;
            }
        })();

        return (
            new Intl.Locale(localeTag).maximize().region?.toLowerCase() ?? null
        );
    } catch {
        return null;
    }
}

/** 언어별 평면 국기·언어명·숙련도를 빠르게 훑을 수 있는 Resume 카드 */
export function getLanguageFlagSrc(language?: string): string | null {
    const countryCode = getLanguageCountryCode(language);

    return countryCode ? `https://flagcdn.com/w80/${countryCode}.png` : null;
}

export default function LanguagesSection({
    languages,
    label,
    dataPdfBlock = false,
}: Props) {
    if (languages.length === 0) return null;

    return (
        <section
            className="mb-10"
            data-pdf-block={dataPdfBlock ? true : undefined}
        >
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {label}
            </h2>
            <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3">
                {languages.map((language, index) => {
                    const flagSrc = getLanguageFlagSrc(language.language);

                    return (
                        <article
                            key={`${language.language ?? "language"}-${index}`}
                            className="flex min-h-24 items-center gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                            data-pdf-block-item={
                                dataPdfBlock ? true : undefined
                            }
                        >
                            {flagSrc ? (
                                <img
                                    src={flagSrc}
                                    alt={`${language.language ?? "언어"} 국기`}
                                    width={40}
                                    height={30}
                                    className="h-7 w-10 shrink-0 rounded-sm object-cover shadow-sm"
                                />
                            ) : (
                                <span
                                    className="flex h-7 w-10 shrink-0 items-center justify-center rounded-sm border border-(--color-border) text-xs font-bold text-(--color-muted)"
                                    aria-label="국기 정보 없음"
                                >
                                    —
                                </span>
                            )}
                            <div className="min-w-0">
                                {language.language ? (
                                    <h3 className="m-0 text-lg font-bold text-(--color-foreground)">
                                        {language.language}
                                    </h3>
                                ) : null}
                                {language.fluency ? (
                                    <p className="mt-1 text-base leading-snug font-semibold text-(--color-muted)">
                                        {language.fluency}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
