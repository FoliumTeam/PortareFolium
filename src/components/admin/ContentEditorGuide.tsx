import { FilePenLine, Settings2, UploadCloud } from "lucide-react";

type ContentEditorGuideProps = {
    kind: "post" | "portfolio";
};

export const ContentEditorGuide = ({ kind }: ContentEditorGuideProps) => {
    const label = kind === "post" ? "포스트" : "프로젝트";
    const settings =
        kind === "post"
            ? "설정에서 설명·카테고리·직무 분야·공개 여부를 확인"
            : "설정에서 요약·대표 이미지·직무 분야를 확인";

    return (
        <section
            aria-label={`${label} 작성 순서`}
            className="tablet:grid-cols-3 mb-3 grid gap-2 rounded-xl border border-(--color-accent)/25 bg-(--color-accent)/5 p-3"
        >
            {[
                {
                    Icon: FilePenLine,
                    title: "1. 제목과 주소",
                    description: "제목 입력 후 자동 생성된 slug 확인",
                },
                {
                    Icon: Settings2,
                    title: "2. 공개 정보",
                    description: settings,
                },
                {
                    Icon: UploadCloud,
                    title: "3. 본문과 저장",
                    description: "본문 작성 후 저장·미리보기로 최종 확인",
                },
            ].map(({ Icon, title, description }) => (
                <div
                    key={title}
                    className="flex items-start gap-2 rounded-lg p-2"
                >
                    <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-(--color-accent)"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-xs font-bold text-(--color-foreground)">
                            {title}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-(--color-muted)">
                            {description}
                        </p>
                    </div>
                </div>
            ))}
        </section>
    );
};
