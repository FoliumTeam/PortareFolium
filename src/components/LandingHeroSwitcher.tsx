import Link from "next/link";

interface ValuePillar {
    label: string;
    sub: string;
    description: string;
}

interface Props {
    heroName: string;
    heroDesc: string;
    descriptionSub?: string;
    profileImage?: string;
    valuePillars: ValuePillar[];
}

// 히어로 이름에서 첫 단어를 accent 색상으로 분리
function splitFirstWord(name: string): { first: string; rest: string } {
    const idx = name.indexOf(" ");
    if (idx === -1) return { first: name, rest: "" };
    return { first: name.slice(0, idx), rest: name.slice(idx) };
}

export default function LandingHero({
    heroName,
    heroDesc,
    descriptionSub,
    profileImage,
    valuePillars,
}: Props) {
    const { first, rest } = splitFirstWord(heroName);

    return (
        <section className="tablet:py-32 relative mx-auto max-w-5xl py-24">
            {/* 히어로 레이아웃 */}
            <div className="tablet:flex-row tablet:items-start tablet:gap-16 flex flex-col gap-12">
                {/* 왼쪽: 텍스트 + CTA */}
                <div className="tablet:w-3/5 tablet:text-left text-center">
                    <h1 className="animate-fade-in-up stagger-1 tablet:text-9xl mb-3 text-5xl leading-[1.0] font-(--font-display) font-black tracking-tighter">
                        <span className="text-(--color-accent)">{first}</span>
                        <span className="text-(--color-foreground)">
                            {rest}
                        </span>
                    </h1>

                    <p className="animate-fade-in-up stagger-2 tablet:text-4xl mb-6 text-2xl font-(--font-display) font-bold text-(--color-foreground)">
                        {heroDesc}
                    </p>

                    {descriptionSub && (
                        <p className="animate-fade-in-up stagger-2 tablet:text-xl mb-8 max-w-xl text-lg leading-relaxed text-(--color-muted)">
                            {descriptionSub}
                        </p>
                    )}

                    <div className="animate-fade-in-up stagger-3">
                        <div className="tablet:justify-start flex flex-wrap justify-center gap-4">
                            <Link
                                href="/portfolio"
                                className="rounded-2xl bg-(--color-accent) px-6 py-2.5 text-base font-semibold text-(--color-on-accent) transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
                            >
                                Portfolio 보기
                            </Link>
                            <Link
                                href="/resume"
                                className="rounded-2xl border-2 border-(--color-border) px-6 py-2.5 text-base font-semibold text-(--color-foreground) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--color-accent) hover:text-(--color-accent)"
                            >
                                Resume 보기
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 프로필 이미지 */}
                {profileImage && (
                    <div className="tablet:sticky tablet:top-24 tablet:w-2/5 flex justify-center">
                        <div className="animate-fade-in relative">
                            <div className="absolute -inset-2 rounded-xl bg-(--color-accent) opacity-[0.12] blur-lg" />
                            <img
                                src={profileImage}
                                alt={heroName}
                                width={320}
                                height={320}
                                className="tablet:h-80 tablet:w-80 relative h-64 w-64 rounded-xl border-2 border-(--color-accent)/20 object-cover transition-all hover:border-(--color-accent)/40"
                                loading="eager"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Value Pillars */}
            <div className="animate-fade-in-up stagger-4 tablet:grid-cols-3 mt-16 grid gap-4">
                {valuePillars.map((pillar, idx) => (
                    <div
                        key={idx}
                        className="rounded-xl border border-(--color-border) bg-(--color-surface-subtle) px-5 py-5"
                    >
                        <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--color-accent)/10 text-sm font-(--font-display) font-bold text-(--color-accent)">
                                {String(idx + 1).padStart(2, "0")}
                            </span>
                            <h3 className="text-base font-(--font-display) font-bold text-(--color-foreground)">
                                {pillar.label}
                            </h3>
                        </div>
                        <p className="mb-2 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
                            {pillar.sub}
                        </p>
                        <p className="text-sm leading-relaxed text-(--color-muted)">
                            {pillar.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
