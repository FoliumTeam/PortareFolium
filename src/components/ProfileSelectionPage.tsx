import Link from "next/link";
import { getPublicJobFields } from "@/lib/public-job-field";

type ProfileContent = "home" | "about" | "resume" | "portfolio" | "blog";

const contentLabels: Record<ProfileContent, string> = {
    home: "Portfolio",
    about: "About me",
    resume: "Resume",
    portfolio: "Portfolio",
    blog: "Blog",
};

export default async function ProfileSelectionPage({
    content,
}: {
    content: ProfileContent;
}) {
    const label = contentLabels[content];
    const jobFields = await getPublicJobFields();

    return (
        <section className="mx-auto flex max-w-3xl flex-col items-center py-16 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-(--color-accent) uppercase">
                Portfolio Profile
            </p>
            <h1 className="mt-3 text-4xl font-(--font-display) font-black tracking-tight text-(--color-foreground)">
                어떤 분야의 {label}를 볼까요?
            </h1>
            <p className="mt-4 max-w-xl text-(--color-muted)">
                지원 분야에 맞는 profile을 선택하면 해당 분야의 경력, 프로젝트,
                기술 기록만 볼 수 있습니다.
            </p>
            {jobFields.length === 0 ? (
                <p className="mt-10 rounded-2xl border border-dashed border-(--color-border) px-6 py-8 text-sm text-(--color-muted)">
                    아직 공개 직무 분야가 등록되지 않았습니다.
                </p>
            ) : (
                <div className="tablet:grid-cols-2 mt-10 grid w-full gap-4">
                    {jobFields.map((field) => {
                        const href =
                            content === "home"
                                ? `/${field.id}`
                                : `/${field.id}/${content}`;
                        return (
                            <Link
                                key={field.id}
                                href={href}
                                className="card-lift rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6 text-left transition-colors hover:border-(--color-accent)"
                            >
                                <p className="text-2xl" aria-hidden="true">
                                    {field.emoji}
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-(--color-foreground)">
                                    {field.name} {label}
                                </h2>
                                <p className="mt-2 text-sm text-(--color-muted)">
                                    이 직무 분야의 공개 프로필을 확인합니다.
                                </p>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
