import type { PublicJobField } from "@/lib/public-job-field";
import type { AboutData, ValuePillar } from "@/types/about";
import type { ResumeBasics, ResumeBasicsPresentation } from "@/types/resume";
import { getResumeProfileBrand } from "@/lib/resume-profile-preset";
import { ResumeProfileIcon } from "@/components/resume/ResumeProfileIcon";

const PLACEHOLDER_IMAGE = "/avatar-placeholder.svg";

const sectionPresentation: Record<string, { emoji: string; label: string }> = {
    직무경험: { emoji: "💼", label: "현장에서 만든 변화" },
    "학업/프로젝트": { emoji: "🛠️", label: "직접 구현한 프로젝트" },
    "연구/개발": { emoji: "🔬", label: "탐구와 개발" },
    개인사업: { emoji: "🚀", label: "운영 중인 개인 프로젝트" },
    "동아리/대외활동": { emoji: "🤝", label: "함께 만든 경험" },
    "공모전/대회": { emoji: "🏆", label: "도전과 결과" },
    "인턴/알바": { emoji: "📚", label: "실무 경험" },
    기타: { emoji: "✨", label: "그 밖의 기여" },
};

const competencyPresentation: Record<string, string> = {
    문제해결: "🔎",
    "협업/소통": "🤝",
    "도전/혁신": "⚡",
    "리더십/팔로우십": "🧭",
    "성공/몰입": "🔥",
    "실패/성장": "🌱",
    의사결정: "💡",
};

type Props = {
    data: AboutData;
    basics: ResumeBasics;
    basicsPresentation: ResumeBasicsPresentation;
    jobField: PublicJobField;
    valuePillars: ValuePillar[];
};

function HighlightText({ text }: { text: string }) {
    const separatorIndex = text.indexOf(":");
    if (separatorIndex < 1) return <>{text}</>;

    return (
        <>
            <strong className="font-bold text-(--color-accent)">
                {text.slice(0, separatorIndex)}
            </strong>
            {text.slice(separatorIndex)}
        </>
    );
}

export default function AboutView({
    data,
    basics,
    basicsPresentation,
    jobField,
    valuePillars,
}: Props) {
    const visible = basicsPresentation.visibility;
    const resolvedProfileImage = basics.image?.trim() || PLACEHOLDER_IMAGE;
    const sections = data.sections ?? {};
    const competencySections = data.competencySections ?? {};
    const profileEmoji = jobField.emoji;
    const profileLabel = `${jobField.name.toUpperCase()} PROFILE`;
    const location = basics.location
        ? [
              basics.location.address,
              basics.location.addressDetail,
              basics.location.city,
              basics.location.region,
              basics.location.postalCode,
              basics.location.countryCode === "KR"
                  ? "대한민국"
                  : basics.location.countryCode === "US"
                    ? "미국"
                    : basics.location.countryCode,
          ]
              .filter(Boolean)
              .join(", ")
        : "";

    const contactEntries = [
        {
            label: "Email",
            value: visible.email ? basics.email?.trim() : undefined,
            href: basics.email ? `mailto:${basics.email}` : undefined,
        },
        {
            label: "전화번호",
            value: visible.phone ? basics.phone?.trim() : undefined,
            href: basics.phone
                ? `tel:${basics.phone.replace(/[^\d+]/g, "")}`
                : undefined,
        },
        {
            label: "위치",
            value: visible.location ? location : undefined,
            href: undefined,
        },
        {
            label: "웹사이트",
            value: visible.url ? basics.url?.trim() : undefined,
            href: basics.url || undefined,
        },
    ].filter((entry) => entry.value);

    const sectionEntries = Object.entries(sections).filter(
        (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].length > 0
    );
    const competencyEntries = Object.entries(competencySections).filter(
        (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].length > 0
    );

    return (
        <article className="tablet:py-14 py-10">
            <header className="tablet:p-10 relative overflow-hidden rounded-3xl border border-(--color-border) bg-(--color-surface-subtle) p-6">
                <div
                    className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-(--color-accent)/12 blur-3xl"
                    aria-hidden="true"
                />
                <div className="tablet:flex-row tablet:items-center tablet:gap-10 relative flex flex-col gap-7">
                    {visible.image ? (
                        <div className="tablet:h-36 tablet:w-36 relative h-28 w-28 shrink-0">
                            <div
                                className="absolute inset-0 rounded-full bg-(--color-accent)/25 blur-xl"
                                aria-hidden="true"
                            />
                            <img
                                src={resolvedProfileImage}
                                alt={`${basics.name || "프로필"} 사진`}
                                width={144}
                                height={144}
                                className={`tablet:h-36 tablet:w-36 relative h-28 w-28 object-cover ring-4 ring-(--color-accent)/30 ${
                                    basics.imageStyle === "squared"
                                        ? "rounded-none"
                                        : basics.imageStyle === "standard"
                                          ? "rounded-xl"
                                          : "rounded-full"
                                }`}
                            />
                        </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-(--color-accent)/10 px-3 py-1 text-xs font-bold tracking-[0.16em] text-(--color-accent)">
                            <span aria-hidden="true">{profileEmoji}</span>
                            {profileLabel}
                        </p>
                        {visible.name && basics.name && (
                            <h1 className="tablet:text-5xl text-4xl font-black tracking-tight text-(--color-foreground)">
                                {basics.name}
                            </h1>
                        )}
                        {data.description && (
                            <p className="tablet:text-2xl mt-4 max-w-3xl text-xl leading-relaxed font-semibold text-(--color-foreground)">
                                {data.description}
                            </p>
                        )}
                        {data.descriptionSub && (
                            <p className="mt-3 max-w-3xl text-base leading-7 text-(--color-muted)">
                                {data.descriptionSub}
                            </p>
                        )}
                    </div>
                </div>

                {contactEntries.length > 0 && (
                    <div className="tablet:grid-cols-2 relative mt-8 grid overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-border)">
                        {contactEntries.map(({ label, value, href }) => {
                            const content = (
                                <>
                                    <span className="text-[11px] font-bold tracking-[0.14em] text-(--color-muted) uppercase">
                                        {label}
                                    </span>
                                    <span className="mt-1 truncate text-sm font-semibold text-(--color-foreground)">
                                        {value}
                                    </span>
                                </>
                            );

                            return href ? (
                                <a
                                    key={label}
                                    href={href}
                                    className="flex min-w-0 flex-col bg-(--color-surface) px-4 py-4 transition-colors hover:bg-(--color-accent)/8"
                                    target={
                                        href.startsWith("http")
                                            ? "_blank"
                                            : undefined
                                    }
                                    rel={
                                        href.startsWith("http")
                                            ? "noopener noreferrer"
                                            : undefined
                                    }
                                >
                                    {content}
                                </a>
                            ) : (
                                <div
                                    key={label}
                                    className="flex min-w-0 flex-col bg-(--color-surface) px-4 py-4"
                                >
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                )}
                {visible.profiles && basics.profiles?.length ? (
                    <div className="relative mt-4 flex flex-wrap gap-2">
                        {basics.profiles.map((profile, index) => {
                            const brand = getResumeProfileBrand(profile);
                            return profile.url ? (
                                <a
                                    key={`${brand.preset}-${index}`}
                                    href={profile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${brand.label} 프로필 열기`}
                                    style={{
                                        backgroundColor: brand.backgroundColor,
                                        color: brand.foregroundColor,
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold no-underline shadow-sm transition-opacity hover:opacity-85"
                                >
                                    <ResumeProfileIcon preset={brand.preset} />
                                    {profile.username ||
                                        profile.network ||
                                        brand.label}
                                </a>
                            ) : null;
                        })}
                    </div>
                ) : null}
            </header>

            {valuePillars.length > 0 && (
                <section className="mt-14" aria-labelledby="about-values-title">
                    <div className="mb-6">
                        <p className="text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                            How I Work
                        </p>
                        <h2
                            id="about-values-title"
                            className="mt-2 text-3xl font-black tracking-tight text-(--color-foreground)"
                        >
                            일하는 방식
                        </h2>
                        <p className="mt-2 text-base leading-7 text-(--color-muted)">
                            경험을 구현과 운영으로 연결할 때 지키는 기준
                        </p>
                    </div>
                    <div className="tablet:grid-cols-3 grid gap-4">
                        {valuePillars.map((pillar, index) => (
                            <article
                                key={`${pillar.label}-${index}`}
                                className="card-lift rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                            >
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-accent)/10 text-sm font-black text-(--color-accent)">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <p className="mt-5 text-xs font-bold tracking-[0.14em] text-(--color-accent) uppercase">
                                    {pillar.sub}
                                </p>
                                <h3 className="mt-2 text-xl font-black text-(--color-foreground)">
                                    {pillar.label}
                                </h3>
                                <p className="mt-3 text-base leading-7 text-(--color-muted)">
                                    {pillar.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {sectionEntries.length > 0 && (
                <section
                    className="mt-16 border-t border-(--color-border) pt-12"
                    aria-labelledby="about-experience-title"
                >
                    <div className="mb-7">
                        <p className="text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                            Evidence
                        </p>
                        <h2
                            id="about-experience-title"
                            className="mt-2 text-3xl font-black tracking-tight text-(--color-foreground)"
                        >
                            경험으로 증명한 일
                        </h2>
                    </div>
                    <div className="tablet:grid-cols-2 grid gap-5">
                        {sectionEntries.map(([category, items]) => {
                            const presentation = sectionPresentation[
                                category
                            ] ?? {
                                emoji: "📌",
                                label: category,
                            };
                            return (
                                <article
                                    key={category}
                                    className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-accent)/10 text-lg"
                                            aria-hidden="true"
                                        >
                                            {presentation.emoji}
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold tracking-[0.14em] text-(--color-accent) uppercase">
                                                {category}
                                            </p>
                                            <h3 className="mt-1 text-lg font-bold text-(--color-foreground)">
                                                {presentation.label}
                                            </h3>
                                        </div>
                                    </div>
                                    <ul className="mt-5 space-y-4">
                                        {items.map((item, index) => (
                                            <li
                                                key={index}
                                                className="flex gap-3 text-base leading-7 text-(--color-foreground)"
                                            >
                                                <span
                                                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-(--color-accent)"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    <HighlightText
                                                        text={item}
                                                    />
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {competencyEntries.length > 0 && (
                <section
                    className="mt-16 border-t border-(--color-border) pt-12"
                    aria-labelledby="about-competencies-title"
                >
                    <div className="mb-7">
                        <p className="text-xs font-bold tracking-[0.18em] text-(--color-accent) uppercase">
                            Strengths
                        </p>
                        <h2
                            id="about-competencies-title"
                            className="mt-2 text-3xl font-black tracking-tight text-(--color-foreground)"
                        >
                            문제를 푸는 방식
                        </h2>
                    </div>
                    <div className="tablet:grid-cols-2 grid gap-5">
                        {competencyEntries.map(([category, items]) => (
                            <article
                                key={category}
                                className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="text-2xl"
                                        aria-hidden="true"
                                    >
                                        {competencyPresentation[category] ??
                                            "✨"}
                                    </span>
                                    <h3 className="text-lg font-black text-(--color-foreground)">
                                        {category}
                                    </h3>
                                </div>
                                <ul className="mt-5 space-y-3">
                                    {items.map((item, index) => (
                                        <li
                                            key={index}
                                            className="rounded-xl bg-(--color-surface-subtle) px-4 py-3 text-base leading-7 text-(--color-foreground)"
                                        >
                                            <HighlightText text={item} />
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </article>
    );
}
