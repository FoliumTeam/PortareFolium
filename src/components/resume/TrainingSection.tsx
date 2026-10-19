import type { ResumeTraining } from "@/types/resume";

type Props = {
    entries: ResumeTraining[];
    label: string;
    variant?: "modern" | "classic";
};

/** 대학 학력과 별개인 직무 교육 과정을 표시한다. */
export default function TrainingSection({
    entries,
    label,
    variant = "modern",
}: Props) {
    const formatMonth = (value: string) => value.replace("-", ".");

    return (
        <section className="mb-10" data-pdf-block>
            <h2 className="mb-5 border-b border-(--color-border) pb-1.5 text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                {label}
            </h2>
            <div className={variant === "classic" ? "space-y-5" : "space-y-3"}>
                {entries.map((entry, index) => (
                    <div
                        key={`${entry.title}-${index}`}
                        className={
                            variant === "classic"
                                ? "border-b border-(--color-border) pb-5 last:border-b-0 last:pb-0"
                                : "rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4.5 py-3.5"
                        }
                        data-pdf-block-item
                    >
                        <h3 className="m-0 text-lg font-bold text-(--color-foreground)">
                            {entry.title}
                        </h3>
                        <p className="mt-1 text-base text-(--color-muted)">
                            {entry.organizer}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                            {formatMonth(entry.startMonth)} ~{" "}
                            {formatMonth(entry.endMonth)}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
