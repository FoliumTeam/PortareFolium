type FeatureItem = {
    label: string;
    title: string;
    description: string;
};

type FlowStep = {
    title: string;
    description: string;
};

// 사례 컴포넌트 속성의 JSON 문자열 파싱 경계
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonArray = (value?: string): unknown[] => {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const readText = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

// 구조화된 사례 카드 항목 정규화
const parseFeatureItems = (value?: string): FeatureItem[] =>
    parseJsonArray(value).flatMap((item) => {
        if (!isRecord(item)) return [];
        const title = readText(item.title);
        const description = readText(item.description);
        if (!title || !description) return [];
        return [
            {
                label: readText(item.label),
                title,
                description,
            },
        ];
    });

const parseStringItems = (value?: string): string[] =>
    parseJsonArray(value).map(readText).filter(Boolean);

// 구조화된 사례 흐름 항목 정규화
const parseFlowSteps = (value?: string): FlowStep[] =>
    parseJsonArray(value).flatMap((item) => {
        if (!isRecord(item)) return [];
        const title = readText(item.title);
        const description = readText(item.description);
        return title && description ? [{ title, description }] : [];
    });

type PortfolioFeatureGridProps = {
    items?: string;
};

// 사례의 핵심 기능 카드 묶음 표시
export function PortfolioFeatureGrid({
    items: rawItems,
}: PortfolioFeatureGridProps) {
    const items = parseFeatureItems(rawItems);
    if (items.length === 0) return null;

    return (
        <div className="tablet:grid-cols-2 my-8 grid gap-4" data-pdf-block>
            {items.map((item, index) => (
                <article
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-5"
                    data-pdf-block-item
                >
                    {item.label && (
                        <p className="text-xs font-bold tracking-[0.16em] text-(--color-accent) uppercase">
                            {item.label}
                        </p>
                    )}
                    <h3 className="mt-3 text-xl font-bold text-(--color-foreground)">
                        {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-(--color-muted)">
                        {item.description}
                    </p>
                </article>
            ))}
        </div>
    );
}

type PortfolioBoundaryProps = {
    owned?: string;
    outside?: string;
};

// 범위 목록 카드 공통 표시
const BoundaryList = ({
    title,
    items,
    tone,
}: {
    title: string;
    items: string[];
    tone: "accent" | "muted";
}) => (
    <section
        className={`rounded-2xl border p-5 ${
            tone === "accent"
                ? "border-(--color-accent) bg-(--color-accent) text-(--color-on-accent)"
                : "border-(--color-border) bg-(--color-surface-subtle)"
        }`}
        data-pdf-block-item
    >
        <h3
            className={`text-xl font-bold ${
                tone === "accent"
                    ? "text-(--color-on-accent)"
                    : "text-(--color-foreground)"
            }`}
        >
            {title}
        </h3>
        <ul className="mt-4 space-y-3">
            {items.map((item) => (
                <li key={item} className="flex gap-3 text-base leading-relaxed">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    </section>
);

// 사례의 관리 범위와 비소유 범위 분리 표시
export function PortfolioBoundary({
    owned: rawOwned,
    outside: rawOutside,
}: PortfolioBoundaryProps) {
    const owned = parseStringItems(rawOwned);
    const outside = parseStringItems(rawOutside);
    if (owned.length === 0 && outside.length === 0) return null;

    return (
        <div className="tablet:grid-cols-2 my-8 grid gap-4" data-pdf-block>
            {owned.length > 0 && (
                <BoundaryList title="관리 범위" items={owned} tone="accent" />
            )}
            {outside.length > 0 && (
                <BoundaryList
                    title="직접 소유하지 않는 범위"
                    items={outside}
                    tone="muted"
                />
            )}
        </div>
    );
}

type PortfolioFlowProps = {
    steps?: string;
};

// 사례의 순차 흐름 카드 표시
export function PortfolioFlow({ steps: rawSteps }: PortfolioFlowProps) {
    const steps = parseFlowSteps(rawSteps);
    if (steps.length === 0) return null;

    return (
        <ol
            className="tablet:grid-cols-2 laptop:grid-cols-4 my-8 grid gap-3"
            data-pdf-block
        >
            {steps.map((step, index) => (
                <li
                    key={`${step.title}-${index}`}
                    className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4"
                    data-pdf-block-item
                >
                    <p className="text-xs font-bold tracking-[0.14em] text-(--color-accent)">
                        STEP {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 text-lg font-bold text-(--color-foreground)">
                        {step.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-(--color-muted)">
                        {step.description}
                    </p>
                </li>
            ))}
        </ol>
    );
}
