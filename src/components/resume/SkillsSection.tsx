import type { ResumeSkill } from "@/types/resume";
import { SkillBadge, getSimpleIcon } from "@/components/resume/SkillBadge";

interface Props {
    skills: ResumeSkill[];
    label?: string;
}

export default function SkillsSection({ skills, label = "기술" }: Props) {
    if (skills.length === 0) return null;

    return (
        <section className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {label}
            </h2>
            <div className="space-y-3">
                {skills.map((skill, index) => {
                    const icon = skill.iconSlug
                        ? getSimpleIcon(skill.iconSlug)
                        : null;
                    return (
                        <div
                            key={`${skill.name}-${index}`}
                            className="tablet:grid tablet:grid-cols-[9rem_minmax(0,1fr)] tablet:items-start flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-subtle) p-4"
                            data-pdf-block-item
                        >
                            <h3 className="flex items-center gap-2 text-sm font-bold text-(--color-foreground)">
                                {icon ? (
                                    <svg
                                        role="img"
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 shrink-0"
                                        style={{
                                            fill:
                                                skill.iconColor ||
                                                `#${icon.hex}`,
                                        }}
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <title>{icon.title}</title>
                                        <path d={icon.path} />
                                    </svg>
                                ) : null}
                                {skill.name}
                            </h3>
                            <div className="flex min-w-0 flex-wrap gap-2">
                                {(skill.keywords ?? []).map(
                                    (keyword, keywordIndex) => (
                                        <SkillBadge
                                            key={`${keyword.name}-${keywordIndex}`}
                                            name={keyword.name}
                                            overrideSlug={keyword.iconSlug}
                                            overrideColor={keyword.iconColor}
                                            level={keyword.level}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
