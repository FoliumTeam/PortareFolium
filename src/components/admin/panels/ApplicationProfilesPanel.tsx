"use client";
import {
    LocalizedText,
    LocalizedElement,
    LocalizedRichText,
} from "@/components/LocalizedText";

import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    createApplicationProfile as raw_createApplicationProfile,
    getApplicationProfilesBootstrap as raw_getApplicationProfilesBootstrap,
    publishApplicationProfile as raw_publishApplicationProfile,
    revokeApplicationProfile as raw_revokeApplicationProfile,
    issueApplicationProfileDraftToken as raw_issueApplicationProfileDraftToken,
    saveApplicationProfile as raw_saveApplicationProfile,
    updateApplicationProfileFromParent as raw_updateApplicationProfileFromParent,
} from "@/app/admin/actions/application-profiles";
import {
    EMPTY_APPLICATION_PROFILE_OVERRIDES,
    type ApplicationProfile,
    type ApplicationProfileOverrides,
} from "@/types/application-profile";
import JobFieldManager, {
    type JobFieldItem,
} from "@/components/admin/panels/JobFieldManager";
import { bindContentAction } from "@/lib/admin-content-state";
const createApplicationProfile = bindContentAction(
    raw_createApplicationProfile
);
const getApplicationProfilesBootstrap = bindContentAction(
    raw_getApplicationProfilesBootstrap
);
const publishApplicationProfile = bindContentAction(
    raw_publishApplicationProfile
);
const revokeApplicationProfile = bindContentAction(
    raw_revokeApplicationProfile
);
const issueApplicationProfileDraftToken = bindContentAction(
    raw_issueApplicationProfileDraftToken
);
const saveApplicationProfile = bindContentAction(raw_saveApplicationProfile);
const updateApplicationProfileFromParent = bindContentAction(
    raw_updateApplicationProfileFromParent
);

type ProfileWithStatus = ApplicationProfile & {
    needsUpdate: boolean;
    publicUrl: string;
};

const parseList = (value: string): string[] =>
    Array.from(
        new Set(
            value
                .split(/[,\n]/)
                .map((item) => item.trim())
                .filter(Boolean)
        )
    );

const formatList = (value: string[]) => value.join(", ");

export default function ApplicationProfilesPanel() {
    const [profiles, setProfiles] = useState<ProfileWithStatus[]>([]);
    const [jobFields, setJobFields] = useState<JobFieldItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [parentJobField, setParentJobField] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [overrides, setOverrides] = useState<ApplicationProfileOverrides>(
        EMPTY_APPLICATION_PROFILE_OVERRIDES
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draftToken, setDraftToken] = useState<string | null>(null);

    const selected = useMemo(
        () => profiles.find((profile) => profile.id === selectedId) ?? null,
        [profiles, selectedId]
    );

    useUnsavedWarning(
        selected
            ? name !== selected.name ||
                  parentJobField !== selected.parent_job_field ||
                  jobDescription !== selected.job_description ||
                  JSON.stringify(overrides) !==
                      JSON.stringify(selected.overrides)
            : Boolean(
                  name ||
                  jobDescription ||
                  JSON.stringify(overrides) !==
                      JSON.stringify(EMPTY_APPLICATION_PROFILE_OVERRIDES)
              )
    );

    const load = async () => {
        setLoading(true);
        const data = await getApplicationProfilesBootstrap();
        setProfiles(data.profiles);
        setJobFields(data.jobFields);
        setParentJobField((current) => current || data.jobFields[0]?.id || "");
        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, []);

    const selectProfile = (profile: ProfileWithStatus | null) => {
        setSelectedId(profile?.id ?? null);
        setName(profile?.name ?? "");
        setParentJobField(profile?.parent_job_field ?? jobFields[0]?.id ?? "");
        setJobDescription(profile?.job_description ?? "");
        setOverrides(profile?.overrides ?? EMPTY_APPLICATION_PROFILE_OVERRIDES);
    };

    const persist = async () => {
        if (!name.trim() || !parentJobField) {
            toast.error(<LocalizedText text={"이름과 부모 직무 분야 필요"} />);
            return;
        }
        setSaving(true);
        const result = selected
            ? await saveApplicationProfile({
                  id: selected.id,
                  expectedVersion: selected.version,
                  name,
                  parentJobField,
                  jobDescription,
                  overrides,
              })
            : await createApplicationProfile({
                  name,
                  parentJobField,
                  jobDescription,
                  overrides,
              });
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        toast.success(
            <LocalizedText
                text={
                    selected ? (
                        <LocalizedText text={"지원 프로필 저장"} />
                    ) : (
                        <LocalizedText text={"지원 프로필 생성"} />
                    )
                }
            />
        );
        await load();
        setSelectedId(result.profile.id);
    };

    const runProfileAction = async (
        action: (
            id: string,
            version: number
        ) => ReturnType<typeof publishApplicationProfile>
    ) => {
        if (!selected) return;
        setSaving(true);
        const result = await action(selected.id, selected.version);
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        toast.success(<LocalizedText text={"공개본 상태 갱신"} />);
        await load();
    };

    const issueDraftToken = async () => {
        if (!selected) return;
        setSaving(true);
        const result = await issueApplicationProfileDraftToken(selected.id);
        setSaving(false);
        if (!result.success) {
            toast.error(<LocalizedText text={result.error} />);
            return;
        }
        setDraftToken(result.token);
        toast.success(<LocalizedText text={"초안 전용 MCP 토큰 발급"} />);
    };

    if (loading)
        return (
            <p className="text-sm text-(--color-muted)">
                <LocalizedText text={"지원 프로필 조회 중"} />
            </p>
        );

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            <JobFieldManager
                jobFields={jobFields}
                onChanged={(nextJobFields) => {
                    setJobFields(nextJobFields);
                    void load();
                }}
            />
            <div className="flex min-h-0 flex-1 gap-5 overflow-hidden">
                <aside className="w-72 shrink-0 overflow-y-auto rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-3">
                    <button
                        type="button"
                        onClick={() => selectProfile(null)}
                        className="mb-3 w-full rounded-lg bg-(--color-accent) px-3 py-2 text-sm font-bold text-(--color-on-accent)"
                    >
                        <LocalizedText text={"새 지원 프로필"} />
                    </button>
                    <div className="space-y-2">
                        {profiles.map((profile) => (
                            <button
                                type="button"
                                key={profile.id}
                                onClick={() => selectProfile(profile)}
                                className={`w-full rounded-xl border p-3 text-left ${selectedId === profile.id ? "border-(--color-accent) bg-(--color-surface)" : "border-transparent hover:bg-(--color-surface)"}`}
                            >
                                <p className="truncate font-bold text-(--color-foreground)">
                                    {profile.name}
                                </p>
                                <p className="mt-1 text-xs text-(--color-muted)">
                                    {profile.parent_job_field} ·{" "}
                                    {<LocalizedText text={profile.status} />}
                                    {profile.needsUpdate ? (
                                        <LocalizedText
                                            text={" · 업데이트 가능"}
                                        />
                                    ) : (
                                        ""
                                    )}
                                </p>
                            </button>
                        ))}
                    </div>
                </aside>
                <section className="min-w-0 flex-1 overflow-y-auto rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
                    <h1 className="text-2xl font-black text-(--color-foreground)">
                        <LocalizedText text={"지원 프로필"} />
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-(--color-muted)">
                        <LocalizedText
                            text={
                                "JD별 공개본을 부모 직무 분야에서 만들고, 이 화면의 수정사항과 공개 상태를 별도로 관리합니다."
                            }
                        />
                    </p>
                    <div className="mt-6 grid gap-5">
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"프로필 이름"} />
                            <LocalizedElement
                                as="input"
                                translatedProps={["placeholder"]}
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                maxLength={120}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                                placeholder="예: Full-stack · 디자인 중심"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"부모 직무 분야"} />
                            <select
                                value={parentJobField}
                                disabled={Boolean(selected)}
                                onChange={(event) =>
                                    setParentJobField(event.target.value)
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal disabled:opacity-60"
                            >
                                {jobFields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.emoji} {field.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"Job description"} />
                            <LocalizedElement
                                as="textarea"
                                translatedProps={["placeholder"]}
                                value={jobDescription}
                                onChange={(event) =>
                                    setJobDescription(event.target.value)
                                }
                                rows={8}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                                placeholder="외부 AI 작업에서 이 내용을 사용해 맞춤 초안 작성"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"포트폴리오 우선 순서"} />
                            <LocalizedElement
                                as="input"
                                translatedProps={["placeholder"]}
                                value={formatList(overrides.portfolioOrder)}
                                onChange={(event) =>
                                    setOverrides((current) => ({
                                        ...current,
                                        portfolioOrder: parseList(
                                            event.target.value
                                        ),
                                    }))
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                                placeholder="프로젝트 slug를 쉼표로 구분"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"제외할 포트폴리오"} />
                            <LocalizedElement
                                as="input"
                                translatedProps={["placeholder"]}
                                value={formatList(
                                    overrides.excludedPortfolioSlugs
                                )}
                                onChange={(event) =>
                                    setOverrides((current) => ({
                                        ...current,
                                        excludedPortfolioSlugs: parseList(
                                            event.target.value
                                        ),
                                    }))
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                                placeholder="프로젝트 slug를 쉼표로 구분"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"이력서 headline"} />
                            <input
                                value={overrides.headline ?? ""}
                                onChange={(event) =>
                                    setOverrides((current) => ({
                                        ...current,
                                        headline:
                                            event.target.value || undefined,
                                    }))
                                }
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            <LocalizedText text={"이력서 summary"} />
                            <textarea
                                value={overrides.summary ?? ""}
                                onChange={(event) =>
                                    setOverrides((current) => ({
                                        ...current,
                                        summary:
                                            event.target.value || undefined,
                                    }))
                                }
                                rows={4}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 font-normal"
                            />
                        </label>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void persist()}
                            disabled={saving}
                            className="rounded-lg bg-(--color-accent) px-4 py-2 font-bold text-(--color-on-accent) disabled:opacity-60"
                        >
                            {saving ? (
                                <LocalizedText text={"저장 중"} />
                            ) : (
                                <LocalizedText text={"저장"} />
                            )}
                        </button>
                        {selected?.needsUpdate && (
                            <button
                                type="button"
                                onClick={() =>
                                    void runProfileAction(
                                        updateApplicationProfileFromParent
                                    )
                                }
                                disabled={saving}
                                className="rounded-lg border border-(--color-border) px-4 py-2 font-bold"
                            >
                                <LocalizedText text={"부모 변경 적용"} />
                            </button>
                        )}
                        {selected && (
                            <button
                                type="button"
                                onClick={() =>
                                    void runProfileAction(
                                        publishApplicationProfile
                                    )
                                }
                                disabled={saving}
                                className="rounded-lg border border-(--color-border) px-4 py-2 font-bold"
                            >
                                <LocalizedText text={"공개본 확정"} />
                            </button>
                        )}
                        {selected?.status === "published" && (
                            <button
                                type="button"
                                onClick={() =>
                                    void runProfileAction(
                                        revokeApplicationProfile
                                    )
                                }
                                disabled={saving}
                                className="rounded-lg border border-red-500 px-4 py-2 font-bold text-red-600"
                            >
                                <LocalizedText text={"링크 폐기"} />
                            </button>
                        )}
                        {selected && (
                            <button
                                type="button"
                                onClick={() => void issueDraftToken()}
                                disabled={saving}
                                className="rounded-lg border border-(--color-border) px-4 py-2 font-bold"
                            >
                                <LocalizedText text={"초안 MCP 토큰 발급"} />
                            </button>
                        )}
                        {selected?.status === "published" && (
                            <a
                                href={`/${selected.public_token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-(--color-border) px-4 py-2 font-bold"
                            >
                                <LocalizedText text={"공개 미리보기"} />
                            </a>
                        )}
                    </div>
                    {selected?.status === "published" && (
                        <p className="mt-5 rounded-lg bg-(--color-surface-subtle) p-3 text-sm text-(--color-muted)">
                            <LocalizedRichText
                                text={"공유 URL: {0}"}
                                values={[selected.publicUrl]}
                            />
                        </p>
                    )}
                    {draftToken && (
                        <p className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm break-all text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                            <LocalizedRichText
                                text={"초안 MCP 토큰: {0}"}
                                values={[draftToken]}
                            />
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
