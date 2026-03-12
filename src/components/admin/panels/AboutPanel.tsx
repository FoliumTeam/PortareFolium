/**
 * AboutPanel
 *
 * about_data 테이블에서 About 데이터를 불러와 편집하고
 * Supabase에 저장한다. 저장 즉시 프론트엔드에 반영된다.
 * Supabase about_data 테이블에 저장한다.
 */
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase";
import type {
    AboutData,
    AboutSectionKey,
    CompetencySectionKey,
} from "@/types/about";
import {
    ABOUT_SECTION_KEYS,
    COMPETENCY_SECTION_KEYS,
    SECTION_PLACEHOLDERS,
    COMPETENCY_PLACEHOLDERS,
} from "@/types/about";

/** 한 줄당 한 항목으로 파싱 */
function parseSectionText(text: string): string[] {
    return text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function AboutPanel() {
    const [profileImage, setProfileImage] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [rowId, setRowId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: "error" | "success";
        msg: string;
    } | null>(null);

    // uncontrolled refs (textarea undo 동작 보장)
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const descriptionSubRef = useRef<HTMLTextAreaElement>(null);
    const sectionRefs = useRef<
        Partial<Record<AboutSectionKey, HTMLTextAreaElement | null>>
    >({});
    const competencyRefs = useRef<
        Partial<Record<CompetencySectionKey, HTMLTextAreaElement | null>>
    >({});

    // Supabase에서 기존 about 데이터 로드
    useEffect(() => {
        if (!browserClient) return;
        browserClient
            .from("about_data")
            .select("id, data")
            .limit(1)
            .single()
            .then(({ data: row, error }) => {
                if (error || !row) return;
                const d = row.data as AboutData;
                setRowId(row.id);
                setProfileImage(d.profileImage ?? "");
                setName(d.name ?? "");
                setEmail(d.contacts?.email ?? "");
                setGithub(d.contacts?.github ?? "");
                setLinkedin(d.contacts?.linkedin ?? "");
                // uncontrolled: defaultValue 대신 직접 value 설정
                if (descriptionRef.current)
                    descriptionRef.current.value = d.description ?? "";
                if (descriptionSubRef.current)
                    descriptionSubRef.current.value = d.descriptionSub ?? "";
                ABOUT_SECTION_KEYS.forEach((k) => {
                    const el = sectionRefs.current[k];
                    if (el) el.value = (d.sections?.[k] ?? []).join("\n");
                });
                COMPETENCY_SECTION_KEYS.forEach((k) => {
                    const el = competencyRefs.current[k];
                    if (el)
                        el.value = (d.competencySections?.[k] ?? []).join("\n");
                });
            });
    }, []);

    const handleSave = async () => {
        if (!browserClient) return;
        setSaving(true);
        setStatus(null);

        const data: AboutData = {
            profileImage: profileImage.trim() || undefined,
            name: name.trim() || undefined,
            description: descriptionRef.current?.value?.trim() || undefined,
            descriptionSub:
                descriptionSubRef.current?.value?.trim() || undefined,
            contacts: {
                email: email.trim() || undefined,
                github: github.trim() || undefined,
                linkedin: linkedin.trim() || undefined,
            },
            sections: Object.fromEntries(
                ABOUT_SECTION_KEYS.map((k) => [
                    k,
                    parseSectionText(sectionRefs.current[k]?.value ?? ""),
                ])
            ) as AboutData["sections"],
            competencySections: Object.fromEntries(
                COMPETENCY_SECTION_KEYS.map((k) => [
                    k,
                    parseSectionText(competencyRefs.current[k]?.value ?? ""),
                ])
            ) as AboutData["competencySections"],
        };

        let err;
        if (rowId) {
            ({ error: err } = await browserClient
                .from("about_data")
                .update({ data })
                .eq("id", rowId));
        } else {
            const res = await browserClient
                .from("about_data")
                .insert({ data })
                .select("id")
                .single();
            err = res.error;
            if (res.data) setRowId(res.data.id);
        }

        setSaving(false);
        setStatus(
            err
                ? { type: "error", msg: err.message }
                : {
                      type: "success",
                      msg: "저장됐습니다. About 페이지에 즉시 반영됩니다.",
                  }
        );
    };

    const inputCls =
        "w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-accent)/40";

    return (
        <div className="max-w-2xl space-y-8">
            <h2 className="text-2xl font-bold text-(--color-foreground)">
                About 편집
            </h2>

            {/* 프로필 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    프로필
                </h3>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        프로필 이미지 URL
                    </label>
                    <input
                        type="text"
                        value={profileImage}
                        onChange={(e) => setProfileImage(e.target.value)}
                        placeholder="https://urqqfjxocxfrvuozgobi.supabase.co/storage/v1/object/public/images/legacy/profile-780d2697.webp"
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        이름
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="정호진"
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 소개 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    소개
                </h3>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        메인 소개
                    </label>
                    <textarea
                        ref={descriptionRef}
                        rows={3}
                        className={`${inputCls} resize-y`}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        보조 소개
                    </label>
                    <textarea
                        ref={descriptionSubRef}
                        rows={2}
                        className={`${inputCls} resize-y`}
                    />
                </div>
            </section>

            {/* 연락처 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    연락처
                </h3>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        Email
                    </label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        GitHub URL
                    </label>
                    <input
                        type="text"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-base font-medium text-(--color-muted)">
                        LinkedIn URL
                    </label>
                    <input
                        type="text"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className={inputCls}
                    />
                </div>
            </section>

            {/* 경험 유형별 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    경험 유형별 리스트
                </h3>
                <p className="text-sm text-(--color-muted)">
                    한 줄 = 한 항목. 비워두면 표시 안 됨.
                </p>
                {ABOUT_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                sectionRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={SECTION_PLACEHOLDERS[key]}
                            className={`${inputCls} min-h-[80px] resize-y`}
                        />
                    </div>
                ))}
            </section>

            {/* 역량 키워드별 */}
            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-(--color-foreground)">
                    역량 키워드별 리스트
                </h3>
                {COMPETENCY_SECTION_KEYS.map((key) => (
                    <div key={key}>
                        <label className="mb-1 block text-base font-medium text-(--color-muted)">
                            {key}
                        </label>
                        <textarea
                            ref={(el) => {
                                competencyRefs.current[key] = el;
                            }}
                            rows={4}
                            placeholder={COMPETENCY_PLACEHOLDERS[key]}
                            className={`${inputCls} min-h-[80px] resize-y`}
                        />
                    </div>
                ))}
            </section>

            {/* 피드백 + 저장 */}
            {status && (
                <p
                    className={`rounded-lg px-3 py-2 text-base ${status.type === "error" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30"}`}
                >
                    {status.msg}
                </p>
            )}
            <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-(--color-accent) px-6 py-2.5 text-base font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {saving ? "저장 중..." : "Supabase에 저장"}
            </button>
        </div>
    );
}
