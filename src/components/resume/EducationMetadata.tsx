type Props = {
    items: Array<string | null | undefined>;
};

/** 학력 세부 정보를 경력 메타데이터와 같은 중립색 구분선으로 분리해 표시 */
export default function EducationMetadata({ items }: Props) {
    const visibleItems = items.filter((item): item is string =>
        Boolean(item?.trim())
    );

    if (visibleItems.length === 0) return null;

    return (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-(--color-muted)">
            {visibleItems.map((item, index) => (
                <span key={`${item}-${index}`}>
                    {index > 0 ? (
                        <span
                            className="mr-2 text-(--color-border)"
                            aria-hidden="true"
                        >
                            |
                        </span>
                    ) : null}
                    <span>{item}</span>
                </span>
            ))}
        </p>
    );
}
