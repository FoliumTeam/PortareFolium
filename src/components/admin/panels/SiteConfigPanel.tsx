import { useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { browserClient } from "@/lib/supabase";

type ColorScheme =
    | "blue"
    | "gray"
    | "beige"
    | "blackwhite"
    | "forest"
    | "sunset"
    | "lavender"
    | "blue-plain"
    | "beige-plain"
    | "forest-plain"
    | "sunset-plain"
    | "lavender-plain";

type JobFieldItem = {
    id: string;
    name: string;
    emoji: string;
};

const COLOR_OPTIONS: { value: ColorScheme; label: string; desc: string }[] = [
    { value: "gray", label: "Gray", desc: "중립 회색" },
    { value: "blackwhite", label: "Black & White", desc: "순수 흑백" },
    { value: "blue", label: "Blue", desc: "파란톤 액센트" },
    {
        value: "blue-plain",
        label: "Blue (Plain)",
        desc: "포인트 배경 없는 파란톤",
    },
    { value: "beige", label: "Beige", desc: "따뜻한 베이지" },
    {
        value: "beige-plain",
        label: "Beige (Plain)",
        desc: "포인트 배경 없는 베이지",
    },
    { value: "forest", label: "Forest", desc: "깊은 숲의 그린" },
    {
        value: "forest-plain",
        label: "Forest (Plain)",
        desc: "포인트 배경 없는 그린",
    },
    { value: "sunset", label: "Sunset", desc: "따뜻한 석양 (오렌지)" },
    {
        value: "sunset-plain",
        label: "Sunset (Plain)",
        desc: "포인트 배경 없는 오렌지",
    },
    { value: "lavender", label: "Lavender", desc: "차분한 보라" },
    {
        value: "lavender-plain",
        label: "Lavender (Plain)",
        desc: "포인트 배경 없는 보라",
    },
];

export default function SiteConfigPanel() {
    const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
        if (typeof document !== "undefined") {
            const attr =
                document.documentElement.getAttribute("data-color-scheme");
            if (attr) return attr as ColorScheme;
        }
        return "gray";
    });
    const [activeJobField, setActiveJobField] = useState<string>("");
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [seoConfig, setSeoConfig] = useState({
        defaultTitle: "",
        defaultDescription: "포트폴리오 & 기술 블로그",
        defaultOgImage: "",
    });
    const [saving, setSaving] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // 새 job field 추가 폼 상태
    const [newName, setNewName] = useState("");
    const [newEmoji, setNewEmoji] = useState("✨");
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Supabase에서 현재 설정 로드
    useEffect(() => {
        if (!browserClient) return;
        browserClient
            .from("site_config")
            .select("key, value")
            .in("key", [
                "color_scheme",
                "job_field",
                "job_fields",
                "site_name",
                "seo_config",
            ])
            .then(({ data: rows }) => {
                if (!rows) return;
                const ordered = [...rows].sort((a) =>
                    a.key === "site_name" ? -1 : 1
                );
                for (const row of ordered) {
                    const v =
                        typeof row.value === "string"
                            ? JSON.parse(row.value)
                            : row.value;
                    if (row.key === "color_scheme") {
                        setColorScheme(v as ColorScheme);
                        localStorage.setItem("folium_color_scheme", v);
                        document.documentElement.setAttribute(
                            "data-color-scheme",
                            v as ColorScheme
                        );
                    }
                    if (row.key === "job_field") setActiveJobField(v as string);
                    if (row.key === "job_fields")
                        setJobFields(v as JobFieldItem[]);
                    if (row.key === "site_name" && typeof v === "string") {
                        setSeoConfig((prev) => ({ ...prev, defaultTitle: v }));
                    }
                    if (row.key === "seo_config") {
                        setSeoConfig((prev) => ({
                            ...prev,
                            defaultDescription:
                                v.default_description ||
                                "포트폴리오 & 기술 블로그",
                            defaultOgImage: v.default_og_image || "",
                        }));
                    }
                }
            });
    }, []);

    // picker 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node)
            ) {
                setShowPicker(false);
            }
        };
        if (showPicker) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showPicker]);

    // job_fields + job_field upsert
    const saveJobFields = async (
        fields: JobFieldItem[],
        active: string
    ): Promise<boolean> => {
        if (!browserClient) return false;
        const { error } = await browserClient.from("site_config").upsert(
            [
                {
                    key: "job_fields",
                    value: fields,
                },
                {
                    key: "job_field",
                    value: JSON.stringify(active),
                },
            ],
            { onConflict: "key" }
        );
        return !error;
    };

    // job field 추가
    const handleAddJobField = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const id = trimmed.toLowerCase().replace(/\s+/g, "-");
        if (jobFields.some((f) => f.id === id)) {
            setStatus({ type: "error", msg: `"${id}" ID가 이미 존재합니다` });
            return;
        }
        const next = [...jobFields, { id, name: trimmed, emoji: newEmoji }];
        const ok = await saveJobFields(next, activeJobField);
        if (ok) {
            setJobFields(next);
            setNewName("");
            setNewEmoji("✨");
            setStatus({ type: "success", msg: "직무 분야가 추가됐습니다" });
        } else {
            setStatus({ type: "error", msg: "저장 실패" });
        }
    };

    // job field 삭제 + cascade 처리
    const handleDeleteJobField = async (id: string) => {
        if (!browserClient) return;
        // cascade: posts, portfolio_items의 job_field가 해당 id면 null로
        await Promise.all([
            browserClient
                .from("posts")
                .update({ job_field: null })
                .eq("job_field", id),
            browserClient
                .from("portfolio_items")
                .update({ job_field: null })
                .eq("job_field", id),
        ]);
        const next = jobFields.filter((f) => f.id !== id);
        const nextActive =
            activeJobField === id ? (next[0]?.id ?? "") : activeJobField;
        const ok = await saveJobFields(next, nextActive);
        if (ok) {
            setJobFields(next);
            setActiveJobField(nextActive);
            setStatus({ type: "success", msg: "직무 분야가 삭제됐습니다" });
        } else {
            setStatus({ type: "error", msg: "삭제 실패" });
        }
    };

    // active job field 변경 (즉시 저장)
    const handleSelectJobField = async (id: string) => {
        setActiveJobField(id);
        if (!browserClient) return;
        await browserClient
            .from("site_config")
            .upsert([{ key: "job_field", value: JSON.stringify(id) }], {
                onConflict: "key",
            });
    };

    // site_config upsert (색상 + SEO)
    const handleSave = async () => {
        if (!browserClient) return;
        setSaving(true);
        setStatus(null);

        const rows = [
            { key: "color_scheme", value: JSON.stringify(colorScheme) },
            // site_name: 사이트명 단일 출처
            { key: "site_name", value: JSON.stringify(seoConfig.defaultTitle) },
            {
                key: "seo_config",
                value: {
                    default_description: seoConfig.defaultDescription,
                    default_og_image: seoConfig.defaultOgImage,
                },
            },
        ];

        const { error } = await browserClient
            .from("site_config")
            .upsert(rows, { onConflict: "key" });

        if (!error) {
            localStorage.setItem("folium_color_scheme", colorScheme);
        }

        setSaving(false);
        setStatus(
            error
                ? { type: "error", msg: error.message }
                : {
                      type: "success",
                      msg: "설정이 저장됐습니다. 변경 사항이 사이트에 반영됐습니다.",
                  }
        );
    };

    // Vercel Deploy Hook 호출
    const handleDeploy = async () => {
        const hookUrl = import.meta.env.PUBLIC_VERCEL_DEPLOY_HOOK_URL as
            | string
            | undefined;
        if (!hookUrl) {
            setStatus({
                type: "error",
                msg: "VERCEL_DEPLOY_HOOK_URL이 설정되지 않았습니다. .env.local을 확인하세요.",
            });
            return;
        }
        setDeploying(true);
        setStatus(null);
        try {
            const res = await fetch(hookUrl, { method: "POST" });
            if (res.ok) {
                setStatus({
                    type: "success",
                    msg: "빌드가 트리거됐습니다. 약 30~60초 후 최신 콘텐츠가 배포됩니다.",
                });
            } else {
                setStatus({
                    type: "error",
                    msg: `빌드 트리거 실패: HTTP ${res.status}`,
                });
            }
        } catch (e: unknown) {
            setStatus({
                type: "error",
                msg: `네트워크 오류: ${(e as Error).message}`,
            });
        }
        setDeploying(false);
    };

    return (
        <div className="max-w-lg space-y-8">
            <h2 className="text-2xl font-bold text-(--color-foreground)">
                사이트 설정
            </h2>

            {/* 컬러 스킴 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    컬러 스킴
                </h3>
                <p className="text-sm text-(--color-muted)">
                    새로운 테마를 선택하면 대시보드 화면에 즉시 반영되며, '설정
                    저장' 버튼을 누르면 다른 사용자들에게도 배포됩니다.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {COLOR_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setColorScheme(opt.value);
                                document.documentElement.setAttribute(
                                    "data-color-scheme",
                                    opt.value
                                );
                            }}
                            className={[
                                "flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors",
                                colorScheme === opt.value
                                    ? "border-(--color-accent) bg-(--color-accent)/5"
                                    : "border-(--color-border) hover:border-(--color-accent)/50",
                            ].join(" ")}
                        >
                            <span className="text-base font-semibold text-(--color-foreground)">
                                {opt.label}
                            </span>
                            <span className="text-sm text-(--color-muted)">
                                {opt.desc}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* 직무 분야 관리 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    이력서 직무 분야
                </h3>
                <p className="text-sm text-(--color-muted)">
                    Resume / Portfolio 페이지에서 이 값으로 항목을 필터링합니다.
                    활성 분야를 클릭해서 선택하세요.
                </p>

                {/* job field 목록 */}
                <div className="space-y-2">
                    {jobFields.length === 0 && (
                        <p className="text-sm text-(--color-muted)">
                            등록된 직무 분야가 없습니다
                        </p>
                    )}
                    {jobFields.map((field) => (
                        <div
                            key={field.id}
                            className={[
                                "flex items-center gap-5 rounded-lg border px-4 py-2.5",
                                activeJobField === field.id
                                    ? "border-(--color-accent) bg-(--color-accent)/5"
                                    : "border-(--color-border)",
                            ].join(" ")}
                        >
                            <button
                                onClick={() => handleSelectJobField(field.id)}
                                className="flex flex-1 items-center gap-2 text-left"
                            >
                                <span className="text-xl">{field.emoji}</span>
                                <span className="text-base font-medium text-(--color-foreground)">
                                    {field.name}
                                </span>
                                {activeJobField === field.id && (
                                    <span className="ml-auto text-sm font-semibold text-(--color-accent)">
                                        활성
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleDeleteJobField(field.id)}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white"
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                </div>

                {/* 새 job field 추가 폼 */}
                <div className="flex items-center gap-2 pt-1">
                    {/* emoji picker */}
                    <div className="relative" ref={pickerRef}>
                        <button
                            type="button"
                            onClick={() => setShowPicker((v) => !v)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-(--color-border) text-xl hover:border-(--color-accent)/50"
                        >
                            {newEmoji}
                        </button>
                        {showPicker && (
                            <div className="absolute bottom-12 left-0 z-50">
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: {
                                        native: string;
                                    }) => {
                                        setNewEmoji(emoji.native);
                                        setShowPicker(false);
                                    }}
                                    locale="ko"
                                    previewPosition="none"
                                    skinTonePosition="none"
                                />
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddJobField();
                        }}
                        placeholder="직무 분야 이름"
                        className="h-10 flex-1 rounded-lg border border-(--color-border) bg-transparent px-3 text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                    />
                    <button
                        onClick={handleAddJobField}
                        disabled={!newName.trim()}
                        className="h-10 rounded-lg bg-(--color-accent) px-4 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        추가
                    </button>
                </div>
            </section>

            {/* 글로벌 SEO 설정 */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    글로벌 SEO 기본값
                </h3>
                <p className="text-sm text-(--color-muted)">
                    개별 포스트나 포트폴리오에 SEO 설정이 없을 때 사용되는
                    기본값입니다.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                            기본 사이트 제목 (Title)
                        </label>
                        <input
                            type="text"
                            value={seoConfig.defaultTitle}
                            onChange={(e) =>
                                setSeoConfig({
                                    ...seoConfig,
                                    defaultTitle: e.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                            기본 사이트 설명 (Description)
                        </label>
                        <textarea
                            value={seoConfig.defaultDescription}
                            onChange={(e) =>
                                setSeoConfig({
                                    ...seoConfig,
                                    defaultDescription: e.target.value,
                                })
                            }
                            rows={3}
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-(--color-muted)">
                            기본 OG 이미지 URL
                        </label>
                        <input
                            type="text"
                            value={seoConfig.defaultOgImage}
                            onChange={(e) =>
                                setSeoConfig({
                                    ...seoConfig,
                                    defaultOgImage: e.target.value,
                                })
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-(--color-border) bg-transparent px-3 py-2 text-(--color-foreground) transition-colors focus:border-(--color-accent) focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            {/* 피드백 */}
            {status && (
                <p
                    className={`rounded-lg px-3 py-2 text-base ${status.type === "error" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30"}`}
                >
                    {status.msg}
                </p>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-(--color-accent) px-5 py-2.5 text-base font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? "저장 중..." : "설정 저장"}
                </button>

                <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="rounded-lg border border-(--color-border) px-5 py-2.5 text-base font-semibold text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle) disabled:opacity-50"
                >
                    {deploying ? "빌드 트리거 중..." : "🚀 게시 (빌드 트리거)"}
                </button>
            </div>

            <div className="space-y-1 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-4 text-sm text-(--color-muted)">
                <p className="font-semibold text-(--color-foreground)">
                    빌드 트리거 동작 방식
                </p>
                <p>버튼을 누르면 Vercel이 새 빌드를 시작합니다.</p>
                <p>
                    블로그/포트폴리오에 추가·수정한 내용이 약 30~60초 후
                    반영됩니다.
                </p>
                <p>About·테마 변경은 빌드 없이도 즉시 반영됩니다.</p>
            </div>
        </div>
    );
}
