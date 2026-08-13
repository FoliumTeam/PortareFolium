import type { ResumeCareerPhase } from "@/types/resume";

interface Props {
    phases: ResumeCareerPhase[];
    label?: string;
}

// 커리어 타임라인 섹션 렌더링
export default function CareerPhasesSection({
    phases,
    label = "커리어 타임라인",
}: Props) {
    if (phases.length === 0) return null;

    // phase 번호 오름차순 정렬
    const sorted = [...phases].sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0));

    return (
        <section className="mb-10" data-pdf-block>
            <h2 className="mb-4 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {label}
            </h2>
            {/* 수평 진행 바 */}
            <div className="mb-5 flex gap-1">
                {sorted.map((_, idx) => (
                    <div
                        key={idx}
                        className="h-1.5 flex-1 rounded-full bg-(--color-accent)"
                        style={{
                            opacity:
                                0.35 +
                                idx * (0.65 / Math.max(sorted.length - 1, 1)),
                        }}
                    />
                ))}
            </div>
            <div
                className="grid divide-x divide-(--color-border)"
                style={{
                    gridTemplateColumns: `repeat(${sorted.length}, 1fr)`,
                }}
            >
                {sorted.map((phase, idx) => (
                    <div
                        key={idx}
                        className={`${idx === 0 ? "pr-6" : idx === sorted.length - 1 ? "pl-6" : "px-6"}`}
                    >
                        <p className="mb-0.5 text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                            PHASE {phase.phase}
                        </p>
                        {phase.startDate || phase.endDate ? (
                            <p
                                className="mb-2 text-xs text-(--color-muted)"
                                style={{
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {phase.startDate?.slice(0, 7)} ~{" "}
                                {phase.endDate?.slice(0, 7) || "진행 중"}
                            </p>
                        ) : null}
                        {phase.name ? (
                            <h3 className="mb-1 text-base font-bold text-(--color-foreground)">
                                {phase.name}
                            </h3>
                        ) : null}
                        {phase.description ? (
                            <p className="mb-3 text-sm leading-relaxed whitespace-pre-line text-(--color-muted)">
                                {phase.description}
                            </p>
                        ) : null}
                        {phase.keywords && phase.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {phase.keywords.map((kw, kIdx) => (
                                    <span
                                        key={kIdx}
                                        className="inline-block rounded bg-(--color-surface-subtle) px-2 py-0.5 text-xs text-(--color-muted)"
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}
