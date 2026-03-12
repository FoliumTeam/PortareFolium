export type JobFieldItem = { id: string; name: string; emoji?: string };

// job field 다중 선택 toggle 버튼 그룹
export function JobFieldSelector({
    value,
    fields,
    onChange,
}: {
    value: string | string[] | undefined;
    fields: JobFieldItem[];
    onChange: (v: string[]) => void;
}) {
    const selected =
        value == null ? [] : Array.isArray(value) ? value : [value];
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-(--color-muted)">
                직무 분야
            </label>
            <div className="flex flex-wrap gap-2">
                {fields.map((f) => {
                    const checked = selected.includes(f.id);
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                                const next = checked
                                    ? selected.filter((id) => id !== f.id)
                                    : [...selected, f.id];
                                onChange(next);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-opacity ${
                                checked
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "border border-(--color-border) text-(--color-muted) hover:text-(--color-foreground)"
                            }`}
                        >
                            {f.emoji} {f.name}
                        </button>
                    );
                })}
                {fields.length === 0 && (
                    <span className="text-sm text-(--color-muted)">
                        등록된 직무 분야 없음
                    </span>
                )}
            </div>
        </div>
    );
}

// job field id 배열을 badge 목록으로 렌더링
export function JobFieldBadges({
    value,
    fields,
}: {
    value: string | string[] | null | undefined;
    fields: JobFieldItem[];
}) {
    const ids = Array.isArray(value) ? value : value ? [value] : [];
    if (ids.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {ids.map((id) => {
                const f = fields.find((jf) => jf.id === id);
                return (
                    <span
                        key={id}
                        className="rounded bg-(--color-border) px-1.5 py-0.5 text-xs text-(--color-muted)"
                    >
                        {f ? `${f.emoji} ${f.name}` : id}
                    </span>
                );
            })}
        </div>
    );
}
