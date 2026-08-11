import Link from "next/link";

type ProfileContent = "about" | "resume" | "portfolio" | "blog";

const contentLabels: Record<ProfileContent, string> = {
    about: "About me",
    resume: "Resume",
    portfolio: "Portfolio",
    blog: "Blog",
};

export default function ProfileSelectionPage({
    content,
}: {
    content: ProfileContent;
}) {
    const label = contentLabels[content];

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
            <div className="tablet:grid-cols-2 mt-10 grid w-full gap-4">
                <Link
                    href={`/web/${content}`}
                    className="card-lift rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6 text-left transition-colors hover:border-(--color-accent)"
                >
                    <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                        Web
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-(--color-foreground)">
                        Web {label}
                    </h2>
                    <p className="mt-2 text-sm text-(--color-muted)">
                        웹 개발 경력과 프로젝트를 확인합니다.
                    </p>
                </Link>
                <Link
                    href={`/game/${content}`}
                    className="card-lift rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6 text-left transition-colors hover:border-(--color-accent)"
                >
                    <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                        Game
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-(--color-foreground)">
                        Game {label}
                    </h2>
                    <p className="mt-2 text-sm text-(--color-muted)">
                        게임 개발 경력과 프로젝트를 확인합니다.
                    </p>
                </Link>
            </div>
        </section>
    );
}
